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

async function runFulfillmentLifecycleSuite() {
    console.log("==================================================");
    console.log("STARTING FULL FULFILLMENT & INVENTORY E2E SUITE");
    console.log("==================================================\n");

    try {
        const adminLogin = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
        assert(adminLogin.status === 200, "Admin login successful");
        const adminHeader = { Authorization: `Bearer ${adminLogin.data.data.token}` };

        const salesLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
        assert(salesLogin.status === 200, "Sales Rep login successful");
        const salesHeader = { Authorization: `Bearer ${salesLogin.data.data.token}` };

        const managerLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
        assert(managerLogin.status === 200, "Manager login successful");
        const managerHeader = { Authorization: `Bearer ${managerLogin.data.data.token}` };

        const custLogin = await request("POST", "/auth/login", { email: "john@acme.com", password: "password123" });
        assert(custLogin.status === 200, "Customer (john@acme.com) login successful");
        const custHeader = { Authorization: `Bearer ${custLogin.data.data.token}` };
        const customerId = custLogin.data.data.user.customerId;
        assert(customerId === 1, "Customer ID is 1 (Acme Corp)");

        const prodRes = await pool.query("SELECT id, name, sku FROM products WHERE sku = 'PROD-002'");
        const testProduct = prodRes.rows[0];
        assert(testProduct, "Test product PROD-002 found in database");
        const prodId = testProduct.id;

        const whRes = await pool.query("SELECT id, name FROM warehouses WHERE is_active = TRUE ORDER BY id ASC");
        assert(whRes.rows.length >= 2, "At least 2 active warehouses available");
        const wh1Id = whRes.rows[0].id;
        const wh2Id = whRes.rows[1].id;

        const setStock = async (wh1Stock, wh2Stock = 0) => {
            await pool.query(
                `INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity)
                 VALUES ($1, $2, $3, 0)
                 ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = $3, reserved_quantity = 0`,
                [wh1Id, prodId, wh1Stock]
            );
            await pool.query(
                `INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity)
                 VALUES ($1, $2, $3, 0)
                 ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = $3, reserved_quantity = 0`,
                [wh2Id, prodId, wh2Stock]
            );
        };

        const createApprovedQuote = async (quantity, discount = 5) => {
            const createRes = await request("POST", "/quotations", {
                customerId,
                priceListId: 1,
                items: [{ productId: prodId, quantity, discountPercent: discount }]
            }, salesHeader);
            assert(createRes.status === 201, "Quotation created by Sales Rep");
            const quote = createRes.data.data;

            const submitRes = await request("POST", `/quotations/${quote.id}/submit`, {}, salesHeader);
            let activeQuote = submitRes.data.data;

            if (activeQuote.status === "Pending Approval") {
                const appRes = await request("GET", "/approvals", null, managerHeader);
                const pendingApp = appRes.data.data.find(a => a.quotationId === activeQuote.id || a.quotationId === activeQuote.quoteCode);
                if (pendingApp) {
                    await request("POST", `/approvals/${pendingApp.id}/approve`, { comment: "Approved for E2E test" }, managerHeader);
                }
            }

            const checkRes = await request("GET", `/quotations/${quote.id}`, null, salesHeader);
            assert(checkRes.data.data.status === "Approved", `Quotation ${quote.id} is in Approved status`);
            return checkRes.data.data;
        };

        console.log("\n--- SCENARIO 1: FULL STOCK FULFILLMENT ---");
        await setStock(10, 0);
        const q1 = await createApprovedQuote(5);

        const confRes1 = await request("POST", `/customer/quotes/${q1.id}/confirm`, {}, custHeader);
        assert(confRes1.status === 200, "Customer confirmed quotation successfully");

        const dbQ1 = await pool.query("SELECT status FROM quotations WHERE id = $1", [q1.dbId]);
        assert(dbQ1.rows[0].status === "Confirmed", "Quotation DB status is 'Confirmed'");

        const invRes1 = await pool.query("SELECT * FROM invoices WHERE quotation_id = $1", [q1.dbId]);
        assert(invRes1.rows.length === 1, "Exactly one invoice generated in invoices table");
        assert(invRes1.rows[0].invoice_type === "One-Time", "Invoice type is 'One-Time'");
        assert(Number(invRes1.rows[0].amount) > 0, `Invoice amount is positive (${invRes1.rows[0].amount})`);

        const invItemsRes1 = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invRes1.rows[0].id]);
        assert(invItemsRes1.rows.length === 1, "Invoice line items populated in invoice_items table");
        assert(invItemsRes1.rows[0].quantity === 5, "Invoice item quantity matches quotation (5)");

        const foRes1 = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [q1.dbId]);
        assert(foRes1.rows.length === 1, "Fulfillment order created in fulfillment_orders table");
        assert(foRes1.rows[0].status === "Fulfilled", `Fulfillment order status is 'Fulfilled' (actual: ${foRes1.rows[0].status})`);

        const splits1 = await pool.query("SELECT * FROM fulfillment_splits WHERE fulfillment_order_id = $1", [foRes1.rows[0].id]);
        assert(splits1.rows.length === 1, "One fulfillment split created");
        assert(splits1.rows[0].quantity_fulfilled === 5, "Split quantity fulfilled is 5");

        const invStock1 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(invStock1.rows[0].quantity_on_hand === 5, `Inventory deducted from 10 to 5 (actual: ${invStock1.rows[0].quantity_on_hand})`);

        const bo1 = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes1.rows[0].id]);
        const boQty1 = bo1.rows.reduce((sum, r) => sum + Number(r.backordered_quantity), 0);
        assert(boQty1 === 0, "Backordered quantity is 0");

        console.log("\n--- SCENARIO 2: PARTIAL STOCK FULFILLMENT ---");
        await setStock(6, 0);
        const q2 = await createApprovedQuote(10);

        const confRes2 = await request("POST", `/customer/quotes/${q2.id}/confirm`, {}, custHeader);
        assert(confRes2.status === 200, "Customer confirmed quotation (partial stock)");

        const foRes2 = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [q2.dbId]);
        assert(foRes2.rows.length === 1, "Fulfillment order exists");
        assert(foRes2.rows[0].status === "Partially Shipped", `Fulfillment order status is 'Partially Shipped' (actual: ${foRes2.rows[0].status})`);

        const splits2 = await pool.query("SELECT * FROM fulfillment_splits WHERE fulfillment_order_id = $1", [foRes2.rows[0].id]);
        const fulfilled2 = splits2.rows.reduce((sum, r) => sum + Number(r.quantity_fulfilled), 0);
        assert(fulfilled2 === 6, `Fulfilled quantity is 6 (actual: ${fulfilled2})`);

        const invStock2 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(invStock2.rows[0].quantity_on_hand === 0, `Inventory deducted to 0 (actual: ${invStock2.rows[0].quantity_on_hand})`);

        const bo2 = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes2.rows[0].id]);
        assert(bo2.rows.length >= 1, "Backorder record created");
        assert(bo2.rows[0].backordered_quantity === 4, `Backordered quantity is 4 (actual: ${bo2.rows[0].backordered_quantity})`);
        assert(bo2.rows[0].status === "PARTIALLY_FULFILLED", "Backorder status is PARTIALLY_FULFILLED");

        console.log("\n--- SCENARIO 3: ZERO STOCK FULFILLMENT ---");
        await setStock(0, 0);
        const q3 = await createApprovedQuote(10);

        const confRes3 = await request("POST", `/customer/quotes/${q3.id}/confirm`, {}, custHeader);
        assert(confRes3.status === 200, "Quotation confirmed with zero stock without failure");

        const foRes3 = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [q3.dbId]);
        assert(foRes3.rows[0].status === "Backordered", `Fulfillment status is 'Backordered' (actual: ${foRes3.rows[0].status})`);

        const bo3 = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes3.rows[0].id]);
        assert(bo3.rows.length >= 1, "Backorder record exists");
        assert(bo3.rows[0].backordered_quantity === 10, `Backordered quantity is 10 (actual: ${bo3.rows[0].backordered_quantity})`);
        assert(bo3.rows[0].status === "PENDING", "Backorder status is PENDING");

        const invStock3 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(invStock3.rows[0].quantity_on_hand === 0, "Inventory remains 0 (no negative stock)");

        console.log("\n--- SCENARIO 4: MULTI-WAREHOUSE SPLIT ---");
        await setStock(6, 4);
        const q4 = await createApprovedQuote(10);

        const confRes4 = await request("POST", `/customer/quotes/${q4.id}/confirm`, {}, custHeader);
        assert(confRes4.status === 200, "Quotation confirmed with multi-warehouse split");

        const foRes4 = await pool.query("SELECT * FROM fulfillment_orders WHERE quotation_id = $1", [q4.dbId]);
        assert(foRes4.rows[0].status === "Fulfilled", `Fulfillment status is 'Fulfilled' (actual: ${foRes4.rows[0].status})`);

        const splits4 = await pool.query("SELECT * FROM fulfillment_splits WHERE fulfillment_order_id = $1 ORDER BY warehouse_id ASC", [foRes4.rows[0].id]);
        assert(splits4.rows.length === 2, `Two fulfillment splits created across warehouses (actual: ${splits4.rows.length})`);
        assert(splits4.rows[0].quantity_fulfilled === 6, "Warehouse 1 fulfilled 6 units");
        assert(splits4.rows[1].quantity_fulfilled === 4, "Warehouse 2 fulfilled 4 units");

        const s4_w1 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        const s4_w2 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh2Id, prodId]);
        assert(s4_w1.rows[0].quantity_on_hand === 0, "Warehouse 1 stock deducted from 6 to 0");
        assert(s4_w2.rows[0].quantity_on_hand === 0, "Warehouse 2 stock deducted from 4 to 0");

        console.log("\n--- SCENARIO 5: BACKORDER REPLENISHMENT ---");
        const boPre5 = await pool.query("SELECT backordered_quantity FROM backorder_records WHERE fulfillment_order_id = $1", [foRes2.rows[0].id]);
        assert(boPre5.rows[0].backordered_quantity === 4, "Backorder quantity before replenishment is 4");

        const repRes5 = await request("POST", `/admin/warehouses/${wh1Id}/inventory`, {
            productId: prodId,
            quantityOnHand: 4
        }, adminHeader);
        assert(repRes5.status === 200, "Inventory replenished with 4 units in Warehouse 1");

        const consRes5 = await request("POST", `/fulfillment/orders/${foRes2.rows[0].order_code}/consolidate-backorder`, {}, adminHeader);
        assert(consRes5.status === 200, "Backorder consolidation / fulfillment request succeeded");

        const foPost5 = await pool.query("SELECT * FROM fulfillment_orders WHERE id = $1", [foRes2.rows[0].id]);
        assert(foPost5.rows[0].status === "Fulfilled", `Fulfillment order status updated to 'Fulfilled' (actual: ${foPost5.rows[0].status})`);

        const boPost5 = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes2.rows[0].id]);
        assert(boPost5.rows[0].backordered_quantity === 0, "Backorder quantity after replenishment is 0");
        assert(boPost5.rows[0].status === "FULFILLED", "Backorder status is 'FULFILLED'");

        const stockPost5 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(stockPost5.rows[0].quantity_on_hand === 0, "Replenished inventory deducted from 4 to 0");

        console.log("\n--- SCENARIO 6: PARTIAL BACKORDER REPLENISHMENT ---");
        await request("POST", `/admin/warehouses/${wh1Id}/inventory`, {
            productId: prodId,
            quantityOnHand: 6
        }, adminHeader);

        const consRes6a = await request("POST", `/fulfillment/orders/${foRes3.rows[0].order_code}/consolidate-backorder`, {}, adminHeader);
        assert(consRes6a.status === 200, "First replenishment fulfillment succeeded");

        const foPost6a = await pool.query("SELECT * FROM fulfillment_orders WHERE id = $1", [foRes3.rows[0].id]);
        assert(foPost6a.rows[0].status === "Partially Shipped", `Order status is 'Partially Shipped' (actual: ${foPost6a.rows[0].status})`);

        const boPost6a = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes3.rows[0].id]);
        assert(boPost6a.rows[0].backordered_quantity === 4, `Remaining backorder is 4 (actual: ${boPost6a.rows[0].backordered_quantity})`);

        await request("POST", `/admin/warehouses/${wh1Id}/inventory`, {
            productId: prodId,
            quantityOnHand: 4
        }, adminHeader);

        const consRes6b = await request("POST", `/fulfillment/orders/${foRes3.rows[0].order_code}/consolidate-backorder`, {}, adminHeader);
        assert(consRes6b.status === 200, "Second replenishment fulfillment succeeded");

        const foPost6b = await pool.query("SELECT * FROM fulfillment_orders WHERE id = $1", [foRes3.rows[0].id]);
        assert(foPost6b.rows[0].status === "Fulfilled", `Order status is 'Fulfilled' (actual: ${foPost6b.rows[0].status})`);

        const boPost6b = await pool.query("SELECT * FROM backorder_records WHERE fulfillment_order_id = $1", [foRes3.rows[0].id]);
        assert(boPost6b.rows[0].backordered_quantity === 0, "Remaining backorder is 0");
        assert(boPost6b.rows[0].status === "FULFILLED", "Backorder status is 'FULFILLED'");

        console.log("\n--- SCENARIO 7: DUPLICATE REQUESTS & IDEMPOTENCY ---");
        const dupConfRes = await request("POST", `/customer/quotes/${q1.id}/confirm`, {}, custHeader);
        assert(dupConfRes.status === 400, "Second confirmation attempt cleanly rejected with 400 Bad Request");

        const dupInvCheck = await pool.query("SELECT COUNT(*)::int FROM invoices WHERE quotation_id = $1", [q1.dbId]);
        assert(dupInvCheck.rows[0].count === 1, "Exactly one invoice exists (no duplicate invoice created)");

        await setStock(5, 0);
        const dupSplitRes = await request("POST", `/fulfillment/orders/${foRes1.rows[0].order_code}/accept-split`, {}, adminHeader);
        assert(dupSplitRes.status === 200, "Accept split on already fulfilled order returns 200 without error");

        const stockCheck7 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(stockCheck7.rows[0].quantity_on_hand === 5, "Stock was not double-deducted on repeated fulfillment call (remains 5)");

        console.log("\n--- SCENARIO 8: CONCURRENT INVENTORY PROTECTION ---");
        await setStock(5, 0);

        const q8a = await createApprovedQuote(5);
        const q8b = await createApprovedQuote(5);

        const [res8a, res8b] = await Promise.all([
            request("POST", `/customer/quotes/${q8a.id}/confirm`, {}, custHeader),
            request("POST", `/customer/quotes/${q8b.id}/confirm`, {}, custHeader)
        ]);

        assert(res8a.status === 200, "Request A succeeded");
        assert(res8b.status === 200, "Request B succeeded");

        const stockCheck8 = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = $1 AND product_id = $2", [wh1Id, prodId]);
        assert(stockCheck8.rows[0].quantity_on_hand === 0, `Inventory is exactly 0 (actual: ${stockCheck8.rows[0].quantity_on_hand})`);
        assert(stockCheck8.rows[0].quantity_on_hand >= 0, "Inventory NEVER dropped below zero under concurrency");

        const fo8a = await pool.query("SELECT status FROM fulfillment_orders WHERE quotation_id = $1", [q8a.dbId]);
        const fo8b = await pool.query("SELECT status FROM fulfillment_orders WHERE quotation_id = $1", [q8b.dbId]);
        const statuses = [fo8a.rows[0].status, fo8b.rows[0].status];
        assert(statuses.includes("Fulfilled"), "One concurrent order was Fulfilled (5 units)");
        assert(statuses.includes("Backordered"), "The other concurrent order was Backordered (5 units)");

        console.log("\n==================================================");
        console.log("🎉 ALL 8 E2E FULFILLMENT & INVENTORY SCENARIOS PASSED (100%)");
        console.log("==================================================");

    } catch (err) {
        console.error("\n💥 SUITE FAILED:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runFulfillmentLifecycleSuite();
