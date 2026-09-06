import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";
const TEST_CHAINS = ["Standard Manager Approval", "High Risk Manager Finance Approval"];

const request = async (method, path, body = null, token = "") => {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (body !== null) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    return { status: response.status, data };
};

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    console.log(`PASS: ${message}`);
};

const login = async (email) => {
    const result = await request("POST", "/auth/login", { email, password: "password123" });
    assert(result.status === 200, `${email} login`);
    return result.data.data.token;
};

const configureTestChains = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("UPDATE approval_chains SET is_active = FALSE");
        const chainIds = {};
        for (const [name, minRisk] of [[TEST_CHAINS[0], "MEDIUM"], [TEST_CHAINS[1], "HIGH"]]) {
            const result = await client.query(
                `INSERT INTO approval_chains (name, min_discount_percent, max_discount_percent, min_risk, is_active)
                 VALUES ($1, 0, NULL, $2, TRUE)
                 ON CONFLICT (name) DO UPDATE SET min_discount_percent = 0, max_discount_percent = NULL, min_risk = EXCLUDED.min_risk, is_active = TRUE
                 RETURNING id`,
                [name, minRisk]
            );
            chainIds[name] = result.rows[0].id;
            await client.query("DELETE FROM approval_chain_steps WHERE approval_chain_id = $1", [chainIds[name]]);
            await client.query("INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, 1, 'Sales Manager')", [chainIds[name]]);
            if (minRisk === "HIGH") {
                await client.query("INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, 2, 'Finance')", [chainIds[name]]);
            }
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getQuoteItems = async (repToken, violations) => {
    const productIds = [1, 2, 3];
    const preview = await request("POST", "/quotations/preview", {
        customerId: 1,
        priceListId: 1,
        items: productIds.map((productId) => ({ productId, quantity: 1, discountPercent: 0 }))
    }, repToken);
    assert(preview.status === 200, "Preview returns database-backed discount limits");
    return preview.data.data.items.slice(0, violations.length).map((item, index) => ({
        productId: item.productId,
        quantity: 1,
        discountPercent: Number(item.discountLimit) + violations[index]
    }));
};

const createQuote = async (repToken, items) => {
    const result = await request("POST", "/quotations", { customerId: 1, priceListId: 1, items }, repToken);
    assert(result.status === 201, "Sales Rep creates quotation");
    return result.data.data;
};

const currentApproval = async (quoteId) => {
    const result = await pool.query(
        `SELECT ar.id AS request_id, ar.status AS request_status, s.step_order, s.approver_role, s.status
         FROM quotation_approval_requests ar
         JOIN quotation_approval_steps s ON s.approval_request_id = ar.id
         WHERE ar.quotation_id = $1
         ORDER BY ar.id DESC, s.step_order`,
        [quoteId]
    );
    return result.rows;
};

const run = async () => {
    const createdQuoteIds = [];
    try {
        await configureTestChains();
        const repToken = await login("salesrep1@dealflow360.com");
        const managerToken = await login("manager@dealflow360.com");
        const financeToken = await login("finance@dealflow360.com");
        const customerToken = await login("john@acme.com");

        const lowQuote = await createQuote(repToken, await getQuoteItems(repToken, [0]));
        createdQuoteIds.push(lowQuote.dbId);
        const lowSubmit = await request("POST", `/quotations/${lowQuote.id}/submit`, {}, repToken);
        assert(lowSubmit.status === 200 && lowSubmit.data.data.status === "Approved", "LOW risk auto-approves");
        const lowRequests = await pool.query("SELECT COUNT(*)::int AS count FROM quotation_approval_requests WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')", [lowQuote.dbId]);
        assert(lowRequests.rows[0].count === 0, "LOW risk creates no active approval request");

        const mediumQuote = await createQuote(repToken, await getQuoteItems(repToken, [2]));
        createdQuoteIds.push(mediumQuote.dbId);
        const mediumSubmit = await request("POST", `/quotations/${mediumQuote.id}/submit`, {}, repToken);
        assert(mediumSubmit.status === 200 && (mediumSubmit.data.data.status === "Pending" || mediumSubmit.data.data.status === "Pending Approval"), "MEDIUM risk enters approval");
        let steps = await currentApproval(mediumQuote.dbId);
        assert(steps.length === 1 && steps[0].approver_role === "Sales Manager" && steps[0].status === "PENDING", "MEDIUM has one pending Sales Manager step");
        const mediumApprove = await request("POST", `/approvals/A-${mediumQuote.dbId}/approve`, { comment: "Approved medium risk" }, managerToken);
        assert(mediumApprove.status === 200 && mediumApprove.data.data.status === "Approved", "Manager approves MEDIUM quotation");

        const highQuote = await createQuote(repToken, await getQuoteItems(repToken, [6]));
        createdQuoteIds.push(highQuote.dbId);
        const highSubmit = await request("POST", `/quotations/${highQuote.id}/submit`, {}, repToken);
        assert(highSubmit.status === 200 && (highSubmit.data.data.status === "Pending" || highSubmit.data.data.status === "Pending Approval"), "HIGH single-line risk enters approval");
        steps = await currentApproval(highQuote.dbId);
        assert(steps.length === 2 && steps[0].status === "PENDING" && steps[1].status === "WAITING" && steps[1].approver_role === "Finance", "HIGH routes Sales Manager then Finance");
        const managerHigh = await request("POST", `/approvals/A-${highQuote.dbId}/approve`, { comment: "Manager approved high risk" }, managerToken);
        assert(managerHigh.status === 200 && (managerHigh.data.data.status === "Pending" || managerHigh.data.data.status === "Pending Approval"), "Manager approval advances HIGH to Finance");
        const managerAgain = await request("POST", `/approvals/A-${highQuote.dbId}/approve`, { comment: "Duplicate manager action" }, managerToken);
        assert(managerAgain.status === 403, "Manager cannot approve the Finance step");
        const financeHigh = await request("POST", `/approvals/A-${highQuote.dbId}/approve`, { comment: "Finance approved high risk" }, financeToken);
        assert(financeHigh.status === 200 && financeHigh.data.data.status === "Approved", "Finance completes HIGH approval");

        const cumulativeQuote = await createQuote(repToken, await getQuoteItems(repToken, [2, 3, 3]));
        createdQuoteIds.push(cumulativeQuote.dbId);
        const cumulativeSubmit = await request("POST", `/quotations/${cumulativeQuote.id}/submit`, {}, repToken);
        assert(cumulativeSubmit.status === 200 && (cumulativeSubmit.data.data.status === "Pending" || cumulativeSubmit.data.data.status === "Pending Approval"), "Cumulative violation total of 8 routes as HIGH");
        steps = await currentApproval(cumulativeQuote.dbId);
        assert(steps.length === 2 && steps[0].status === "PENDING" && steps[1].status === "WAITING", "Cumulative HIGH creates the full two-step chain");

        const creatorAction = await request("POST", `/approvals/A-${cumulativeQuote.dbId}/approve`, {}, repToken);
        assert(creatorAction.status === 403, "Quotation creator cannot approve own quotation");
        const customerApprovalQueue = await request("GET", "/approvals", null, customerToken);
        assert(customerApprovalQueue.status === 403, "Customer cannot access internal approval APIs");

        const activeRequestCount = await pool.query("SELECT COUNT(*)::int AS count FROM quotation_approval_requests WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')", [cumulativeQuote.dbId]);
        assert(activeRequestCount.rows[0].count === 1, "Each quotation has at most one active approval request");
        console.log("Approval workflow E2E passed.");
    } finally {
        if (createdQuoteIds.length) await pool.query("DELETE FROM quotations WHERE id = ANY($1::int[])", [createdQuoteIds]);
        await pool.end();
    }
};

run().catch((error) => {
    console.error(`Approval workflow E2E failed: ${error.message}`);
    process.exit(1);
});
