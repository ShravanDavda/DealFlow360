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

async function testStep(name, fn) {
    console.log(`\n▶ [APPROVAL TEST]: ${name}`);
    await fn();
}

async function runApprovalChainSpectrum() {
    console.log("================================================================================");
    console.log("🔬 TESTING COMPREHENSIVE APPROVAL CHAIN SYSTEM ACROSS ENTIRE RISK SPECTRUM 🔬");
    console.log("================================================================================");

    // 1. Authenticate roles
    const repLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
    assert(repLogin.ok, "Sales Rep authenticated");
    const repHeader = { Authorization: `Bearer ${repLogin.data.data.token}` };

    const mgrLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
    assert(mgrLogin.ok, "Sales Manager authenticated");
    const mgrHeader = { Authorization: `Bearer ${mgrLogin.data.data.token}` };

    const finLogin = await request("POST", "/auth/login", { email: "finance@dealflow360.com", password: "password123" });
    assert(finLogin.ok, "Finance authenticated");
    const finHeader = { Authorization: `Bearer ${finLogin.data.data.token}` };

    // ============================================================================
    // TESTCASE 1: LOW RISK -> AUTO-APPROVED DIRECTLY WITHOUT STALLING
    // ============================================================================
    await testStep("LOW RISK: Within allowable discount ceilings -> Auto-Approved directly", async () => {
        // Acme Corp is Gold tier (15% ceiling). Product 1 allows 15%. Discount is 5%.
        const lowQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 5 }]
        }, repHeader);
        assert(lowQuoteRes.ok, "Created quotation with 5% discount (well within 15% ceiling)");
        const lowQuote = lowQuoteRes.data.data;

        // Submit quotation
        const submitRes = await request("POST", `/quotations/${lowQuote.id}/submit`, {}, repHeader);
        assert(submitRes.ok, "Submitted low-risk quotation");
        assert(submitRes.data.data.blendedRisk === "LOW", "Engine evaluates blended risk as LOW");
        assert(submitRes.data.data.status === "Approved", "Quotation is Auto-Approved directly (Status is 'Approved')");
        assert(submitRes.data.data.approvalStage === "Auto-Approved", "Approval stage is 'Auto-Approved'");
        console.log("  [LOW RISK VERIFIED]: 5% discount auto-approved instantly without manager friction.");
    });

    // ============================================================================
    // TESTCASE 1B: EXACT BOUNDARY LOW RISK (AT CEILING) -> AUTO-APPROVED
    // ============================================================================
    await testStep("LOW RISK BOUNDARY: Exactly at 15% ceiling -> Auto-Approved", async () => {
        const boundaryQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 15 }]
        }, repHeader);
        assert(boundaryQuoteRes.ok, "Created quotation exactly at 15% ceiling");
        const quote = boundaryQuoteRes.data.data;

        const submitRes = await request("POST", `/quotations/${quote.id}/submit`, {}, repHeader);
        assert(submitRes.ok, "Submitted boundary quotation");
        assert(submitRes.data.data.blendedRisk === "LOW", "Discount at exact ceiling evaluated as LOW risk");
        assert(submitRes.data.data.status === "Approved", "Quotation is Auto-Approved directly");
        console.log("  [LOW RISK BOUNDARY VERIFIED]: Exact 15% ceiling requires zero approval friction.");
    });

    // ============================================================================
    // TESTCASE 2: MEDIUM RISK -> SINGLE-TIER SALES MANAGER APPROVAL ONLY
    // ============================================================================
    await testStep("MEDIUM RISK: Exceeds ceiling by 3% -> Routes to Sales Manager only (Single-Tier)", async () => {
        // Gold tier 15% ceiling. Discount is 18% (3 points over ceiling, violation < 6).
        const medQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 18 }]
        }, repHeader);
        const medQuote = medQuoteRes.data.data;

        const submitRes = await request("POST", `/quotations/${medQuote.id}/submit`, {}, repHeader);
        assert(submitRes.ok, "Submitted medium-risk quotation");
        assert(submitRes.data.data.blendedRisk === "MEDIUM", "Engine evaluates blended risk as MEDIUM");
        assert(submitRes.data.data.status === "Pending" || submitRes.data.data.status === "Pending Approval", "Status is 'Pending Approval'");
        assert(submitRes.data.data.approvalStage === "Sales Manager", "Approval stage routed to 'Sales Manager'");

        // Verify approval workflow has exactly 1 step (Sales Manager)
        const approvalDetail = await request("GET", `/approvals/${medQuote.id}`, null, mgrHeader);
        assert(approvalDetail.ok, "Retrieved approval workflow detail");
        assert(approvalDetail.data.data.workflow.length === 1, "Medium risk has exactly 1 approval step");
        assert(approvalDetail.data.data.workflow[0].approverRole === "Sales Manager", "Step approver is 'Sales Manager'");

        // Sales Manager approves
        const approveRes = await request("POST", `/approvals/${medQuote.id}/approve`, {
            comment: "Approved standard 18% discount within manager delegation authority"
        }, mgrHeader);
        assert(approveRes.ok, "Sales Manager approved quotation");
        assert(approveRes.data.data.status === "Approved", "Quotation transitioned directly to 'Approved' without requiring Finance");
        console.log("  [MEDIUM RISK VERIFIED]: 18% discount routed to Sales Manager and approved in 1 step.");
    });

    // ============================================================================
    // TESTCASE 3: HIGH RISK -> MULTI-TIER CHAIN: SALES MANAGER FOLLOWED BY FINANCE
    // ============================================================================
    await testStep("HIGH RISK: 8% over ceiling -> Routes through Sales Manager then Finance (Multi-Tier)", async () => {
        // Onsite Setup Service (Product 2, Services category, ceiling 10%). Discount given: 18% (8 points over limit >= 6).
        const highQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 2, quantity: 1, discountPercent: 18 }]
        }, repHeader);
        const highQuote = highQuoteRes.data.data;

        const submitRes = await request("POST", `/quotations/${highQuote.id}/submit`, {}, repHeader);
        assert(submitRes.ok, "Submitted high-risk quotation");
        assert(submitRes.data.data.blendedRisk === "HIGH", "Engine evaluates blended risk as HIGH");
        assert(submitRes.data.data.status === "Pending" || submitRes.data.data.status === "Pending Approval", "Status is 'Pending Approval'");
        assert(submitRes.data.data.approvalStage === "Sales Manager", "Initial approval stage is 'Sales Manager'");

        // Verify multi-tier chain: Step 1 Sales Manager, Step 2 Finance
        const approvalDetail = await request("GET", `/approvals/${highQuote.id}`, null, mgrHeader);
        assert(approvalDetail.ok, "Retrieved high risk approval workflow detail");
        assert(approvalDetail.data.data.workflow.length === 2, "High risk approval chain contains exactly 2 steps");
        assert(approvalDetail.data.data.workflow[0].approverRole === "Sales Manager", "Step 1 approver is 'Sales Manager'");
        assert(approvalDetail.data.data.workflow[1].approverRole === "Finance", "Step 2 approver is 'Finance'");

        // Step 1: Sales Manager acts
        const mgrApproveRes = await request("POST", `/approvals/${highQuote.id}/approve`, {
            comment: "Sales Manager approved level 1. Escalating to Finance for high risk margin review."
        }, mgrHeader);
        assert(mgrApproveRes.ok, "Sales Manager completed Level 1 approval");
        assert(mgrApproveRes.data.data.status === "Pending" || mgrApproveRes.data.data.status === "Pending Approval", "Quotation remains 'Pending Approval' for Level 2");
        assert(mgrApproveRes.data.data.approvalStage === "Finance", "Approval stage advanced to 'Finance'");

        // Step 2: Finance acts
        const finApproveRes = await request("POST", `/approvals/${highQuote.id}/approve`, {
            comment: "Finance Director verified blended deal profitability and approved level 2."
        }, finHeader);
        assert(finApproveRes.ok, "Finance completed Level 2 approval");
        assert(finApproveRes.data.data.status === "Approved", "Quotation is officially 'Approved' after Finance approval");
        console.log("  [HIGH RISK VERIFIED]: Multi-tier chain executed flawlessly: Sales Manager -> Finance -> Approved.");
    });

    // ============================================================================
    // TESTCASE 4: CUMULATIVE HIGH RISK (EROSION DETECTION ACROSS MULTIPLE LINES)
    // ============================================================================
    await testStep("CUMULATIVE HIGH RISK: Multiple modest violations summing to >= 8 points -> Escalates to HIGH", async () => {
        // Multiple items with small violations:
        // Product 1 (Hardware, ceiling 15%): 18% -> 3 pts over
        // Product 2 (Services, ceiling 10%): 13% -> 3 pts over
        // Product 3 (Peripherals, ceiling 15%): 17% -> 2 pts over
        // All individual items < 6%, but totalViolationPoints = 3 + 3 + 2 = 8 pts (>= 8 -> HIGH)!
        const cumQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [
                { productId: 1, quantity: 1, discountPercent: 18 },
                { productId: 2, quantity: 1, discountPercent: 13 },
                { productId: 3, quantity: 1, discountPercent: 17 }
            ]
        }, repHeader);
        const cumQuote = cumQuoteRes.data.data;

        const submitRes = await request("POST", `/quotations/${cumQuote.id}/submit`, {}, repHeader);
        assert(submitRes.ok, "Submitted cumulative quotation");
        assert(submitRes.data.data.blendedRisk === "HIGH", "Blended engine catches cumulative margin erosion (>= 8 points) as HIGH risk");
        assert(submitRes.data.data.approvalStage === "Sales Manager", "Multi-tier approval activated at 'Sales Manager'");

        // Progress Level 1 & Level 2
        await request("POST", `/approvals/${cumQuote.id}/approve`, { comment: "Manager OK" }, mgrHeader);
        const finRes = await request("POST", `/approvals/${cumQuote.id}/approve`, { comment: "Finance OK" }, finHeader);
        assert(finRes.data.data.status === "Approved", "Cumulative high-risk deal approved through full chain");
        console.log("  [CUMULATIVE RISK VERIFIED]: 3pts + 3pts + 2pts = 8pts total erosion detected and governed.");
    });

    // ============================================================================
    // TESTCASE 5: MULTI-TIER REJECTION WORKFLOW
    // ============================================================================
    await testStep("REJECTION WORKFLOW: Finance rejects Level 2 with required audit comment -> Status 'Rejected'", async () => {
        const rejQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 2, quantity: 1, discountPercent: 22 }]
        }, repHeader);
        const rejQuote = rejQuoteRes.data.data;
        await request("POST", `/quotations/${rejQuote.id}/submit`, {}, repHeader);

        // Manager approves Level 1
        await request("POST", `/approvals/${rejQuote.id}/approve`, { comment: "Manager passes to Finance" }, mgrHeader);

        // Finance rejects Level 2
        const rejRes = await request("POST", `/approvals/${rejQuote.id}/reject`, {
            comment: "22% service discount breaches gross margin threshold. Deal terms rejected."
        }, finHeader);
        assert(rejRes.ok, "Finance successfully rejected Level 2 approval");
        assert(rejRes.data.data.status === "Rejected", "Quotation status transitioned to 'Rejected'");
        assert(rejRes.data.data.approvalStage === "Rejected", "Approval stage is 'Rejected'");
        console.log("  [REJECTION VERIFIED]: Level 2 Finance rejection correctly locked deal to 'Rejected'.");
    });

    // ============================================================================
    // TESTCASE 6: RETURN FOR REVISION & RESUBMISSION
    // ============================================================================
    await testStep("RETURN FOR REVISION: Manager returns for revision -> Rep revises -> Resubmits -> Approved", async () => {
        const retQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 25 }]
        }, repHeader);
        const retQuote = retQuoteRes.data.data;
        await request("POST", `/quotations/${retQuote.id}/submit`, {}, repHeader);

        // Manager returns for revision
        const returnRes = await request("POST", `/approvals/${retQuote.id}/return`, {
            comment: "25% is excessive. Please negotiate at 17% maximum."
        }, mgrHeader);
        assert(returnRes.ok, "Manager returned quotation for revision");
        assert(returnRes.data.data.status === "Returned", "Quotation status is 'Returned'");

        // Rep revises to 17%
        const updateRes = await request("PUT", `/quotations/${retQuote.id}`, {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 17 }]
        }, repHeader);
        assert(updateRes.ok, "Rep revised quotation discount to 17%");

        // Resubmit
        const resubmitRes = await request("POST", `/quotations/${retQuote.id}/submit`, {}, repHeader);
        assert(resubmitRes.ok, "Rep resubmitted revised quotation");
        assert(resubmitRes.data.data.status === "Pending" || resubmitRes.data.data.status === "Pending Approval", "Quotation re-entered 'Pending Approval'");

        // Manager approves revised quotation
        const approveRes = await request("POST", `/approvals/${retQuote.id}/approve`, {
            comment: "17% revised discount is within acceptable parameters."
        }, mgrHeader);
        assert(approveRes.ok, "Manager approved revised quotation");
        assert(approveRes.data.data.status === "Approved", "Revised quotation reached 'Approved'");
        console.log("  [RETURN & REVISION VERIFIED]: Full revision cycle executed seamlessly.");
    });

    // ============================================================================
    // TESTCASE 7: USER'S REPORTED CASE — HIGH RISK RATE SUBMITTED DIRECTLY
    // ============================================================================
    await testStep("USER SCENARIO: Quotation updated with high risk rate (30%) on screen is persisted and routed to approval (NOT auto-approved!)", async () => {
        // Initial quote created (starts with 0% discount)
        const quoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 0 }]
        }, repHeader);
        const quote = quoteRes.data.data;

        // User enters high risk rate (30% discount, 15 points over 15% limit -> HIGH risk) and submits directly
        const submitWithHighRiskRes = await request("POST", `/quotations/${quote.id}/submit`, {
            items: [{ productId: 1, quantity: 1, discountPercent: 30 }],
            note: "Submitted with HIGH risk rate"
        }, repHeader);

        assert(submitWithHighRiskRes.ok, "Submit with high risk items accepted by server");
        assert(submitWithHighRiskRes.data.data.blendedRisk === "HIGH", "Engine recognizes the updated 30% discount as HIGH risk");
        assert(submitWithHighRiskRes.data.data.status === "Pending" || submitWithHighRiskRes.data.data.status === "Pending Approval", "Quotation is NOT auto-approved; it is held in 'Pending Approval'");
        assert(submitWithHighRiskRes.data.data.approvalStage === "Sales Manager", "Quotation routed to 'Sales Manager' for multi-tier approval");
        console.log("  [USER SCENARIO VERIFIED]: High risk rate properly captured, persisted, and held for multi-tier approval!");
    });

    // ============================================================================
    // TESTCASE 8: SEGREGATION OF DUTIES (RBAC GOVERNANCE)
    // ============================================================================
    await testStep("RBAC GOVERNANCE: Sales Rep cannot approve their own quotation", async () => {
        const rbacQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 20 }]
        }, repHeader);
        const quote = rbacQuoteRes.data.data;
        await request("POST", `/quotations/${quote.id}/submit`, {}, repHeader);

        // Rep attempts to approve own quote
        const illegalApprove = await request("POST", `/approvals/${quote.id}/approve`, { comment: "Self-approving" }, repHeader);
        assert(!illegalApprove.ok, "System rejected self-approval by Sales Rep (HTTP error returned)");
        assert(illegalApprove.status === 403, "System enforced 403 Forbidden on self-approval");
        console.log("  [RBAC GOVERNANCE VERIFIED]: Strict separation of duties enforced.");
    });

    console.log("\n================================================================================");
    console.log(`🎉 ALL ${passed}/${total} APPROVAL SPECTRUM TESTS PASSED (100%) 🎉`);
    console.log("================================================================================");
    process.exit(0);
}

runApprovalChainSpectrum().catch((err) => {
    console.error("\n💥 APPROVAL SPECTRUM TEST SUITE FAILED:", err);
    process.exit(1);
});

