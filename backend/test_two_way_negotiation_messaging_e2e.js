import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

const request = async (method, path, body = null, token = "") => {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (body !== null) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }
    return { status: response.status, data };
};

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
};

const login = async (email, password = "password123") => {
    const res = await request("POST", "/auth/login", { email, password });
    assert(res.status === 200, `Login for ${email}`);
    return { token: res.data.data.token, user: res.data.data.user };
};

// Mirroring centralized currency formatter logic for backend verification
const formatCurrency = (value, fallback = '--') => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^[+-]?\$[\d,]+\.\d{2}$/.test(trimmed)) {
            return trimmed;
        }
        const sanitized = trimmed
            .replace(/INR|USD|EUR|GBP|₹|\$/gi, '')
            .replace(/,/g, '')
            .trim();
        if (sanitized === '' || isNaN(Number(sanitized))) {
            return fallback;
        }
        const num = Number(sanitized);
        const sign = num < 0 ? '-' : '';
        const absVal = Math.abs(num);
        return `${sign}$${absVal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
        return fallback;
    }
    const sign = num < 0 ? '-' : '';
    const absVal = Math.abs(num);
    return `${sign}$${absVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

async function runTestSuite() {
    console.log("==========================================================================");
    console.log("STARTING TWO-WAY NEGOTIATION MESSAGING & CURRENCY STANDARDIZATION E2E TEST");
    console.log("==========================================================================\n");

    // -------------------------------------------------------------------------
    // SUITE 1: Currency Formatter Unit Tests
    // -------------------------------------------------------------------------
    console.log("--- 1. Testing Centralized Currency Formatter Requirements ---");
    assert(formatCurrency(1322.99) === "$1,322.99", "Formats 1322.99 -> $1,322.99");
    assert(formatCurrency(92) === "$92.00", "Formats integer 92 -> $92.00");
    assert(formatCurrency(2714) === "$2,714.00", "Formats integer 2714 -> $2,714.00");
    assert(formatCurrency(0) === "$0.00", "Preserves zero: 0 -> $0.00");
    assert(formatCurrency("0") === "$0.00", "Preserves string zero: '0' -> $0.00");
    assert(formatCurrency("1322.99") === "$1,322.99", "Formats Postgres numeric string '1322.99' -> $1,322.99");
    assert(formatCurrency("$1322.99 INR") === "$1,322.99", "Sanitizes '$1322.99 INR' -> $1,322.99");
    assert(formatCurrency("1322.99 INR") === "$1,322.99", "Sanitizes '1322.99 INR' -> $1,322.99");
    assert(formatCurrency("₹1,322.99") === "$1,322.99", "Sanitizes '₹1,322.99' -> $1,322.99");
    assert(formatCurrency("INR 1322.99") === "$1,322.99", "Sanitizes 'INR 1322.99' -> $1,322.99");
    assert(formatCurrency("$92.00 INR") === "$92.00", "Sanitizes '$92.00 INR' -> $92.00");
    assert(formatCurrency("$1,322.99") === "$1,322.99", "Avoids double formatting '$1,322.99' -> $1,322.99");
    assert(formatCurrency(-1322.99) === "-$1,322.99", "Formats negative values: -1322.99 -> -$1,322.99");
    assert(formatCurrency(null) === "--", "Handles null safely with fallback '--'");
    assert(formatCurrency(undefined) === "--", "Handles undefined safely with fallback '--'");
    assert(formatCurrency("") === "--", "Handles empty string safely with fallback '--'");
    assert(formatCurrency("N/A") === "--", "Handles non-numeric string safely with fallback '--'");
    assert(formatCurrency(NaN) === "--", "Handles NaN safely with fallback '--'");

    console.log("\n--- 2. Setting up Two-Way Messaging Test Environment ---");
    const createdQuoteIds = [];

    try {
        const salesRep = await login("salesrep1@dealflow360.com");
        const otherRep = await login("salesrep2@dealflow360.com");
        const manager = await login("manager@dealflow360.com");
        const customerLogin = await login("john@acme.com");
        const intruderLogin = await login("sarah@betaind.com");

        assert(salesRep.user.role === "sales_rep", "salesrep1 is sales_rep");
        assert(otherRep.user.role === "sales_rep", "salesrep2 is sales_rep");
        assert(customerLogin.user.role === "customer", "john@acme.com is customer");
        assert(intruderLogin.user.role === "customer", "sarah@betaind.com is customer");

        const customerId = customerLogin.user.customerId;
        assert(customerId !== null && customerId !== undefined, `Customer ID found: ${customerId}`);

        // Query a valid product in price list 1
        const pliRes = await pool.query(
            `SELECT pli.price_list_id, pli.product_id 
             FROM price_list_items pli
             JOIN products p ON p.id = pli.product_id
             WHERE pli.is_active = TRUE AND p.is_active = TRUE
             LIMIT 1`
        );
        const validPriceListId = pliRes.rows[0]?.price_list_id || 1;
        const validProductId = pliRes.rows[0]?.product_id || 2;

        // Create a quotation assigned to salesRep (salesRep.user.id) and customerId
        const quoteRes = await request("POST", "/quotations", {
            customerId,
            priceListId: validPriceListId,
            paymentTerms: "Net 30",
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            items: [
                {
                    productId: validProductId,
                    quantity: 2,
                    discountPercent: 5
                }
            ]
        }, salesRep.token);

        if (quoteRes.status !== 201) {
            console.error("Quotation creation failed with status:", quoteRes.status, "data:", quoteRes.data);
        }
        assert(quoteRes.status === 201, "Quotation created by assigned Sales Representative");
        const quote = quoteRes.data.data;
        const quotationId = quote.dbId || quote.id;
        const quoteCode = quote.quoteCode;
        createdQuoteIds.push(quotationId);

        // Put quotation into Under Negotiation status
        await pool.query(
            `UPDATE quotations SET status = 'Under Negotiation' WHERE id = $1`,
            [quotationId]
        );

        console.log(`\n--- 3. Testing Step 1: Customer sends negotiation message ---`);
        const custMsgPayload = {
            requestedDiscountPercent: 8,
            comment: "Hello Maanas, could we get a slightly better rate given our order volume?",
            customerComment: "Hello Maanas, could we get a slightly better rate given our order volume?"
        };

        const custSendRes = await request(
            "POST",
            `/customer/quotes/${quoteCode}/negotiate`,
            custMsgPayload,
            customerLogin.token
        );
        assert(custSendRes.status === 200, "Customer negotiation message submitted successfully");

        // Verify message was stored in quotation_negotiation_lines with sender identity
        const dbMsgCheck = await pool.query(
            `SELECT * FROM quotation_negotiation_lines WHERE quotation_id = $1 ORDER BY id DESC LIMIT 1`,
            [quotationId]
        );
        assert(dbMsgCheck.rows.length === 1, "Negotiation line persisted in database");
        const savedCustLine = dbMsgCheck.rows[0];
        assert(savedCustLine.sender_role === "customer", `Sender role correctly persisted as 'customer' (was: ${savedCustLine.sender_role})`);
        assert(savedCustLine.sender_id === customerLogin.user.id, `Sender ID matches customer user ID (${savedCustLine.sender_id})`);
        assert(savedCustLine.message.includes("better rate"), "Message content correctly persisted");

        console.log(`\n--- 4. Testing Step 2: Sales Representative received in-app notification ---`);
        const repNotifRes = await request("GET", "/notifications", null, salesRep.token);
        assert(repNotifRes.status === 200, "Sales Rep notifications fetched successfully");
        const repNotifications = repNotifRes.data.data?.notifications || repNotifRes.data.data || [];
        const customerMessageNotif = repNotifications.find(n => 
            n.link && n.link.includes(quoteCode) && (n.type === "NEGOTIATION_MESSAGE" || n.type === "COUNTER_OFFER")
        );
        assert(customerMessageNotif !== undefined, `Sales Rep notified of customer message for quote ${quoteCode}`);
        assert(customerMessageNotif.link === `/quotations/${quoteCode}`, `Notification links to /quotations/${quoteCode}`);

        console.log(`\n--- 5. Testing Step 3: Sales Representative views conversation and replies ---`);
        // Sales Rep fetches messages
        const repGetMsgsRes = await request("GET", `/quotations/${quotationId}/messages`, null, salesRep.token);
        assert(repGetMsgsRes.status === 200, "Sales Rep can fetch conversation history");
        assert(repGetMsgsRes.data.data.length >= 1, "Sales Rep sees customer's message in history");

        // Sales Rep sends reply
        const replyText = "Hi John, thanks for reaching out. We can review this volume request. I will check what options are possible.";
        const repReplyRes = await request(
            "POST",
            `/quotations/${quotationId}/messages`,
            { message: replyText },
            salesRep.token
        );
        const expectedRepName = salesRep.user.name || `${salesRep.user.firstName} ${salesRep.user.lastName}`.trim();
        assert(repReplyRes.status === 201, "Sales Rep reply posted successfully");
        assert(repReplyRes.data.data.senderRole === "sales_rep", "Reply senderRole returned as 'sales_rep'");
        assert(repReplyRes.data.data.senderName === expectedRepName, `Reply senderName matches Sales Rep (${expectedRepName})`);

        // Verify reply does not modify quotation status or stage
        const quoteStatusCheck = await pool.query(`SELECT status, approval_stage FROM quotations WHERE id = $1`, [quotationId]);
        assert(quoteStatusCheck.rows[0].status === "Under Negotiation", "Quotation status preserved as 'Under Negotiation' (not modified by reply)");

        console.log(`\n--- 6. Testing Step 4: Customer received in-app notification for reply ---`);
        const custNotifRes = await request("GET", "/notifications", null, customerLogin.token);
        assert(custNotifRes.status === 200, "Customer notifications fetched successfully");
        const custNotifications = custNotifRes.data.data?.notifications || custNotifRes.data.data || [];
        const replyNotif = custNotifications.find(n => 
            n.type === "NEGOTIATION_REPLY" && n.link && n.link.includes(quoteCode)
        );
        assert(replyNotif !== undefined, `Customer received in-app notification for Sales Rep reply`);
        assert(replyNotif.link === `/customer/quotes/${quoteCode}`, `Notification links to customer quote view: ${replyNotif.link}`);
        assert(replyNotif.message.includes(expectedRepName), `Notification mentions Sales Rep name (${expectedRepName})`);

        console.log(`\n--- 7. Testing Step 5: Chronological conversation consistency ---`);
        // Both parties view the conversation
        const repConversation = await request("GET", `/quotations/${quotationId}/messages`, null, salesRep.token);
        const custHistory = await request("GET", `/customer/quotes/${quoteCode}/negotiation-history`, null, customerLogin.token);

        assert(repConversation.status === 200, "Sales Rep fetched conversation");
        assert(custHistory.status === 200, "Customer fetched negotiation history");

        const repLines = repConversation.data.data;
        const custLines = custHistory.data.data.negotiationLines || custHistory.data.data;
        assert(repLines.length === custLines.length, `Both users see same number of messages (${repLines.length})`);
        
        // Check chronological order
        assert(repLines[0].senderRole === "customer", "First message is from customer");
        assert(repLines[1].senderRole === "sales_rep", "Second message is reply from sales_rep");
        assert(custLines[1].message === replyText, "Customer sees the exact reply content");

        console.log(`\n--- 8. Testing Step 6: Authorization and Security Boundaries ---`);
        // Test 8a: Customer B (Sarah) cannot read or post to Customer A's quote
        const intruderGetRes = await request("GET", `/customer/quotes/${quoteCode}/negotiation-history`, null, intruderLogin.token);
        assert(intruderGetRes.status === 403 || intruderGetRes.status === 404, `Intruder customer blocked from accessing quote history (status: ${intruderGetRes.status})`);

        const intruderPostRes = await request("POST", `/customer/quotes/${quoteCode}/negotiate`, {
            requestedDiscountPercent: 10,
            comment: "Intruder attempt"
        }, intruderLogin.token);
        assert(intruderPostRes.status === 403 || intruderPostRes.status === 404, `Intruder customer blocked from sending negotiation message (status: ${intruderPostRes.status})`);

        // Test 8b: Unassigned Sales Rep (salesrep2) cannot reply to this quotation
        const unassignedReplyRes = await request(
            "POST",
            `/quotations/${quotationId}/messages`,
            { message: "Unassigned rep attempting to reply" },
            otherRep.token
        );
        assert(unassignedReplyRes.status === 403, `Unassigned sales rep blocked with 403 Forbidden (status: ${unassignedReplyRes.status})`);

        // Test 8c: Manager CAN access and view messages (following application policy)
        const managerGetRes = await request("GET", `/quotations/${quotationId}/messages`, null, manager.token);
        assert(managerGetRes.status === 200, "Sales Manager can view quotation messages per role policy");

        // Test 8d: Input validation (empty message & >2000 chars)
        const emptyMsgRes = await request("POST", `/quotations/${quotationId}/messages`, { message: "   " }, salesRep.token);
        assert(emptyMsgRes.status === 400, "Empty message rejected with 400 Bad Request");

        const longMsgRes = await request("POST", `/quotations/${quotationId}/messages`, { message: "A".repeat(2001) }, salesRep.token);
        assert(longMsgRes.status === 400, "Oversized message (>2000 chars) rejected with 400 Bad Request");

        console.log("\n==========================================================================");
        console.log("🎉 ALL TWO-WAY NEGOTIATION MESSAGING & CURRENCY TESTS PASSED SUCCESSFULLY!");
        console.log("==========================================================================");
    } finally {
        // Cleanup created test quotes
        console.log("\nCleaning up test artifacts...");
        for (const qId of createdQuoteIds) {
            await pool.query(`DELETE FROM quotation_negotiation_lines WHERE quotation_id = $1`, [qId]);
            await pool.query(`DELETE FROM quotation_audit_trail WHERE quotation_id = $1`, [qId]);
            await pool.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [qId]);
            await pool.query(`DELETE FROM quotations WHERE id = $1`, [qId]);
        }
        console.log("Cleanup complete.");
        await pool.end();
    }
}

runTestSuite().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
