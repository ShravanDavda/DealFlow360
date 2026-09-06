import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

const request = async (method, path, body, token) => {
    const options = { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    return { status: response.status, data: await response.json() };
};

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    console.log(`PASS: ${message}`);
};

const run = async () => {
    const login = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" }, "");
    assert(login.status === 200, "Admin login succeeds");
    const token = login.data.data.token;
    const repLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" }, "");
    const repToken = repLogin.data.data.token;
    const name = `CRUD Test Chain ${Date.now()}`;
    let chainId;
    try {
        const invalid = await request("POST", "/admin/approval-chains", { name: `${name} Operations`, minRisk: "MEDIUM", steps: [{ stepOrder: 1, approverRole: "Operations" }] }, token);
        assert(invalid.status === 400, "Operations approval step is rejected with HTTP 400");

        const created = await request("POST", "/admin/approval-chains", { name, minDiscountPercent: 0, maxDiscountPercent: null, minRisk: "MEDIUM", steps: [{ stepOrder: 1, approverRole: "Sales Manager" }] }, token);
        assert(created.status === 201 && created.data.data?.isActive === true, "Admin creates an active chain");
        chainId = created.data.data.id;
        const listed = await request("GET", "/admin/approval-chains", undefined, token);
        const listedChain = listed.data.data.find((chain) => chain.id === chainId);
        assert(listedChain?.steps?.[0]?.role === "Sales Manager" && !listedChain.steps.some((step) => step.approverRole === "Operations"), "CRUD response exposes only valid approval roles");

        const deactivated = await request("PUT", `/admin/approval-chains/${chainId}`, { isActive: false }, token);
        assert(deactivated.status === 200 && deactivated.data.data.isActive === false, "Deactivation persists as inactive");
        const inactive = await request("GET", `/admin/approval-chains/${chainId}`, undefined, token);
        assert(inactive.data.data.isActive === false, "GET confirms inactive PostgreSQL-backed state");

        const activated = await request("PUT", `/admin/approval-chains/${chainId}`, { isActive: true }, token);
        assert(activated.status === 200 && activated.data.data.isActive === true, "Activation persists as active");

        const deleted = await request("DELETE", `/admin/approval-chains/${chainId}`, undefined, token);
        assert(deleted.status === 200 && deleted.data.data.deleted === true, "Unused chain is deleted through PostgreSQL API");
        const orphanSteps = await pool.query("SELECT COUNT(*)::int AS count FROM approval_chain_steps WHERE approval_chain_id = $1", [chainId]);
        assert(orphanSteps.rows[0].count === 0, "Deleting an unused chain removes its child steps");
        const afterDelete = await request("GET", `/admin/approval-chains/${chainId}`, undefined, token);
        assert(afterDelete.status === 404, "Deleted chain is absent from GET API");

        const inactiveName = `Inactive Resolver Chain ${Date.now()}`;
        const inactiveCreated = await request("POST", "/admin/approval-chains", { name: inactiveName, minDiscountPercent: 0, maxDiscountPercent: null, minRisk: "MEDIUM", steps: [{ stepOrder: 1, approverRole: "Sales Manager" }] }, token);
        const inactiveId = inactiveCreated.data.data.id;
        await request("PUT", `/admin/approval-chains/${inactiveId}`, { isActive: false }, token);
        const preview = await request("POST", "/quotations/preview", { customerId: 1, priceListId: 1, items: [{ productId: 1, quantity: 1, discountPercent: 17 }] }, repToken);
        const quote = await request("POST", "/quotations", { customerId: 1, priceListId: 1, items: [{ productId: 1, quantity: 1, discountPercent: Number(preview.data.data.items[0].discountLimit) + 2 }] }, repToken);
        const submission = await request("POST", `/quotations/${quote.data.data.id}/submit`, {}, repToken);
        const requestRow = await pool.query("SELECT approval_chain_id FROM quotation_approval_requests WHERE quotation_id = $1 ORDER BY id DESC LIMIT 1", [quote.data.data.dbId]);
        assert(submission.status === 200 && Number(requestRow.rows[0].approval_chain_id) !== Number(inactiveId), "Inactive matching chain is ignored by the resolver");
        await pool.query("DELETE FROM quotations WHERE id = $1", [quote.data.data.dbId]);
        await request("DELETE", `/admin/approval-chains/${inactiveId}`, undefined, token);

        const chains = await request("GET", "/admin/approval-chains", undefined, token);
        const usedChain = chains.data.data.find((chain) => chain.name === "Standard Manager Approval" || chain.name === "High Risk Manager Finance Approval");
        if (usedChain) {
            const blocked = await request("DELETE", `/admin/approval-chains/${usedChain.id}`, undefined, token);
            assert(blocked.status === 409, "Historically used chain deletion is blocked with HTTP 409");
            const deactivatedUsed = await request("PUT", `/admin/approval-chains/${usedChain.id}`, { isActive: false }, token);
            assert(deactivatedUsed.status === 200 && deactivatedUsed.data.data.isActive === false, "Historically used chain can be deactivated");
            await request("PUT", `/admin/approval-chains/${usedChain.id}`, { isActive: true }, token);
        }
    } finally {
        if (chainId) await request("DELETE", `/admin/approval-chains/${chainId}`, undefined, token);
    }
    await pool.end();
    console.log("Approval-chain CRUD E2E passed.");
};

run().catch((error) => {
    console.error(`Approval-chain CRUD E2E failed: ${error.message}`);
    process.exit(1);
});
