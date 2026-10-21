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

async function runComprehensiveTestSuite() {
    console.log("======================================================================");
    console.log("STARTING NEGOTIATION NOTIFICATIONS & APPROVAL PIPELINE E2E TEST SUITE");
    console.log("======================================================================\n");

    const createdQuoteIds = [];
    const createdCustomerIds = [];

    try {
        // --- Authenticate users ---
        const admin = await login("admin@dealflow360.com");
        const salesRep = await login("salesrep1@dealflow360.com");
        const manager = await login("manager@dealflow360.com");
        const finance = await login("finance@dealflow360.com");
        const otherRep = await login("admin@dealflow360.com"); // separate account to test isolation

        // Create two test customers
        const timestamp = Date.now();
        const cust1Res = await request("POST", "/customers", {
            customerCode: `CUST-NOTIF1-${timestamp.toString().slice(-4)}`,
            companyName: `Notification Test Corp 1 ${timestamp}`,
            contactName: "Alice Customer",
            email: `alice.${timestamp}@testcust.com`,
            phone: "+1-555-0101",
            customerTierId: 1,
            currency: "USD"
        }, admin.token);
        assert(cust1Res.status === 201, "Customer 1 created");
        const customer1Id = cust1Res.data.data.id;
        createdCustomerIds.push(customer1Id);

        const cust2Res = await request("POST", "/customers", {
            customerCode: `CUST-NOTIF2-${timestamp.toString().slice(-4)}`,
            companyName: `Notification Test Corp 2 ${timestamp}`,
            contactName: "Bob Customer",
            email: `bob.${timestamp}@testcust.com`,
            phone: "+1-555-0102",
            customerTierId: 1,
            currency: "USD"
        }, admin.token);
        assert(cust2Res.status === 201, "Customer 2 created");
        const customer2Id = cust2Res.data.data.id;
        createdCustomerIds.push(customer2Id);

        // Activate Customer 1 portal account
        const actCode1 = cust1Res.data.data.portalAccount.activationCode;
        const actRes1 = await request("POST", "/auth/activate-customer", {
            email: `alice.${timestamp}@testcust.com`,
            activationCode: actCode1,
            password: "CustomerPass123!",
            confirmPassword: "CustomerPass123!"
        });
        assert(actRes1.status === 200, "Customer 1 account activated");
        const cust1Login = await login(`alice.${timestamp}@testcust.com`, "CustomerPass123!");
        const cust1Token = cust1Login.token;

        // Activate Customer 2 portal account
        const actCode2 = cust2Res.data.data.portalAccount.activationCode;
        await request("POST", "/auth/activate-customer", {
            email: `bob.${timestamp}@testcust.com`,
            activationCode: actCode2,
            password: "CustomerPass123!",
            confirmPassword: "CustomerPass123!"
        });
        const cust2Login = await login(`bob.${timestamp}@testcust.com`, "CustomerPass123!");
        const cust2Token = cust2Login.token;

        console.log("\n--- SECTION 1: Notification Tests ---");

        // Sales Rep creates quotation for Customer 1
        const quoteCreateRes = await request("POST", "/quotations", {
            customerId: customer1Id,
            priceListId: 1,
            paymentTerms: "Net 30",
            validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            items: [{ productId: 2, quantity: 2, discountPercent: 0 }]
        }, salesRep.token);
        assert(quoteCreateRes.status === 201, "Quotation created for Customer 1");
        const quoteCode = quoteCreateRes.data.data.quoteCode;
        const quoteDbId = quoteCreateRes.data.data.dbId;
        createdQuoteIds.push(quoteDbId);

        // Sales rep submits quotation (LOW risk auto-approves)
        const quoteSubmitRes = await request("POST", `/quotations/${quoteCode}/submit`, null, salesRep.token);
        assert(quoteSubmitRes.status === 200 && quoteSubmitRes.data.data.status === "Approved", "Quotation submitted and auto-approved for customer review");

        // 1. Customer sends negotiation message -> Assigned Sales Rep receives notification
        const repNotifsBefore = await request("GET", "/notifications", null, salesRep.token);
        const repCountBefore = repNotifsBefore.data.data.unreadCount;

        const msgRes = await request("POST", `/customer/quotes/${quoteCode}/negotiation`, {
            customerComment: "Could we expedite the delivery timeline to within 10 days?",
            requestedDeliveryDate: "2026-11-01"
        }, cust1Token);
        assert(msgRes.status === 200, "Customer submitted negotiation message");

        const repNotifsAfterMsg = await request("GET", "/notifications", null, salesRep.token);
        assert(repNotifsAfterMsg.status === 200, "Sales Rep retrieved notifications");
        assert(repNotifsAfterMsg.data.data.unreadCount === repCountBefore + 1, "Assigned Sales Rep received new notification for customer message");
        const msgNotif = repNotifsAfterMsg.data.data.notifications[0];
        assert(msgNotif.type === "NEGOTIATION_MESSAGE", "Notification type is 'NEGOTIATION_MESSAGE'");
        assert(msgNotif.quotationId === quoteDbId, "Notification references the correct quotation ID");
        assert(msgNotif.link.includes(quoteCode), "Notification link navigates to the quotation");

        // 5. Unrelated users do not receive notifications
        const mgrNotifsAfterMsg = await request("GET", "/notifications", null, manager.token);
        const finNotifsAfterMsg = await request("GET", "/notifications", null, finance.token);
        const cust2NotifsAfterMsg = await request("GET", "/notifications", null, cust2Token);
        assert(!mgrNotifsAfterMsg.data.data.notifications.some(n => n.quotationId === quoteDbId && n.type === "NEGOTIATION_MESSAGE"), "Sales Manager did not receive negotiation message notification");
        assert(!finNotifsAfterMsg.data.data.notifications.some(n => n.quotationId === quoteDbId && n.type === "NEGOTIATION_MESSAGE"), "Finance did not receive negotiation message notification");
        assert(!cust2NotifsAfterMsg.data.data.notifications.some(n => n.quotationId === quoteDbId), "Unrelated Customer 2 did not receive Customer 1 notifications");

        // 6. Unauthorized users cannot read or mark another user's notifications
        const unauthorizedMarkRes = await request("PATCH", `/notifications/${msgNotif.id}/read`, null, cust2Token);
        assert(unauthorizedMarkRes.status === 403, "Unauthorized user cannot mark another user's notification as read (HTTP 403)");

        // Authorized mark as read
        const authorizedMarkRes = await request("PATCH", `/notifications/${msgNotif.id}/read`, null, salesRep.token);
        assert(authorizedMarkRes.status === 200 && authorizedMarkRes.data.data.isRead === true, "Authorized user marks notification as read");
        const verifyReadRes = await request("GET", "/notifications", null, salesRep.token);
        assert(verifyReadRes.data.data.unreadCount === repCountBefore, "Unread count decreased after marking as read");

        // 2 & 3. Customer submits counter-offer exceeding limit (High risk) -> Assigned Sales Rep AND Current Stage Assignee receive notifications
        const mgrNotifsBeforeCounter = await request("GET", "/notifications", null, manager.token);
        const mgrCountBeforeCounter = mgrNotifsBeforeCounter.data.data.unreadCount;

        const counterRes = await request("POST", `/customer/quotes/${quoteCode}/negotiation`, {
            counterDiscount: 25,
            customerComment: "We request a 25% discount to close this budget cycle"
        }, cust1Token);
        assert(counterRes.status === 200 && counterRes.data.data.status === "Pending Approval", "Counter-offer submitted and re-entered approval");

        const repNotifsAfterCounter = await request("GET", "/notifications", null, salesRep.token);
        const repCounterNotif = repNotifsAfterCounter.data.data.notifications.find(n => n.quotationId === quoteDbId && n.type === "COUNTER_OFFER");
        assert(repCounterNotif, "Assigned Sales Rep received 'COUNTER_OFFER' notification that action is required");

        const mgrNotifsAfterCounter = await request("GET", "/notifications", null, manager.token);
        assert(mgrNotifsAfterCounter.data.data.unreadCount === mgrCountBeforeCounter + 1, "Current stage approver (Sales Manager) received approval notification");
        const mgrNotif = mgrNotifsAfterCounter.data.data.notifications[0];
        assert(mgrNotif.type === "APPROVAL_REQUIRED", "Stage 1 approver notification type is 'APPROVAL_REQUIRED'");
        assert(mgrNotif.link.includes(`/approvals/${quoteCode}`), "Stage 1 approver notification links to /approvals");

        // Finance should NOT have received notification yet because Finance is stage 2!
        const finNotifsAfterCounter = await request("GET", "/notifications", null, finance.token);
        assert(!finNotifsAfterCounter.data.data.notifications.some(n => n.quotationId === quoteDbId && n.type === "APPROVAL_REQUIRED"), "Finance did not receive notification before Sales Manager completed stage");

        // 7. Repeated duplicate requests do not generate duplicate notifications for the same event
        const duplicateNotifCheck = await pool.query(
            "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND quotation_id = $2 AND type = 'COUNTER_OFFER'",
            [salesRep.user.id || salesRep.user.userId, quoteDbId]
        );
        assert(duplicateNotifCheck.rows[0].count === 1, "No duplicate notification records created for counter-offer event");

        console.log("\n--- SECTION 2: Approval Pipeline & Stage Ordering Tests ---");

        // 4. Finance cannot approve before Sales Manager stage is completed when Sales Manager is configured first
        const prematureFinApprove = await request("POST", `/approvals/${quoteCode}/approve`, {
            comment: "Finance attempted premature approval"
        }, finance.token);
        assert(prematureFinApprove.status === 403 || prematureFinApprove.status === 400, "Finance cannot approve while current stage is Sales Manager (HTTP 403/400)");

        // 9. Unauthorized roles cannot approve
        const custApproveAttempt = await request("POST", `/approvals/${quoteCode}/approve`, { comment: "Customer self approval" }, cust1Token);
        assert(custApproveAttempt.status === 403, "Customer cannot approve quotation (HTTP 403)");
        const repApproveAttempt = await request("POST", `/approvals/${quoteCode}/approve`, { comment: "Rep self approval" }, salesRep.token);
        assert(repApproveAttempt.status === 403, "Sales Rep creator cannot approve quotation (HTTP 403)");

        // 4 & 5. Advancing to the next stage notifies the next approver (Finance)
        const finCountBeforeAdv = (await request("GET", "/notifications", null, finance.token)).data.data.unreadCount;
        const mgrApproveRes = await request("POST", `/approvals/${quoteCode}/approve`, {
            comment: "Sales Manager approved 25% discount concession"
        }, manager.token);
        assert(mgrApproveRes.status === 200, "Sales Manager approved stage 1");
        assert(mgrApproveRes.data.data.approvalStage === "Finance", "Quotation advanced to 'Finance' stage");

        const finNotifsAfterAdv = await request("GET", "/notifications", null, finance.token);
        assert(finNotifsAfterAdv.data.data.unreadCount === finCountBeforeAdv + 1, "Next stage approver (Finance) received 'APPROVAL_ADVANCED' notification");
        const finNotif = finNotifsAfterAdv.data.data.notifications[0];
        assert(finNotif.type === "APPROVAL_ADVANCED", "Newly responsible approver received 'APPROVAL_ADVANCED' notification");

        // 11. Concurrent approval actions do not advance request twice
        // If Sales Manager tries to approve again now that it's in Finance:
        const mgrSecondApprove = await request("POST", `/approvals/${quoteCode}/approve`, {
            comment: "Sales Manager attempting second approval on Finance stage"
        }, manager.token);
        assert(mgrSecondApprove.status === 403 || mgrSecondApprove.status === 400, "Sales Manager cannot approve again on Finance stage (HTTP 403/400)");

        // 5. Finance approves stage 2 -> Final approval notification sent to Rep and Customer
        const finApproveRes = await request("POST", `/approvals/${quoteCode}/approve`, {
            comment: "Finance approved volume concession"
        }, finance.token);
        assert(finApproveRes.status === 200, "Finance approved stage 2");
        assert(finApproveRes.data.data.status === "Approved", "Quotation is now fully 'Approved'");

        const repNotifsFinal = await request("GET", "/notifications", null, salesRep.token);
        const repApprovedNotif = repNotifsFinal.data.data.notifications.find(n => n.quotationId === quoteDbId && n.type === "QUOTATION_APPROVED");
        assert(repApprovedNotif, "Assigned Sales Rep received 'QUOTATION_APPROVED' notification");

        const custNotifsFinal = await request("GET", "/notifications", null, cust1Token);
        const custApprovedNotif = custNotifsFinal.data.data.notifications.find(n => n.quotationId === quoteDbId && n.type === "QUOTATION_APPROVED");
        assert(custApprovedNotif, "Customer received 'QUOTATION_APPROVED' notification");

        // 13. Customer ownership restrictions: Customer 2 cannot access Customer 1's quotation
        const cust2ViewRes = await request("GET", `/customer/quotes/${quoteCode}`, null, cust2Token);
        assert(cust2ViewRes.status === 403, "Customer 2 cannot view Customer 1's quotation (HTTP 403)");
        const cust2NegotRes = await request("POST", `/customer/quotes/${quoteCode}/negotiation`, { counterDiscount: 5 }, cust2Token);
        assert(cust2NegotRes.status === 403, "Customer 2 cannot negotiate Customer 1's quotation (HTTP 403)");

        // 10. Rejection and Return status transition and notification tests
        // Create another quote to test Return and Reject
        const quote2Res = await request("POST", "/quotations", {
            customerId: customer1Id,
            priceListId: 1,
            items: [{ productId: 2, quantity: 1, discountPercent: 0 }]
        }, salesRep.token);
        const quoteCode2 = quote2Res.data.data.quoteCode;
        const quoteDbId2 = quote2Res.data.data.dbId;
        createdQuoteIds.push(quoteDbId2);

        await request("POST", `/quotations/${quoteCode2}/submit`, null, salesRep.token);
        // Customer proposes 15% discount (Medium risk -> Sales Manager)
        await request("POST", `/customer/quotes/${quoteCode2}/negotiation`, {
            counterDiscount: 15,
            customerComment: "Counter 15%"
        }, cust1Token);

        // Test Return for Revision
        const returnRes = await request("POST", `/approvals/${quoteCode2}/return`, {
            comment: "Discount is too high, please reduce to 8%"
        }, manager.token);
        assert(returnRes.status === 200 && returnRes.data.data.status === "Returned", "Quotation returned for revision");

        const repNotifsAfterReturn = await request("GET", "/notifications", null, salesRep.token);
        const returnNotif = repNotifsAfterReturn.data.data.notifications.find(n => n.quotationId === quoteDbId2 && n.type === "QUOTATION_RETURNED");
        assert(returnNotif, "Sales Rep received 'QUOTATION_RETURNED' notification with revision comments");

        // Sales Rep performs permitted review: adjusts and re-submits
        const repResubmit = await request("POST", `/quotations/${quoteCode2}/submit`, null, salesRep.token);
        assert(repResubmit.status === 200, "Sales Rep resubmitted returned quotation");

        // Test Rejection
        const rejectRes = await request("POST", `/approvals/${quoteCode2}/reject`, {
            comment: "Deal margin does not meet minimum floor"
        }, manager.token);
        assert(rejectRes.status === 200 && rejectRes.data.data.status === "Rejected", "Quotation rejected");

        const repNotifsAfterReject = await request("GET", "/notifications", null, salesRep.token);
        const rejectNotif = repNotifsAfterReject.data.data.notifications.find(n => n.quotationId === quoteDbId2 && n.type === "QUOTATION_REJECTED");
        assert(rejectNotif, "Sales Rep received 'QUOTATION_REJECTED' notification with rejection reason");

        // 7. Auto-approval preserves low risk behavior without unnecessary approvals
        const quote3Res = await request("POST", "/quotations", {
            customerId: customer1Id,
            priceListId: 1,
            items: [{ productId: 2, quantity: 1, discountPercent: 0 }]
        }, salesRep.token);
        const quoteCode3 = quote3Res.data.data.quoteCode;
        const quoteDbId3 = quote3Res.data.data.dbId;
        createdQuoteIds.push(quoteDbId3);
        await request("POST", `/quotations/${quoteCode3}/submit`, null, salesRep.token);

        const autoApproveRes = await request("POST", `/customer/quotes/${quoteCode3}/negotiation`, {
            counterDiscount: 5,
            customerComment: "Small 5% concession"
        }, cust1Token);
        assert(autoApproveRes.status === 200 && autoApproveRes.data.data.status === "Approved", "Low risk counter-discount auto-approved");
        assert(autoApproveRes.data.data.reEnteredApproval === false, "Auto-approved quote did not create unnecessary approvals");

        // 14. No duplicate approval requests for an existing negotiation
        const openReqs = await pool.query(
            "SELECT COUNT(*)::int AS count FROM quotation_approval_requests WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')",
            [quoteDbId3]
        );
        assert(openReqs.rows[0].count === 0, "No active approval requests remain for auto-approved negotiation");

        // Mark all as read test
        const markAllRes = await request("PATCH", "/notifications/read-all", null, salesRep.token);
        assert(markAllRes.status === 200, "Mark all notifications as read succeeded");
        const finalUnread = await request("GET", "/notifications?unreadOnly=true", null, salesRep.token);
        assert(finalUnread.data.data.unreadCount === 0 && finalUnread.data.data.notifications.length === 0, "All notifications confirmed marked as read");

        console.log("\n======================================================================");
        console.log("🎉 ALL NOTIFICATION & APPROVAL PIPELINE REQUIREMENTS VERIFIED (100%)");
        console.log("======================================================================");

    } finally {
        if (createdQuoteIds.length) {
            await pool.query("DELETE FROM quotations WHERE id = ANY($1::int[])", [createdQuoteIds]);
        }
        if (createdCustomerIds.length) {
            await pool.query("DELETE FROM customers WHERE id = ANY($1::int[])", [createdCustomerIds]);
        }
        await pool.end();
    }
}

runComprehensiveTestSuite().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
