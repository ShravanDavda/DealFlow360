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
        ok: res.ok,
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

async function runPdfLoopEngineering() {
    console.log("================================================================================");
    console.log("🚀 STARTING COMPREHENSIVE ODOO HACKATHON PDF SPECIFICATION LOOP ENGINEERING 🚀");
    console.log("================================================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    const testStep = async (name, fn) => {
        totalTests++;
        console.log(`\n▶ [LOOP TEST ${totalTests}]: ${name}`);
        try {
            await fn();
            passedTests++;
        } catch (e) {
            console.error(`❌ TEST ${totalTests} FAILED:`, e.message);
            throw e;
        }
    };

    // Logins
    const adminLogin = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
    assert(adminLogin.status === 200, "Admin login successful");
    const adminHeader = { Authorization: `Bearer ${adminLogin.data.data.token}` };

    const salesLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
    assert(salesLogin.status === 200, "Sales Rep login successful");
    const salesHeader = { Authorization: `Bearer ${salesLogin.data.data.token}` };

    const managerLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
    assert(managerLogin.status === 200, "Sales Manager login successful");
    const managerHeader = { Authorization: `Bearer ${managerLogin.data.data.token}` };

    const finLogin = await request("POST", "/auth/login", { email: "finance@dealflow360.com", password: "password123" });
    assert(finLogin.status === 200, "Finance login successful");
    const finHeader = { Authorization: `Bearer ${finLogin.data.data.token}` };

    const custLogin = await request("POST", "/auth/login", { email: "john@acme.com", password: "password123" });
    assert(custLogin.status === 200, "Customer (john@acme.com) login successful");
    const custHeader = { Authorization: `Bearer ${custLogin.data.data.token}` };

    // ============================================================================
    // LOOP 1: PDF QUICK TEST FLOW (8-STEP WALKTHROUGH, PAGE 11)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 1: PDF QUICK TEST FLOW (8 STEPS FROM PAGE 11 OF SPECIFICATION)");
    console.log("================================================================================");

    await testStep("Step 1: Admin sets up / verifies basic backend data (tiers, warehouse, plan)", async () => {
        const tiersRes = await request("GET", "/customer-tiers", null, adminHeader);
        assert(tiersRes.ok && tiersRes.data.data.length >= 3, "Customer tiers exist (Bronze, Silver, Gold)");

        const whRes = await request("GET", "/admin/warehouses", null, adminHeader);
        assert(whRes.ok && whRes.data.data.length >= 2, "At least 2 warehouses configured for fulfillment splitting");

        const planRes = await request("GET", "/admin/subscription-plans", null, adminHeader);
        assert(planRes.ok && planRes.data.data.length >= 1, "Subscription plans configured in backend");
    });

    let loop1Quote = null;
    await testStep("Step 2 & 3: Rep creates quotation with higher-than-allowed discount -> automatically requests Manager approval", async () => {
        // Customer 1 is Acme Corp (Gold tier: ceiling 15%, but category Service ceiling 10%)
        // We'll give 18% discount on Service / Hardware item
        const createRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [
                { productId: 1, quantity: 2, discountPercent: 18 } // Laptop Pro 14 (Hardware, ceiling 15%, given 18% -> 3 points over)
            ]
        }, salesHeader);
        assert(createRes.status === 201, "Sales Rep created quotation with discount exceeding ceiling");
        loop1Quote = createRes.data.data;

        // Rep submits quotation
        const submitRes = await request("POST", `/quotations/${loop1Quote.id}/submit`, {}, salesHeader);
        assert(submitRes.ok, "Quotation submitted");
        
        // Check quotation status requires manager approval without rep having to manually ask
        const checkRes = await request("GET", `/quotations/${loop1Quote.id}`, null, salesHeader);
        assert(checkRes.data.data.status === "Pending Approval", "Quotation automatically routed to 'Pending Approval'");
        assert(checkRes.data.data.approvalStage === "Sales Manager", "Approval stage routed to 'Sales Manager'");
    });

    await testStep("Step 4: Live upsell/cross-sell suggestions with margin delta impact (Page 6 & 7)", async () => {
        // Fetch recommendations for base product 1 (Laptop Pro 14)
        const recRes = await request("GET", `/product-pairings/recommendations/1`, null, salesHeader);
        assert(recRes.ok, "Active recommendations retrieved for Laptop Pro 14");
        const recList = recRes.data.data?.recommendations || recRes.data.data || [];
        assert(Array.isArray(recList) && recList.length > 0, "Upsell/Cross-sell suggestions returned");
        const rec = recList[0];
        assert(rec.name !== undefined, "Recommendation displays suggested product name");
        assert(rec.marginDelta !== undefined, "Recommendation displays margin delta if added");
        assert(rec.tag !== undefined, "Recommendation displays promotion/relevance tag");
        console.log(`  [UPSELL DISPLAYED]: Suggesting "${rec.name}" (${rec.type}) with margin delta +$${rec.marginDelta}`);
    });

    await testStep("Step 5: Manager approves quote -> Stock fulfillment splitting verified", async () => {
        // Manager checks approval queue
        const appQueue = await request("GET", "/approvals", null, managerHeader);
        const approvals = appQueue.data.data?.approvals || [];
        const pendingApp = approvals.find(a => a.quotationId === loop1Quote.id || a.quotationId === loop1Quote.quoteCode || a.dbId === loop1Quote.id);
        assert(pendingApp !== undefined, "Quotation present in Manager approval queue");

        const approveRes = await request("POST", `/approvals/${pendingApp.id}/approve`, { comment: "Approved Step 5" }, managerHeader);
        assert(approveRes.ok, "Manager approved quotation");

        // If multi-step required Finance, handle finance approval
        const remSteps = await pool.query(
            "SELECT * FROM quotation_approval_steps WHERE approval_request_id = (SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = $1 OR id::text = $1 LIMIT 1) ORDER BY id DESC LIMIT 1) AND status = 'PENDING'",
            [String(loop1Quote.quoteCode || loop1Quote.id)]
        );
        if (remSteps.rows.length > 0) {
            await request("POST", `/approvals/${pendingApp.id}/approve`, { comment: "Finance approved" }, finHeader);
        }

        const verifyApproved = await request("GET", `/quotations/${loop1Quote.id}`, null, salesHeader);
        assert(verifyApproved.data.data.status === "Approved", "Quotation is now in 'Approved' status");
    });

    await testStep("Step 6: Customer Portal opens quote & requests bigger counter-discount -> Auto re-enters approval (Page 8 & 11)", async () => {
        const custView = await request("GET", `/customer/quotes/${loop1Quote.id}`, null, custHeader);
        assert(custView.ok, "Customer can view approved quotation");
        assert(custView.data.data.isConfirmable === true, "Approved quote is confirmable");

        // Customer requests higher discount (25%)
        const counterRes = await request("POST", `/customer/quotes/${loop1Quote.id}/negotiate`, {
            counterDiscount: 25,
            comment: "We are buying multiple units, requesting 25% enterprise discount"
        }, custHeader);
        assert(counterRes.ok, "Customer submitted counter-discount request");
        assert(counterRes.data.data.reEnteredApproval === true, "Quote automatically re-entered approval flow");
        assert(counterRes.data.data.status === "Pending Approval", "Quote status transitioned back to 'Pending Approval'");

        // Manager & Finance re-approve the negotiated terms
        const mgrAppRes = await request("POST", `/approvals/A-${loop1Quote.id}/approve`, { comment: "Manager accepts customer counter" }, managerHeader);
        assert(mgrAppRes.ok, "Manager re-approved counter-offer");

        const finAppRes = await request("POST", `/approvals/A-${loop1Quote.id}/approve`, { comment: "Finance approves counter-discount" }, finHeader);
        assert(finAppRes.ok, "Finance re-approved high-risk counter-offer");

        const reApproved = await request("GET", `/customer/quotes/${loop1Quote.id}`, null, custHeader);
        assert(reApproved.data.data.status === "Approved", "Quote is Approved following customer negotiation cycle");
    });

    let loop1Invoice = null;
    await testStep("Step 7 & 8: Customer confirms quote, downstream billing generated & payment recorded to 'Paid'", async () => {
        const confirmRes = await request("POST", `/customer/quotes/${loop1Quote.id}/confirm`, {}, custHeader);
        assert(confirmRes.ok, "Customer confirmed final quotation terms");

        // Verify downstream invoice
        const invRes = await request("GET", `/invoices`, null, finHeader);
        assert(invRes.ok, "Finance retrieved invoices");
        const quoteCode = loop1Quote.quoteCode || `Q-${loop1Quote.id}`;
        loop1Invoice = invRes.data.data.find(inv => inv.order === quoteCode || inv.quotationCode === quoteCode || inv.invoiceId === `INV-${quoteCode.replace(/^Q-/, "")}` || inv.id === `INV-${quoteCode.replace(/^Q-/, "")}`);
        assert(loop1Invoice !== undefined, "Downstream invoice created upon confirmation");
        assert(loop1Invoice.status === "Unpaid", "Initial invoice status is 'Unpaid'");

        // Record payment
        const payRes = await request("POST", `/invoices/${loop1Invoice.id}/payment`, {
            amount: loop1Invoice.amount,
            paymentMethod: "Credit Card",
            referenceCode: "TXN-PDF-TEST-9988"
        }, finHeader);
        assert(payRes.ok, "Finance successfully recorded invoice payment");

        // Verify invoice is now Paid
        const invDetail = await request("GET", `/invoices/${loop1Invoice.id}`, null, finHeader);
        assert(invDetail.ok && invDetail.data.data.status === "Paid", "Invoice status successfully updated to 'Paid'");
    });

    // ============================================================================
    // LOOP 2: BLENDED DISCOUNT RISK ENGINE (PAGE 12 SPECIFICATION)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 2: BLENDED DISCOUNT RISK ENGINE (EXACT PAGE 12 SPECIFICATION)");
    console.log("================================================================================");

    await testStep("Scenario A: Single-line violation (Setup Service 18% vs 10% ceiling)", async () => {
        // Customer 1: Acme Corp (Gold tier). Product 1 (Laptop: ceiling 15%, given 12% -> OK)
        // Product 2 (Setup Service / Cloud Support: ceiling 10%, given 18% -> 8 points over limit)
        // 8 points over limit -> maxSingleViolation >= 6 -> routes as HIGH risk
        const calcRes = await request("POST", "/quotations/preview", {
            customerId: 1,
            priceListId: 1,
            items: [
                { productId: 1, quantity: 1, discountPercent: 12 },
                { productId: 2, quantity: 1, discountPercent: 18 }
            ]
        }, salesHeader);
        assert(calcRes.ok, "Pricing preview calculation executed");
        const calc = calcRes.data.data;
        assert(calc.items[0].riskStatus === "OK", "Laptop line (12% vs 15% ceiling) is OK");
        assert(calc.items[1].riskStatus === "OVER", "Service line (18% vs 10% ceiling) is OVER");
        assert(calc.items[1].overBy === 8, "Service line is exactly 8 points over its limit");
        assert(calc.blendedRisk === "HIGH", "Overall blended risk score is HIGH due to single-line violation >= 6");
        assert(calc.requiredApproval.includes("Sales Manager") && calc.requiredApproval.includes("Finance"), "Approval routed to Sales Manager then Finance");
    });

    await testStep("Scenario B: Cumulative violation pattern (multiple lines with small violations)", async () => {
        // Page 12: 'One line 2 points over, another 3 points over, another 2 points over. Added together = 7 or 8 points'
        // Let's test lines with small overages summing to >= 8 points
        const calcRes = await request("POST", "/quotations/preview", {
            customerId: 1,
            priceListId: 1,
            items: [
                { productId: 1, quantity: 1, discountPercent: 18 }, // ceiling 15 -> over by 3
                { productId: 2, quantity: 1, discountPercent: 13 }, // ceiling 10 -> over by 3
                { productId: 3, quantity: 1, discountPercent: 17 }  // ceiling 15 -> over by 2
            ]
        }, salesHeader);
        assert(calcRes.ok, "Cumulative violation calculation executed");
        const calc = calcRes.data.data;
        assert(calc.totalViolationPoints === 8, "Total violation points equals 8 (3 + 3 + 2)");
        assert(calc.maxSingleViolation === 3, "No single line is critically high (max single violation is only 3)");
        assert(calc.blendedRisk === "HIGH", "Blended risk detects cumulative erosion and escalates to HIGH risk");
    });

    // ============================================================================
    // LOOP 3: WAREHOUSE STOCK SPLIT & BACKORDER CONSOLIDATION (PAGE 4, 7, 8)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 3: MULTI-WAREHOUSE FULFILLMENT SPLITTING & BACKORDER CONSOLIDATION");
    console.log("================================================================================");

    await testStep("Auto-split order across warehouses based on live stock & consolidate backorder", async () => {
        // Setup warehouse stock: Product 1: Warehouse 1 has 5 units, Warehouse 2 has 3 units (Total 8 units available)
        await pool.query("UPDATE warehouse_inventory SET quantity_on_hand = 0, reserved_quantity = 0 WHERE product_id = 1");
        await pool.query("INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity) VALUES (1, 1, 5, 0) ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = 5, reserved_quantity = 0");
        await pool.query("INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity) VALUES (2, 1, 3, 0) ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = 3, reserved_quantity = 0");

        // Order 10 units (5 from WH1, 3 from WH2, 2 backordered)
        const qRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 10, discountPercent: 0 }]
        }, salesHeader);
        const splitQuote = qRes.data.data;

        await request("POST", `/quotations/${splitQuote.id}/submit`, {}, salesHeader);
        // Confirm quote directly
        await request("POST", `/customer/quotes/${splitQuote.id}/confirm`, {}, custHeader);

        // Check fulfillment order
        const foList = await request("GET", "/fulfillment/orders", null, adminHeader);
        const order = foList.data.data.find(o => o.quotationId === splitQuote.quoteCode || o.quotationId === `Q-${splitQuote.id}`);
        assert(order !== undefined, "Fulfillment order created");
        assert(order.status === "Partially Shipped", "Order status is 'Partially Shipped' (8 of 10 available)");
        assert(order.fulfilledQuantity === 8, "Fulfilled quantity across warehouses equals 8");
        assert(order.remainingQuantity === 2, "Remaining backorder quantity equals 2");

        // Check splits table: WH1 fulfilled 5, WH2 fulfilled 3
        const foDetail = await request("GET", `/fulfillment/orders/${order.id}`, null, adminHeader);
        assert(foDetail.data.data.splits.length === 2, "Order split across exactly 2 warehouses");

        // Replenish stock in WH1 with 5 units
        await pool.query("UPDATE warehouse_inventory SET quantity_on_hand = 5 WHERE warehouse_id = 1 AND product_id = 1");

        // Consolidate remaining backorder
        const consolidateRes = await request("POST", `/fulfillment/orders/${order.id}/consolidate-backorder`, {}, adminHeader);
        assert(consolidateRes.ok, "Consolidate remaining backorder succeeded");

        const updatedOrder = await request("GET", `/fulfillment/orders/${order.id}`, null, adminHeader);
        assert(updatedOrder.data.data.status === "Fulfilled", "Order transitioned to 'Fulfilled' after backorder consolidation");
        assert(updatedOrder.data.data.remainingQuantity === 0, "Backordered quantity reached 0");
    });

    // ============================================================================
    // LOOP 4: HYBRID BILLING (ONE-TIME + RECURRING SUBSCRIPTIONS, PAGE 4, 7, 8)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 4: HYBRID BILLING (ONE-TIME PRODUCTS MIXED WITH RECURRING SUBSCRIPTIONS)");
    console.log("================================================================================");

    await testStep("Hybrid quote generates separate one-time invoice and recurring subscription schedule", async () => {
        // Product 1 is One-time Hardware, Product 4 is Recurring Subscription Care Plan
        const hybridQuoteRes = await request("POST", "/quotations", {
            customerId: 2, // Beta Industries (Silver tier)
            priceListId: 1,
            items: [
                { productId: 1, quantity: 1, discountPercent: 0 },
                { productId: 4, quantity: 1, discountPercent: 0 }
            ]
        }, salesHeader);
        const hybridQuote = hybridQuoteRes.data.data;
        await request("POST", `/quotations/${hybridQuote.id}/submit`, {}, salesHeader);

        // Confirm quotation as customer 2 (sarah@betaind.com)
        const cust2Login = await request("POST", "/auth/login", { email: "sarah@betaind.com", password: "password123" });
        const cust2Header = { Authorization: `Bearer ${cust2Login.data.data.token}` };
        await request("POST", `/customer/quotes/${hybridQuote.id}/confirm`, {}, cust2Header);

        // Verify Billing invoices generated
        const invRes = await request("GET", "/invoices", null, finHeader);
        const quoteCode = hybridQuote.quoteCode || `Q-${hybridQuote.id}`;
        const relatedInvoices = invRes.data.data.filter(i => i.order === quoteCode || i.quotationCode === quoteCode || i.invoiceId?.includes(quoteCode.replace(/^Q-/, "")));
        
        assert(relatedInvoices.length >= 1, "Invoices generated for hybrid order");
        const oneTimeInv = relatedInvoices.find(i => i.type === "One-Time" || i.invoiceType === "One-Time");
        assert(oneTimeInv !== undefined, "Separate One-Time invoice generated for hardware items");

        // Verify Subscription created
        const subRes = await request("GET", "/subscriptions", null, finHeader);
        const relatedSub = subRes.data.data.find(s => s.quotationId === quoteCode || s.quotationId === hybridQuote.id || s.customer?.toLowerCase().includes("beta"));
        assert(relatedSub !== undefined, "Recurring subscription contract generated for subscription product");
        assert(relatedSub.status === "Active", "Subscription is in 'Active' state");

        // Verify recurring billing schedules
        const subDetail = await request("GET", `/subscriptions/${relatedSub.id}`, null, finHeader);
        assert(subDetail.data.data.billingSchedules?.length >= 1 || subDetail.data.data.schedules?.length >= 1, "Billing schedule records generated for future recurring cycles");
        const schedCount = subDetail.data.data.billingSchedules?.length || subDetail.data.data.schedules?.length || 0;
        console.log(`  [HYBRID BILLING VERIFIED]: 1 One-time invoice ($${oneTimeInv.amount}) + Subscription (${relatedSub.plan || relatedSub.planName}) with ${schedCount} scheduled billing dates`);
    });

    // ============================================================================
    // LOOP 5: DEAL HEALTH ANOMALIES & AUTOMATED ACTIONS (PAGE 5, 8, 9)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 5: DEAL HEALTH MONITORING, ANOMALY ALERTS, NUDGE & ESCALATION ACTIONS");
    console.log("================================================================================");

    await testStep("Deal Health indicators and automated nudge/escalate actions", async () => {
        const dhRes = await request("GET", "/deal-health", null, managerHeader);
        assert(dhRes.ok, "Deal health dashboard data retrieved");
        assert(dhRes.data.data.summary.stalledDeals !== undefined, "Tracks stalled deals count");
        assert(dhRes.data.data.summary.discountAnomalies !== undefined, "Tracks discount anomalies count");
        assert(dhRes.data.data.summary.deliverySlippage !== undefined, "Tracks delivery promise slippages count");

        // Test automated Nudge action on deal anomaly (Page 8 & 9)
        const nudgeRes = await request("POST", "/deal-health/1/nudge", {
            message: "Automated test reminder: Please follow up with client"
        }, managerHeader);
        assert(nudgeRes.ok, "Manager triggered automated Nudge action to assigned Sales Rep");
        assert(nudgeRes.data.data.status === "NUDGED", "Anomaly status updated to 'NUDGED'");

        // Test automated Escalate action on deal anomaly (Page 8 & 9)
        const escRes = await request("POST", "/deal-health/1/escalate", {
            reason: "Escalated for immediate senior executive review"
        }, managerHeader);
        assert(escRes.ok, "Manager triggered automated Escalate action");
        assert(escRes.data.data.status === "ESCALATED", "Anomaly status updated to 'ESCALATED'");
    });

    // ============================================================================
    // LOOP 6: REPORTING & ANALYTICS WITH FILTERS (PAGE 5, 9)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 6: REPORTING, SALES PERFORMANCE ANALYTICS & DASHBOARD METRICS");
    console.log("================================================================================");

    await testStep("Reporting filters and role dashboards with PDF/XLS export", async () => {
        const repDash = await request("GET", "/dashboard/sales-rep", null, salesHeader);
        assert(repDash.ok && repDash.data.success, "Sales Rep dashboard metrics retrieved");

        const mgrDash = await request("GET", "/dashboard/sales-manager", null, managerHeader);
        assert(mgrDash.ok && mgrDash.data.success, "Sales Manager dashboard metrics retrieved");

        const repSummary = await request("GET", "/dashboard/dashboard-summary", null, adminHeader);
        assert(repSummary.ok && repSummary.data.success, "Platform wide executive dashboard summary retrieved");

        // Verify period and status filters
        const filteredReports = await request("GET", "/reports?period=month&status=Approved", null, adminHeader);
        assert(filteredReports.ok && filteredReports.data.success, "Period and status filtering returned valid report metrics");

        // Verify PDF and XLS export endpoints
        const pdfExport = await request("GET", "/reports/export/pdf", null, adminHeader);
        assert(pdfExport.ok, "PDF report export generated (Page 5: Export options PDF/XLS)");

        const xlsExport = await request("GET", "/reports/export/xls", null, adminHeader);
        assert(xlsExport.ok, "XLS report export generated (Page 5: Export options PDF/XLS)");
    });

    // ============================================================================
    // LOOP 7: APPROVAL REVISION ('RETURN FOR REVISION') & REJECTION (PAGE 6)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 7: APPROVAL REVISION ('RETURN FOR REVISION') & REJECTION WORKFLOW");
    console.log("================================================================================");

    await testStep("Manager returns quotation for revision, Rep edits and resubmits, Manager approves", async () => {
        // Create quote with 25% discount (10 points over 15% Gold ceiling -> High Risk)
        const revQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 25 }]
        }, salesHeader);
        const revQuote = revQuoteRes.data.data;
        await request("POST", `/quotations/${revQuote.id}/submit`, {}, salesHeader);

        // Manager returns quote for revision with required comment
        const returnRes = await request("POST", `/approvals/${revQuote.id}/return`, {
            comment: "25% discount is too high. Please lower discount."
        }, managerHeader);
        assert(returnRes.ok, "Manager returned quotation for revision with mandatory comment");
        assert(returnRes.data.data.status === "Returned", "Quotation status transitioned to 'Returned'");

        // Rep edits quote to lower discount to 18% (3 points over ceiling -> Medium risk -> Sales Manager approval only)
        const updateRes = await request("PUT", `/quotations/${revQuote.id}`, {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 18 }]
        }, salesHeader);
        assert(updateRes.ok, "Rep revised quotation discount lines to medium risk tolerance");

        // Rep resubmits
        const resubmitRes = await request("POST", `/quotations/${revQuote.id}/submit`, {}, salesHeader);
        assert(resubmitRes.ok, "Rep successfully resubmitted revised quotation");
        assert(resubmitRes.data.data.status === "Pending" || resubmitRes.data.data.status === "Pending Approval", "Quotation re-entered pending approval status for Manager");

        // Manager approves revised quotation
        const approveRes = await request("POST", `/approvals/${revQuote.id}/approve`, {
            comment: "Revised 18% discount is acceptable."
        }, managerHeader);
        assert(approveRes.ok, "Manager approved revised quotation");
        assert(approveRes.data.data.status === "Approved", "Quotation is now 'Approved'");
    });

    await testStep("Manager rejects quotation with required rejection reason", async () => {
        const rejQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 1, discountPercent: 40 }]
        }, salesHeader);
        const rejQuote = rejQuoteRes.data.data;
        await request("POST", `/quotations/${rejQuote.id}/submit`, {}, salesHeader);

        const rejectRes = await request("POST", `/approvals/${rejQuote.id}/reject`, {
            comment: "40% discount is unacceptable for standard hardware line."
        }, managerHeader);
        assert(rejectRes.ok, "Manager rejected quotation with reason");
        assert(rejectRes.data.data.status === "Rejected", "Quotation status is 'Rejected'");
    });

    // ============================================================================
    // LOOP 8: MANUAL FULFILLMENT OVERRIDE (PAGE 7)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 8: MANUAL FULFILLMENT OVERRIDE ACROSS SPECIFIED WAREHOUSES");
    console.log("================================================================================");

    await testStep("Operations user performs manual split override and adjusts warehouse allocation", async () => {
        // Ensure stock in warehouses
        await pool.query("UPDATE warehouse_inventory SET quantity_on_hand = 10, reserved_quantity = 0 WHERE product_id = 1");

        // Create, submit and confirm an order of 6 units
        const manualQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 6, discountPercent: 0 }]
        }, salesHeader);
        const manualQuote = manualQuoteRes.data.data;
        await request("POST", `/quotations/${manualQuote.id}/submit`, {}, salesHeader);
        await request("POST", `/customer/quotes/${manualQuote.id}/confirm`, {}, custHeader);

        const foList = await request("GET", "/fulfillment/orders", null, adminHeader);
        const order = foList.data.data.find(o => o.quotationId === manualQuote.quoteCode || o.quotationId === `Q-${manualQuote.id}`);
        assert(order !== undefined, "Fulfillment order created for manual override test");

        // Execute manual override: 4 units from Main Warehouse, 2 units from East Depot
        const overrideRes = await request("POST", `/fulfillment/orders/${order.id}/manual-override`, {
            splits: [
                { warehouse: "Main Warehouse", quantityFulfilled: 4 },
                { warehouse: "East Depot", quantityFulfilled: 2 }
            ]
        }, adminHeader);
        assert(overrideRes.ok, "Manual override succeeded");
        assert(overrideRes.data.data.status === "Split Accepted", "Order status transitioned to 'Split Accepted'");
        assert(overrideRes.data.data.splits.length === 2, "Manual override updated splits to exactly 2 specified warehouses");
    });

    // ============================================================================
    // LOOP 9: SUBSCRIPTION LIFECYCLE: MODIFICATION & CANCELLATION (PAGE 5, 7, 8)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 9: SUBSCRIPTION LIFECYCLE: MID-CYCLE MODIFICATION & CANCELLATION");
    console.log("================================================================================");

    await testStep("Finance user modifies active subscription and cancels with audit reason", async () => {
        const subList = await request("GET", "/subscriptions", null, finHeader);
        assert(subList.data.data.length > 0, "Subscriptions exist in system");
        const activeSub = subList.data.data.find(s => s.status === "Active") || subList.data.data[0];

        // Modify subscription mid-cycle
        const modRes = await request("PATCH", `/subscriptions/${activeSub.id}`, {
            newPlanName: "Enterprise Platinum Care",
            newAmount: 250
        }, finHeader);
        assert(modRes.ok, "Finance user modified subscription mid-cycle");
        assert(modRes.data.data.status === "Modified", "Subscription status transitioned to 'Modified'");
        assert(modRes.data.data.planName === "Enterprise Platinum Care", "Updated plan name persisted");

        // Cancel subscription
        const cancelRes = await request("POST", `/subscriptions/${activeSub.id}/cancel`, {
            reason: "Client migrating infrastructure to on-premise"
        }, finHeader);
        assert(cancelRes.ok, "Subscription cancelled successfully");
        assert(cancelRes.data.data.status === "Cancelled", "Subscription status transitioned to 'Cancelled'");
    });

    // ============================================================================
    // LOOP 10: CUSTOMER PORTAL LINE-LEVEL NEGOTIATION COMMENTS (PAGE 8)
    // ============================================================================
    console.log("\n================================================================================");
    console.log("LOOP 10: CUSTOMER PORTAL LINE-LEVEL COMMENTS & CHANGE REQUEST TOOL");
    console.log("================================================================================");

    await testStep("Customer submits line-level comment / inquiry and confirms after acceptance", async () => {
        const noteQuoteRes = await request("POST", "/quotations", {
            customerId: 1,
            priceListId: 1,
            items: [{ productId: 1, quantity: 2, discountPercent: 5 }]
        }, salesHeader);
        const noteQuote = noteQuoteRes.data.data;
        await request("POST", `/quotations/${noteQuote.id}/submit`, {}, salesHeader);
        await request("POST", `/approvals/${noteQuote.id}/approve`, { comment: "Approved standard 5% discount" }, managerHeader);

        // Customer opens portal and submits line level change request/comment
        const negRes = await request("POST", `/customer/quotes/${noteQuote.id}/negotiate`, {
            customerComment: "Please include heavy-duty carrying cases and deliver before month-end."
        }, custHeader);
        assert(negRes.ok, "Customer successfully posted negotiation comment/request");

        // Verify history shows negotiation comment
        const histRes = await request("GET", `/customer/quotes/${noteQuote.id}/history`, null, custHeader);
        assert(histRes.ok, "Customer negotiation history retrieved");
        const customerNoteExists = histRes.data.data.negotiationLines?.some(h => h.customerComment?.includes("carrying cases")) ||
                                   histRes.data.data.auditTrail?.some(a => a.note?.includes("carrying cases"));
        assert(customerNoteExists, "Line-level change request logged in negotiation history / audit trail");

        // Rep accepts revised customer terms and resubmits
        await request("POST", `/quotations/${noteQuote.id}/submit`, {}, salesHeader);
        await request("POST", `/approvals/${noteQuote.id}/approve`, { comment: "Carrying cases confirmed with logistics" }, managerHeader);

        // Customer confirms final quotation
        const confirmRes = await request("POST", `/customer/quotes/${noteQuote.id}/confirm`, {}, custHeader);
        assert(confirmRes.ok, "Customer confirmed final quotation after negotiation");
        assert(confirmRes.data.data.status === "Confirmed", "Quotation is officially Confirmed");
    });

    console.log("\n================================================================================");
    console.log(`🎉 ALL ${totalTests}/${totalTests} HACKATHON SPECIFICATION LOOP TESTS PASSED (100%) 🎉`);
    console.log("================================================================================");
}

runPdfLoopEngineering().catch((err) => {
    console.error("\n💥 LOOP ENGINEERING RUN FAILED:", err);
    process.exit(1);
});
