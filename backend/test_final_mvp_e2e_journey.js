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
        contentType,
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

async function runFinalMvpJourney() {
    console.log("==================================================");
    console.log("STARTING COMPLETE REALISTIC MVP BUSINESS JOURNEY");
    console.log("==================================================\n");

    try {
        console.log("--- STEP 1: Admin Configuration & Warehouse Inventory Setup ---");
        const adminLogin = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
        assert(adminLogin.status === 200, "Admin login successful");
        const adminHeader = { Authorization: `Bearer ${adminLogin.data.data.token}` };

        const prod1Res = await pool.query("SELECT * FROM products WHERE sku = 'PROD-001'");
        const hardwareProd = prod1Res.rows[0];
        assert(hardwareProd, "Hardware Product Laptop Pro 14 (PROD-001) found");
        assert(Number(hardwareProd.tax_percent) === 15, "Laptop Pro 14 has 15% tax_percent configured in DB");

        const prod4Res = await pool.query("SELECT * FROM products WHERE sku = 'PROD-004'");
        const recurringProd = prod4Res.rows[0];
        assert(recurringProd, "Subscription Product Care Plan 2yr (PROD-004) found");
        assert(recurringProd.is_subscription === true, "Care Plan 2yr is a recurring subscription product");

        const whRes = await pool.query("SELECT id, name FROM warehouses WHERE is_active = TRUE ORDER BY id ASC");
        assert(whRes.rows.length >= 1, "At least 1 active warehouse available");
        const mainWhId = whRes.rows[0].id;

        await pool.query(
            `UPDATE warehouse_inventory SET quantity_on_hand = 0, reserved_quantity = 0 WHERE product_id = $1`,
            [hardwareProd.id]
        );
        await pool.query(
            `INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity)
             VALUES ($1, $2, 6, 0)
             ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = 6, reserved_quantity = 0`,
            [mainWhId, hardwareProd.id]
        );
        console.log(`[ADMIN] Warehouse inventory initialized: Warehouse ${mainWhId}, Product "${hardwareProd.name}", Stock = 6 units (other warehouses 0)`);

        console.log("\n--- STEP 2: Sales Rep Creates Quotation (Mixed One-Time + Recurring) ---");
        const salesLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
        assert(salesLogin.status === 200, "Sales Rep login successful");
        const salesHeader = { Authorization: `Bearer ${salesLogin.data.data.token}` };

        const quotePayload = {
            customerId: 1,
            priceListId: 1,
            items: [
                { productId: hardwareProd.id, quantity: 10, discountPercent: 5 },
                { productId: recurringProd.id, quantity: 2, discountPercent: 0 }
            ]
        };

        const createQuoteRes = await request("POST", "/quotations", quotePayload, salesHeader);
        assert(createQuoteRes.status === 201, "Sales Rep successfully created quotation");
        const quote = createQuoteRes.data.data;
        console.log(`[SALES REP] Created quotation ${quote.id} (${quote.quoteCode})`);

        const submitRes = await request("POST", `/quotations/${quote.id}/submit`, {}, salesHeader);
        assert(submitRes.status === 200, "Quotation submitted by Sales Rep");
        let activeQuote = submitRes.data.data;

        console.log("\n--- STEP 3: Sales Manager Reviews & Approves Quotation ---");
        const managerLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
        assert(managerLogin.status === 200, "Sales Manager login successful");
        const managerHeader = { Authorization: `Bearer ${managerLogin.data.data.token}` };

        if (activeQuote.status === "Pending Approval") {
            const appQueue = await request("GET", "/approvals", null, managerHeader);
            const pendingApp = appQueue.data.data.find(a => a.quotationId === activeQuote.id || a.quotationId === activeQuote.quoteCode);
            assert(pendingApp, `Quotation ${quote.id} found in Manager approval queue`);
            const approveRes = await request("POST", `/approvals/${pendingApp.id}/approve`, { comment: "Approved for MVP journey" }, managerHeader);
            assert(approveRes.status === 200, "Manager successfully approved quotation");
        }

        const quoteVerified = await request("GET", `/quotations/${quote.id}`, null, salesHeader);
        assert(quoteVerified.data.data.status === "Approved", `Quotation ${quote.id} is in 'Approved' status`);

        console.log("\n--- STEP 4: Customer Portal Reviews & Confirms Quotation ---");
        const custLogin = await request("POST", "/auth/login", { email: "john@acme.com", password: "password123" });
        assert(custLogin.status === 200, "Customer (john@acme.com) login successful");
        const custHeader = { Authorization: `Bearer ${custLogin.data.data.token}` };

        const custViewRes = await request("GET", `/customer/quotes/${quote.id}`, null, custHeader);
        assert(custViewRes.status === 200, "Customer successfully viewed quotation");
        assert(custViewRes.data.data.isConfirmable === true, "Quotation isConfirmable is true for customer");

        const confirmRes = await request("POST", `/customer/quotes/${quote.id}/confirm`, {}, custHeader);
        assert(confirmRes.status === 200, "Customer confirmed quotation successfully");
        console.log("[CUSTOMER] Quotation confirmed!");

        console.log("\n--- STEP 5: System Automated Execution & Database State Verification ---");
        const dbQuoteId = quote.dbId || (await pool.query("SELECT id FROM quotations WHERE quote_code = $1", [quote.id])).rows[0].id;

        const dbQ = await pool.query("SELECT * FROM quotations WHERE id = $1", [dbQuoteId]);
        assert(dbQ.rows[0].status === "Confirmed", "Quotation DB status is 'Confirmed'");

        const invRes = await pool.query("SELECT * FROM invoices WHERE quotation_id = $1 ORDER BY id ASC", [dbQuoteId]);
        assert(invRes.rows.length === 2, `Exactly two invoices generated (One-Time + Recurring). Count: ${invRes.rows.length}`);

        const oneTimeInv = invRes.rows.find(i => i.invoice_type === "One-Time");
        const recurringInv = invRes.rows.find(i => i.invoice_type === "Recurring");
        assert(oneTimeInv, "One-Time invoice exists");
        assert(recurringInv, "Recurring invoice exists");
        assert(Number(oneTimeInv.amount) > 0, `One-Time invoice amount is positive: ${oneTimeInv.amount}`);
        assert(Number(recurringInv.amount) > 0, `Recurring invoice amount is positive: ${recurringInv.amount}`);

        const invItemsRes = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [oneTimeInv.id]);
        assert(invItemsRes.rows.length >= 1, `Invoice items populated for one-time invoice (${invItemsRes.rows.length} item(s))`);
        const laptopInvItem = invItemsRes.rows.find(it => it.product_id === hardwareProd.id);
        assert(laptopInvItem, "Laptop Pro 14 line item present in invoice_items");
        assert(Number(laptopInvItem.quantity) === 10, "Invoice line item quantity is 10");
        assert(Number(laptopInvItem.tax_percent) === 15, "Invoice line item tax percent is 15%");

        const subRes = await pool.query("SELECT * FROM subscriptions WHERE quotation_id = $1", [dbQuoteId]);
        assert(subRes.rows.length === 1, "Subscription contract created in subscriptions table");
        assert(subRes.rows[0].status === "Active", "Subscription status is 'Active'");

        const foRes = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [dbQuoteId]);
        assert(foRes.rows.length === 1, "Fulfillment order created");
        const fo = foRes.rows[0];
        assert(fo.status === "Partially Shipped", `Fulfillment order status is 'Partially Shipped' (actual: ${fo.status})`);

        const splitsRes = await pool.query("SELECT * FROM fulfillment_splits WHERE fulfillment_order_id = $1", [fo.id]);
        const fulfilledQty = splitsRes.rows.reduce((sum, r) => sum + Number(r.quantity_fulfilled), 0);
        assert(fulfilledQty === 6, `Fulfilled quantity is 6 (available stock)`);

        const invCheck1 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [mainWhId, hardwareProd.id]);
        assert(Number(invCheck1.rows[0].quantity_on_hand) === 0, `Warehouse inventory deducted from 6 to 0 (actual: ${invCheck1.rows[0].quantity_on_hand})`);

        const boRes = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [fo.id]);
        assert(boRes.rows.length === 1, "Backorder record created in backorder_records table");
        const bo = boRes.rows[0];
        assert(Number(bo.backordered_quantity) === 4, `Backordered quantity is exactly 4 (actual: ${bo.backordered_quantity})`);
        assert(bo.status === "PARTIALLY_FULFILLED", "Backorder status is 'PARTIALLY_FULFILLED'");

        console.log("\n--- STEP 6: Operations Replenishes Warehouse Inventory ---");
        const replenishRes = await request("POST", `/admin/warehouses/${mainWhId}/inventory`, {
            productId: hardwareProd.id,
            quantityOnHand: 4
        }, adminHeader);
        assert(replenishRes.status === 200, "Operations replenished 4 units via Admin inventory API");

        const invCheck2 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [mainWhId, hardwareProd.id]);
        assert(Number(invCheck2.rows[0].quantity_on_hand) === 4, "Warehouse inventory updated to 4 units");

        console.log("\n--- STEP 7: System Consolidates & Fulfills Backorder ---");
        const consolidateRes = await request("POST", `/fulfillment/orders/${fo.order_code}/consolidate-backorder`, {}, adminHeader);
        assert(consolidateRes.status === 200, "POST /consolidate-backorder succeeded");

        console.log("\n--- STEP 8: Final PostgreSQL Integrity & Lifecycle Assertions ---");

        const foFinal = await pool.query("SELECT * FROM fulfillment_orders WHERE id = $1", [fo.id]);
        assert(foFinal.rows[0].status === "Fulfilled", `Final fulfillment status is 'Fulfilled' (actual: ${foFinal.rows[0].status})`);

        const boFinal = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [fo.id]);
        assert(Number(boFinal.rows[0].backordered_quantity) === 0, `Backordered quantity reached exactly 0 (actual: ${boFinal.rows[0].backordered_quantity})`);
        assert(Number(boFinal.rows[0].fulfilled_quantity) === 10, `Total fulfilled quantity reached 10 (actual: ${boFinal.rows[0].fulfilled_quantity})`);
        assert(boFinal.rows[0].status === "FULFILLED", "Backorder status is 'FULFILLED'");

        const invFinal = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [mainWhId, hardwareProd.id]);
        assert(Number(invFinal.rows[0].quantity_on_hand) === 0, "Warehouse stock deducted from 4 to 0 (no negative stock)");

        const splitsFinal = await pool.query("SELECT SUM(quantity_fulfilled)::int AS total FROM fulfillment_splits WHERE fulfillment_order_id = $1", [fo.id]);
        assert(splitsFinal.rows[0].total === 10, `Total units recorded across fulfillment splits is exactly 10 (actual: ${splitsFinal.rows[0].total})`);

        const dupConfirm = await request("POST", `/customer/quotes/${quote.id}/confirm`, {}, custHeader);
        assert(dupConfirm.status === 400, "Duplicate confirmation cleanly rejected with 400 Bad Request");

        const invCountCheck = await pool.query("SELECT COUNT(*)::int FROM invoices WHERE quotation_id = $1", [dbQuoteId]);
        assert(invCountCheck.rows[0].count === 2, "No duplicate invoices generated upon retry");

        console.log("\n==================================================");
        console.log("🎉 COMPLETE REALISTIC MVP BUSINESS JOURNEY SUCCEEDED (100%)");
        console.log("==================================================");

    } catch (err) {
        console.error("\n💥 FINAL JOURNEY FAILED:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runFinalMvpJourney();
