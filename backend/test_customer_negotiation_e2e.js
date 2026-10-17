import jwt from "jsonwebtoken";
import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

const request = async (method, path, body = null, headers = {}) => {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${path}`, options);
    const contentType = res.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await res.json();
    } else {
        data = await res.text();
    }
    return {
        status: res.status,
        data
    };
};

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
};

async function runNegotiationTestSuite() {
    console.log("==================================================");
    console.log("STARTING COMPLETE CUSTOMER NEGOTIATION E2E TEST");
    console.log("==================================================\n");

    const timestamp = Date.now();
    const testCustomerEmail = `neg.cust.${timestamp}@acme.com`;
    const testCustomerCode = `CUST-N-${timestamp.toString().slice(-5)}`;
    const testPassword = "CustomerPass123!";

    let adminToken = "";
    let salesRepToken = "";
    let managerToken = "";
    let financeToken = "";
    let customerToken = "";
    let customerId = null;
    let quoteCode = "";
    let quoteDbId = null;

    try {
        console.log("--- STEP 1: Staff & Admin Authentication ---");
        const adminRes = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
        assert(adminRes.status === 200, "Admin login returned 200");
        adminToken = adminRes.data.data.token;

        const repRes = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
        assert(repRes.status === 200, "Sales Rep login returned 200");
        salesRepToken = repRes.data.data.token;

        const mgrRes = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
        assert(mgrRes.status === 200, "Sales Manager login returned 200");
        managerToken = mgrRes.data.data.token;

        const finRes = await request("POST", "/auth/login", { email: "finance@dealflow360.com", password: "password123" });
        assert(finRes.status === 200, "Finance login returned 200");
        financeToken = finRes.data.data.token;

        console.log("\n--- STEP 2: Create & Activate Customer Account ---");
        const createCustRes = await request(
            "POST",
            "/customers",
            {
                customerCode: testCustomerCode,
                companyName: `Acme Negotiation Corp ${timestamp}`,
                contactName: "John Doe",
                email: testCustomerEmail,
                phone: "+1-555-0899",
                customerTierId: 1,
                currency: "USD"
            },
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(createCustRes.status === 201, "Customer created with portal account");
        customerId = createCustRes.data.data.id;
        const activationCode = createCustRes.data.data.portalAccount.activationCode;
        assert(activationCode, "Activation code generated for customer");

        const activateRes = await request("POST", "/auth/activate-customer", {
            email: testCustomerEmail,
            activationCode,
            password: testPassword,
            confirmPassword: testPassword
        });
        assert(activateRes.status === 200, "Customer account activated");

        const custLoginRes = await request("POST", "/auth/login", {
            email: testCustomerEmail,
            password: testPassword
        });
        assert(custLoginRes.status === 200, "Customer logged in normally via JWT auth");
        customerToken = custLoginRes.data.data.token;
        assert(custLoginRes.data.data.user.role === "customer", "Authenticated role is 'customer'");
        assert(custLoginRes.data.data.user.customerId === customerId, "User mapped to customerId");

        console.log("\n--- STEP 3: Sales Rep Creates Quotation ---");
        const createQuoteRes = await request(
            "POST",
            "/quotations",
            {
                customerId,
                priceListId: 1,
                paymentTerms: "Net 30",
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                items: [
                    {
                        productId: 3,
                        quantity: 5,
                        discountPercent: 0
                    }
                ]
            },
            { Authorization: `Bearer ${salesRepToken}` }
        );
        if (createQuoteRes.status !== 201) {
            console.error("Create quote error:", createQuoteRes);
        }
        assert(createQuoteRes.status === 201, "Sales Rep created quotation");
        quoteCode = createQuoteRes.data.data.quoteCode || createQuoteRes.data.data.quote_code;
        quoteDbId = createQuoteRes.data.data.dbId;
        assert(quoteCode, `Quotation code is ${quoteCode}`);

        const submitQuoteRes = await request("POST", `/quotations/${quoteCode}/submit`, null, {
            Authorization: `Bearer ${salesRepToken}`
        });
        assert(submitQuoteRes.status === 200, "Quotation submitted by Sales Rep");
        assert(submitQuoteRes.data.data.status === "Approved", "Quotation is Approved and ready for customer review");

        console.log("\n--- STEP 4: Customer Reviews Quotation ---");
        const listQuotesRes = await request("GET", "/customer/quotes", null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(listQuotesRes.status === 200, "Customer quotes list returned 200");
        const foundInList = listQuotesRes.data.data.find(q => q.quoteCode === quoteCode);
        assert(foundInList, "Created quotation is visible in Customer's My Quotations view");

        const viewQuoteRes = await request("GET", `/customer/quotes/${quoteCode}`, null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(viewQuoteRes.status === 200, "Customer opened quotation view");
        const customerQuote = viewQuoteRes.data.data;
        assert(customerQuote.products.length > 0, "Quotation line items visible to customer");
        assert(customerQuote.products[0].baseCost === undefined, "Internal baseCost is hidden from customer");
        assert(customerQuote.products[0].marginPercent === undefined, "Internal marginPercent is hidden from customer");
        assert(customerQuote.status === "Approved", "Current quotation status is 'Approved'");

        console.log("\n--- STEP 5: Choice 1 - Customer Asks Question / Requests Change ---");
        const questionRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/negotiation`,
            {
                customerComment: "Can we get shipment split into 2 batches, and delivery target by next month?",
                requestedDeliveryDate: "2026-10-15"
            },
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(questionRes.status === 200, "Question submission returned 200");
        assert(questionRes.data.data.status === "Under Negotiation", "Quotation status transitioned to 'Under Negotiation'");

        const questionLines = await pool.query(
            "SELECT * FROM quotation_negotiation_lines WHERE quotation_id = $1 ORDER BY id DESC LIMIT 1",
            [quoteDbId]
        );
        assert(questionLines.rows.length === 1, "Negotiation line logged for question");
        assert(questionLines.rows[0].product_name === "Customer Question / Change Request", "Negotiation line has Question title");
        assert(questionLines.rows[0].status === "Under Review", "Question line status is 'Under Review'");

        console.log("\n--- STEP 6: Choice 2A - Counter Discount Within Limits (Auto-Approved) ---");
        const withinLimitRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/negotiation`,
            {
                counterDiscount: 5,
                customerComment: "Proposing a 5% commercial discount for 10 units"
            },
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(withinLimitRes.status === 200, "Within-limit counter discount returned 200");
        assert(withinLimitRes.data.data.status === "Approved", "Quotation auto-approved since 5% is within limits");
        assert(withinLimitRes.data.data.reEnteredApproval === false, "reEnteredApproval is false");

        const quoteCheck1 = await pool.query("SELECT * FROM quotations WHERE id = $1", [quoteDbId]);
        assert(quoteCheck1.rows[0].status === "Approved", "Quotation DB status is 'Approved'");
        assert(Number(quoteCheck1.rows[0].total_discount) > 0, "Quotation discount amount was updated");

        console.log("\n--- STEP 7: Choice 2B - Counter Discount Exceeding Limits (Re-enters Approval) ---");
        const exceedingLimitRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/negotiation`,
            {
                counterDiscount: 20,
                customerComment: "We request a 20% enterprise volume discount for budget approval"
            },
            { Authorization: `Bearer ${customerToken}` }
        );
        if (exceedingLimitRes.status !== 200) {
            console.error("Exceeding limit response error:", exceedingLimitRes);
        }
        assert(exceedingLimitRes.status === 200, "Counter discount returned 200");
        assert(exceedingLimitRes.data.data.status === "Pending Approval", "Quotation transitioned to 'Pending Approval'");
        assert(exceedingLimitRes.data.data.reEnteredApproval === true, "reEnteredApproval is true");

        const approvalReq = await pool.query(
            "SELECT * FROM quotation_approval_requests WHERE quotation_id = $1 AND status = 'PENDING'",
            [quoteDbId]
        );
        assert(approvalReq.rows.length === 1, "Pending approval request created in quotation_approval_requests");

        const approvalSteps = await pool.query(
            "SELECT * FROM quotation_approval_steps WHERE approval_request_id = $1 ORDER BY step_order",
            [approvalReq.rows[0].id]
        );
        assert(approvalSteps.rows.length > 0, `Approval steps created (${approvalSteps.rows.length} step(s))`);
        assert(approvalSteps.rows[0].status === "PENDING", "Step 1 status is 'PENDING'");
        assert(approvalSteps.rows[0].approver_role === "Sales Manager", "Step 1 approver role is 'Sales Manager'");

        const prematureConfirmRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/confirm`,
            null,
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(prematureConfirmRes.status === 400, "Customer cannot confirm quotation while in Pending Approval (HTTP 400)");

        console.log("\n--- STEP 8: Management Approves Customer Counter-Offer ---");
        const mgrApproveRes = await request(
            "POST",
            `/approvals/${quoteCode}/approve`,
            { comment: "Approved 35% customer discount concession" },
            { Authorization: `Bearer ${managerToken}` }
        );
        assert(mgrApproveRes.status === 200, "Sales Manager approved step");

        const checkQuoteAfterMgr = await pool.query("SELECT status FROM quotations WHERE id = $1", [quoteDbId]);
        if (checkQuoteAfterMgr.rows[0].status === "Pending Approval") {
            const finApproveRes = await request(
                "POST",
                `/approvals/${quoteCode}/approve`,
                { comment: "Finance approved volume concession" },
                { Authorization: `Bearer ${financeToken}` }
            );
            assert(finApproveRes.status === 200, "Finance approved step");
        }

        const finalQuoteStatus = await pool.query("SELECT status FROM quotations WHERE id = $1", [quoteDbId]);
        assert(finalQuoteStatus.rows[0].status === "Approved", "Quotation is now 'Approved' after management review");

        console.log("\n--- STEP 9: Customer Reviews Updated Quotation & History ---");
        const customerReviewRes = await request("GET", `/customer/quotes/${quoteCode}`, null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(customerReviewRes.status === 200, "Customer retrieved updated quotation");
        assert(customerReviewRes.data.data.status === "Approved", "Customer sees Approved status");
        assert(customerReviewRes.data.data.isConfirmable === true, "isConfirmable is true");

        const historyRes = await request("GET", `/customer/quotes/${quoteCode}/history`, null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(historyRes.status === 200, "Customer retrieved negotiation history");
        assert(historyRes.data.data.negotiationLines.length >= 2, "Negotiation lines contain question and counter-discount");
        assert(historyRes.data.data.auditTrail.length > 0, "Audit trail contains management approval milestones");

        console.log("\n--- STEP 10: Choice 3 - Customer Confirms Quotation ---");
        const confirmRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/confirm`,
            null,
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(confirmRes.status === 200, "Quotation confirmation returned 200 OK");
        assert(confirmRes.data.data.status === "Confirmed", "Quotation status is now 'Confirmed'");

        const finalQuoteDb = await pool.query("SELECT status FROM quotations WHERE id = $1", [quoteDbId]);
        assert(finalQuoteDb.rows[0].status === "Confirmed", "Quotation DB status is 'Confirmed'");

        const foRes = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [quoteDbId]);
        assert(foRes.rows.length === 1, "Downstream fulfillment order created in fulfillment_orders");

        const postConfirmNegotiate = await request(
            "POST",
            `/customer/quotes/${quoteCode}/negotiation`,
            { counterDiscount: 10 },
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(postConfirmNegotiate.status === 400, "Negotiating an already confirmed quote is rejected (HTTP 400)");

        const doubleConfirm = await request(
            "POST",
            `/customer/quotes/${quoteCode}/confirm`,
            null,
            { Authorization: `Bearer ${customerToken}` }
        );
        assert(doubleConfirm.status === 400, "Double confirmation is rejected (HTTP 400)");

        console.log("\n==================================================");
        console.log("🎉 ALL CUSTOMER NEGOTIATION WORKFLOW TESTS PASSED (100%)");
        console.log("==================================================");
    } catch (err) {
        console.error("\n💥 TEST FAILED:", err.message);
        if (err.response?.data) {
            console.error("Response data:", err.response.data);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runNegotiationTestSuite();
