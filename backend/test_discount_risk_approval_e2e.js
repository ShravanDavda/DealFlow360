import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

let passed = 0;
let total = 0;

function assert(condition, message) {
    total++;
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
    passed++;
}

async function request(method, path, body = null, headers = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
}

async function main() {
    console.log("================================================================================");
    console.log("🧪 TESTING QUOTATION DISCOUNT / RISK / APPROVAL WORKFLOW COMPLIANCE 🧪");
    console.log("================================================================================");

    // 1. Authenticate users
    const repLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
    assert(repLogin.ok, "Sales Rep authenticated");
    const repHeader = { Authorization: `Bearer ${repLogin.data.data.token}` };

    const mgrLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
    assert(mgrLogin.ok, "Sales Manager authenticated");
    const mgrHeader = { Authorization: `Bearer ${mgrLogin.data.data.token}` };

    const finLogin = await request("POST", "/auth/login", { email: "finance@dealflow360.com", password: "password123" });
    assert(finLogin.ok, "Finance authenticated");
    const finHeader = { Authorization: `Bearer ${finLogin.data.data.token}` };

    // Fetch dynamic IDs for entities
    const custRes = await pool.query("SELECT id, company_name FROM customers WHERE company_name = 'Nova Retail India'");
    const novaCustId = custRes.rows[0].id;

    const goldCustRes = await pool.query("SELECT c.id, c.company_name FROM customers c JOIN customer_tiers ct ON ct.id = c.customer_tier_id WHERE ct.name = 'Gold' LIMIT 1");
    const goldCustId = goldCustRes.rows[0].id;

    const plRes = await pool.query("SELECT id FROM price_lists WHERE name = 'Standard Price List'");
    const priceListId = plRes.rows[0].id;

    const dockProdRes = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%Docking Station%'");
    const dockProdId = dockProdRes.rows[0].id;

    const hwProdRes = await pool.query("SELECT p.id, p.name FROM products p JOIN categories c ON c.id = p.category_id WHERE c.name = 'Hardware' LIMIT 1");
    const hwProdId = hwProdRes.rows[0].id;

    console.log(`\nUsing dynamic DB IDs: Nova Retail Customer=${novaCustId}, Gold Customer=${goldCustId}, Docking Station=${dockProdId}, Hardware Product=${hwProdId}`);

    // ============================================================================
    // PRIMARY REPORTED BUG CASE: Nova Retail India (Bronze 5%), Docking Station (10% cat), 11% discount
    // Ceiling: min(5%, 10%) = 5%. Over by +6pt -> HIGH RISK. Must NOT auto-approve!
    // ============================================================================
    console.log("\n--- [PRIMARY REPORTED BUG CASE: Nova Retail India Docking Station 11% Discount] ---");
    const bugQuoteRes = await request("POST", "/quotations", {
        customerId: novaCustId,
        priceListId,
        items: [{ productId: dockProdId, quantity: 1, discountPercent: 11 }]
    }, repHeader);
    assert(bugQuoteRes.ok, "Created quotation for Nova Retail India with 11% discount on Docking Station");
    const bugQuote = bugQuoteRes.data.data;

    // Verify preview calculation
    assert(bugQuote.products[0].discountLimit === 5, "Effective line limit is 5% (stricter of Bronze 5% and Peripherals 10%)");
    assert(bugQuote.products[0].status === "OVER", "Violation correctly calculated as OVER");
    assert(bugQuote.blendedRisk === "HIGH", "Calculated blended risk is HIGH");

    // Submit quotation
    const bugSubmitRes = await request("POST", `/quotations/${bugQuote.id}/submit`, {}, repHeader);
    assert(bugSubmitRes.ok, "Submission accepted by backend");
    assert(bugSubmitRes.data.data.status === "Pending" || bugSubmitRes.data.data.status === "Pending Approval", "Quotation status is 'Pending Approval' (NOT Auto-Approved!)");
    assert(bugSubmitRes.data.data.approvalStage === "Sales Manager", "Approval stage routed to 'Sales Manager'");

    // Verify DB quotation record
    const bugDbCheck = await pool.query("SELECT status, approval_stage FROM quotations WHERE id = $1", [bugQuote.dbId]);
    assert(bugDbCheck.rows[0].status === "Pending Approval", "PostgreSQL database status is strictly 'Pending Approval'");
    assert(bugDbCheck.rows[0].approval_stage === "Sales Manager", "PostgreSQL database approval_stage is strictly 'Sales Manager'");

    // Verify approval request in DB
    const bugApprovalDetail = await request("GET", `/approvals/${bugQuote.id}`, null, mgrHeader);
    assert(bugApprovalDetail.ok, "Retrieved approval workflow detail");
    assert(bugApprovalDetail.data.data.workflow.length === 2, "High risk workflow contains 2 steps (Sales Manager -> Finance)");
    assert(bugApprovalDetail.data.data.workflow[0].approverRole === "Sales Manager", "Step 1 is Sales Manager");
    assert(bugApprovalDetail.data.data.workflow[1].approverRole === "Finance", "Step 2 is Finance");
    console.log("  [BUG FIX VERIFIED]: Nova Retail India 11% discount on Docking Station correctly routes to Sales Manager -> Finance!");

    // ============================================================================
    // TEST 1 — Safe discount: Applicable limit = 10%, Discount = 5%
    // Expected: no violation, LOW risk, Approved, no approval request
    // ============================================================================
    console.log("\n--- [TEST 1 — Safe discount (5% at 10% limit)] ---");
    const test1QuoteRes = await request("POST", "/quotations", {
        customerId: goldCustId, // Gold tier (12%), Hardware product (10%) -> limit = 10%
        priceListId,
        items: [{ productId: hwProdId, quantity: 1, discountPercent: 5 }]
    }, repHeader);
    assert(test1QuoteRes.ok, "Created quotation with 5% discount (limit 10%)");
    const test1Quote = test1QuoteRes.data.data;
    assert(test1Quote.products[0].discountLimit === 10, "Effective limit is 10%");
    assert(test1Quote.blendedRisk === "LOW", "Risk rating is LOW");

    const test1SubmitRes = await request("POST", `/quotations/${test1Quote.id}/submit`, {}, repHeader);
    assert(test1SubmitRes.ok, "Submitted safe quotation");
    assert(test1SubmitRes.data.data.status === "Approved", "Quotation is Auto-Approved directly");
    assert(test1SubmitRes.data.data.approvalStage === "Auto-Approved", "Approval stage is Auto-Approved");

    // Verify no pending approval request exists
    const test1ApprovalCheck = await pool.query("SELECT * FROM quotation_approval_requests WHERE quotation_id = $1 AND status = 'PENDING'", [test1Quote.dbId]);
    assert(test1ApprovalCheck.rows.length === 0, "No approval request created for safe quotation");

    // ============================================================================
    // TEST 2 — Medium: Applicable limit = 10%, Discount = 7%
    // Expected: MEDIUM risk according to configured policy (>5-10%), Pending Approval, Sales Manager
    // ============================================================================
    console.log("\n--- [TEST 2 — Medium discount (>5% to 10% policy)] ---");
    const test2QuoteRes = await request("POST", "/quotations", {
        customerId: goldCustId,
        priceListId,
        items: [{ productId: hwProdId, quantity: 1, discountPercent: 7 }]
    }, repHeader);
    assert(test2QuoteRes.ok, "Created quotation with 7% discount");
    const test2Quote = test2QuoteRes.data.data;
    assert(test2Quote.blendedRisk === "MEDIUM", "Risk engine classifies 7% discount (> 5% threshold) as MEDIUM risk");

    const test2SubmitRes = await request("POST", `/quotations/${test2Quote.id}/submit`, {}, repHeader);
    assert(test2SubmitRes.ok, "Submitted medium quotation");
    assert(test2SubmitRes.data.data.status === "Pending" || test2SubmitRes.data.data.status === "Pending Approval", "Quotation status is Pending Approval");
    assert(test2SubmitRes.data.data.approvalStage === "Sales Manager", "Stage is Sales Manager");

    const test2ApprovalDetail = await request("GET", `/approvals/${test2Quote.id}`, null, mgrHeader);
    assert(test2ApprovalDetail.data.data.workflow.length === 1, "Medium risk chain has exactly 1 step (Sales Manager)");

    // ============================================================================
    // TEST 3 — High: Applicable limit = 10%, Discount = 15%
    // Expected: HIGH risk, Pending Approval, Sales Manager -> Finance
    // ============================================================================
    console.log("\n--- [TEST 3 — High discount (>10% policy)] ---");
    const test3QuoteRes = await request("POST", "/quotations", {
        customerId: goldCustId,
        priceListId,
        items: [{ productId: hwProdId, quantity: 1, discountPercent: 15 }]
    }, repHeader);
    assert(test3QuoteRes.ok, "Created quotation with 15% discount");
    const test3Quote = test3QuoteRes.data.data;
    assert(test3Quote.blendedRisk === "HIGH", "Risk engine classifies 15% discount as HIGH risk");

    const test3SubmitRes = await request("POST", `/quotations/${test3Quote.id}/submit`, {}, repHeader);
    assert(test3SubmitRes.ok, "Submitted high quotation");
    assert(test3SubmitRes.data.data.status === "Pending" || test3SubmitRes.data.data.status === "Pending Approval", "Quotation status is Pending Approval");
    assert(test3SubmitRes.data.data.approvalStage === "Sales Manager", "Initial stage is Sales Manager");

    const test3ApprovalDetail = await request("GET", `/approvals/${test3Quote.id}`, null, mgrHeader);
    assert(test3ApprovalDetail.data.data.workflow.length === 2, "High risk chain has 2 steps");
    assert(test3ApprovalDetail.data.data.workflow[0].approverRole === "Sales Manager", "Step 1 is Sales Manager");
    assert(test3ApprovalDetail.data.data.workflow[1].approverRole === "Finance", "Step 2 is Finance");

    // ============================================================================
    // TEST 4 — Exact ceiling: Applicable limit = 10%, Discount = 10%
    // Expected: NOT over-limit, no ceiling violation
    // ============================================================================
    console.log("\n--- [TEST 4 — Exact ceiling (10% at 10% limit)] ---");
    const test4QuoteRes = await request("POST", "/quotations", {
        customerId: goldCustId,
        priceListId,
        items: [{ productId: hwProdId, quantity: 1, discountPercent: 10 }]
    }, repHeader);
    assert(test4QuoteRes.ok, "Created quotation exactly at 10% limit");
    const test4Quote = test4QuoteRes.data.data;
    assert(test4Quote.products[0].status === "OK", "Item status is OK (not OVER)");

    // Also test exact ceiling at 5% limit (Nova Retail Bronze 5%, discount 5%)
    const test4bQuoteRes = await request("POST", "/quotations", {
        customerId: novaCustId,
        priceListId,
        items: [{ productId: dockProdId, quantity: 1, discountPercent: 5 }]
    }, repHeader);
    assert(test4bQuoteRes.ok, "Created quotation exactly at 5% Bronze ceiling");
    const test4bQuote = test4bQuoteRes.data.data;
    assert(test4bQuote.products[0].status === "OK", "No ceiling violation at 5% ceiling (status is OK)");
    assert(test4bQuote.blendedRisk === "LOW", "Evaluated as LOW risk at 5% ceiling");
    const test4bSubmit = await request("POST", `/quotations/${test4bQuote.id}/submit`, {}, repHeader);
    assert(test4bSubmit.data.data.status === "Approved", "5% discount at 5% ceiling is Auto-Approved");

    // ============================================================================
    // TEST 5 — One point over: Applicable limit = 10%, Discount = 11%
    // Expected: violation (+1pt), risk evaluated correctly, MUST NOT auto-approve
    // ============================================================================
    console.log("\n--- [TEST 5 — One point over (11% at 10% limit)] ---");
    const test5QuoteRes = await request("POST", "/quotations", {
        customerId: goldCustId,
        priceListId,
        items: [{ productId: hwProdId, quantity: 1, discountPercent: 11 }]
    }, repHeader);
    assert(test5QuoteRes.ok, "Created quotation with 11% discount (limit 10%)");
    const test5Quote = test5QuoteRes.data.data;
    assert(test5Quote.products[0].status === "OVER", "Violation is OVER");

    const test5SubmitRes = await request("POST", `/quotations/${test5Quote.id}/submit`, {}, repHeader);
    assert(test5SubmitRes.ok, "Submitted one-point-over quotation");
    assert(test5SubmitRes.data.data.status === "Pending" || test5SubmitRes.data.data.status === "Pending Approval", "MUST NOT auto-approve (Status is 'Pending Approval')");

    // ============================================================================
    // TEST 6 — Large violation: Applicable limit = 5%, Discount = 15%
    // Expected: +10pt violation >= 6pt -> HIGH risk -> MUST NOT auto-approve -> Manager -> Finance
    // ============================================================================
    console.log("\n--- [TEST 6 — Large violation (15% at 5% limit)] ---");
    const test6QuoteRes = await request("POST", "/quotations", {
        customerId: novaCustId, // 5% ceiling
        priceListId,
        items: [{ productId: dockProdId, quantity: 1, discountPercent: 15 }]
    }, repHeader);
    assert(test6QuoteRes.ok, "Created quotation with 15% discount at 5% limit");
    const test6Quote = test6QuoteRes.data.data;
    assert(test6Quote.products[0].status === "OVER", "Violation is OVER (+10pt)");
    assert(test6Quote.blendedRisk === "HIGH", "Blended risk is HIGH");

    const test6SubmitRes = await request("POST", `/quotations/${test6Quote.id}/submit`, {}, repHeader);
    assert(test6SubmitRes.ok, "Submitted large-violation quotation");
    assert(test6SubmitRes.data.data.status === "Pending" || test6SubmitRes.data.data.status === "Pending Approval", "Quotation is Pending Approval");
    assert(test6SubmitRes.data.data.approvalStage === "Sales Manager", "Approval stage is Sales Manager");

    const test6ApprovalDetail = await request("GET", `/approvals/${test6Quote.id}`, null, mgrHeader);
    assert(test6ApprovalDetail.data.data.workflow.length === 2, "Workflow is Sales Manager then Finance");

    // Verify Manager approves Step 1 -> advances to Finance
    const test6MgrApprove = await request("POST", `/approvals/${test6Quote.id}/approve`, { comment: "Manager approved level 1" }, mgrHeader);
    assert(test6MgrApprove.data.data.status === "Pending" || test6MgrApprove.data.data.status === "Pending Approval", "Quotation remains Pending Approval after step 1");
    assert(test6MgrApprove.data.data.approvalStage === "Finance", "Approval stage advanced to Finance");

    // Verify Finance approves Step 2 -> becomes Approved
    const test6FinApprove = await request("POST", `/approvals/${test6Quote.id}/approve`, { comment: "Finance approved level 2" }, finHeader);
    assert(test6FinApprove.data.data.status === "Approved", "Quotation reached Approved after Finance approval");

    // ============================================================================
    // TEST 7 — Missing chain safety
    // Create situation where quotation requires approval, but NO matching chain exists
    // Expected: MUST NOT become Approved! Returns clear configuration/approval error
    // ============================================================================
    console.log("\n--- [TEST 7 — Missing chain safety] ---");
    // Temporarily deactivate High Risk chain
    await pool.query("UPDATE approval_chains SET is_active = FALSE WHERE min_risk = 'HIGH'");

    try {
        const test7QuoteRes = await request("POST", "/quotations", {
            customerId: novaCustId,
            priceListId,
            items: [{ productId: dockProdId, quantity: 1, discountPercent: 18 }] // 13pt over -> HIGH risk
        }, repHeader);
        const test7Quote = test7QuoteRes.data.data;
        assert(test7Quote.blendedRisk === "HIGH", "Quotation is HIGH risk");

        const test7SubmitRes = await request("POST", `/quotations/${test7Quote.id}/submit`, {}, repHeader);
        assert(!test7SubmitRes.ok, "Backend safely rejected submission when required approval chain is missing");
        assert(test7SubmitRes.status === 400, "Returned 400 Bad Request error");
        assert(test7SubmitRes.data.message.includes("No active approval chain configured"), "Error message clearly explains missing chain");

        // Verify quote in DB did NOT become Approved
        const checkQuote = await pool.query("SELECT status FROM quotations WHERE id = $1", [test7Quote.dbId]);
        assert(checkQuote.rows[0].status !== "Approved", "CRITICAL SAFETY: Quotation did NOT silently become Approved!");
        console.log("  [SAFETY VERIFIED]: Missing approval chain safely failed with descriptive 400 error and NEVER auto-approved!");
    } finally {
        // Re-activate High Risk chain
        await pool.query("UPDATE approval_chains SET is_active = TRUE WHERE min_risk = 'HIGH'");
    }

    console.log("\n================================================================================");
    console.log(`🎉 ALL ${passed}/${total} DISCOUNT/RISK/APPROVAL COMPLIANCE TESTS PASSED (100%) 🎉`);
    console.log("================================================================================");
    process.exit(0);
}

main().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
