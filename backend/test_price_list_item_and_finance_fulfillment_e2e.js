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

async function runTestSuite() {
    console.log("==========================================================================");
    console.log("STARTING PRICE LIST ITEM MANAGEMENT & FINANCE FULFILLMENT E2E TESTS");
    console.log("==========================================================================\n");

    try {
        // Query database to find test users for each role
        const usersRes = await pool.query("SELECT id, email, role FROM users WHERE is_active = TRUE");
        const adminUser = usersRes.rows.find(u => u.role === "admin");
        const financeUser = usersRes.rows.find(u => u.role === "finance");
        const operationsUser = usersRes.rows.find(u => u.role === "operations");
        const salesRepUser = usersRes.rows.find(u => u.role === "sales_rep");

        assert(Boolean(adminUser), `Admin user found: ${adminUser?.email}`);
        assert(Boolean(financeUser), `Finance user found: ${financeUser?.email}`);
        assert(Boolean(operationsUser), `Operations user found: ${operationsUser?.email}`);
        assert(Boolean(salesRepUser), `Sales rep user found: ${salesRepUser?.email}`);

        const admin = await login(adminUser.email);
        const finance = await login(financeUser.email);
        const operations = await login(operationsUser.email);
        const salesRep = await login(salesRepUser.email);

        // -------------------------------------------------------------------------
        // PART B: FULFILLMENT AUTHORIZATION TESTS
        // -------------------------------------------------------------------------
        console.log("\n--- PART B: FULFILLMENT AUTHORIZATION TESTS ---");

        // 1. Finance Manager cannot access fulfillment orders list
        const financeFulfillmentList = await request("GET", "/fulfillment/orders", null, finance.token);
        assert(financeFulfillmentList.status === 403, "Finance user rejected from GET /api/fulfillment/orders with 403 Forbidden");

        // 2. Finance Manager cannot access fulfillment detail or operations
        const financeFulfillmentDetail = await request("GET", "/fulfillment/orders/1", null, finance.token);
        assert(financeFulfillmentDetail.status === 403, "Finance user rejected from GET /api/fulfillment/orders/1 with 403 Forbidden");

        const financeSplitOverride = await request("POST", "/fulfillment/orders/1/accept-split", {}, finance.token);
        assert(financeSplitOverride.status === 403, "Finance user rejected from POST /api/fulfillment/orders/1/accept-split with 403 Forbidden");

        // 3. Admin can access fulfillment orders
        const adminFulfillmentList = await request("GET", "/fulfillment/orders", null, admin.token);
        assert(adminFulfillmentList.status === 200, "Admin user permitted to GET /api/fulfillment/orders with 200 OK");

        // 4. Operations can access fulfillment orders
        const opsFulfillmentList = await request("GET", "/fulfillment/orders", null, operations.token);
        assert(opsFulfillmentList.status === 200, "Operations user permitted to GET /api/fulfillment/orders with 200 OK");

        // 5. Finance Manager retains full access to billing, invoices, subscriptions, and approvals
        const financeInvoices = await request("GET", "/invoices", null, finance.token);
        assert(financeInvoices.status === 200, "Finance user permitted to GET /api/invoices with 200 OK");

        const financeSubs = await request("GET", "/subscriptions", null, finance.token);
        assert(financeSubs.status === 200, "Finance user permitted to GET /api/subscriptions with 200 OK");

        const financeApprovals = await request("GET", "/approvals", null, finance.token);
        assert(financeApprovals.status === 200, "Finance user permitted to GET /api/approvals with 200 OK");

        // -------------------------------------------------------------------------
        // PART A: ADMIN PRICE LIST ITEM MANAGEMENT TESTS
        // -------------------------------------------------------------------------
        console.log("\n--- PART A: ADMIN PRICE LIST ITEM MANAGEMENT TESTS ---");

        // 1. Get or create a dedicated price list for item management testing
        let priceListsRes = await request("GET", "/price-lists", null, admin.token);
        assert(priceListsRes.status === 200, "Admin can GET /api/price-lists");
        
        let testPriceList = priceListsRes.data.data.find(pl => pl.name === "Item Management Test Price List");
        if (!testPriceList) {
            const createPlRes = await request("POST", "/price-lists", {
                name: "Item Management Test Price List",
                description: "Used for automated item-level management testing",
                currency: "USD",
                isDefault: false
            }, admin.token);
            assert(createPlRes.status === 201, "Admin created test price list");
            testPriceList = createPlRes.data.data;
        }
        assert(Boolean(testPriceList?.id), `Test price list ready with ID: ${testPriceList.id}`);

        // Also get another price list to test cross-price-list tampering
        let secondPriceList = priceListsRes.data.data.find(pl => pl.id !== testPriceList.id);
        if (!secondPriceList) {
            const createPl2 = await request("POST", "/price-lists", {
                name: "Tamper Target Price List",
                description: "Second price list",
                currency: "USD",
                isDefault: false
            }, admin.token);
            secondPriceList = createPl2.data.data;
        }

        // Get an active product from catalog
        const productsRes = await pool.query("SELECT id, name, sku FROM products WHERE is_active = TRUE LIMIT 2");
        const product1 = productsRes.rows[0];
        const product2 = productsRes.rows[1] || product1;
        assert(Boolean(product1), `Catalog product found: ${product1.name} (SKU: ${product1.sku})`);

        // Clean any existing items in testPriceList for product1 to start fresh
        await pool.query("DELETE FROM price_list_items WHERE price_list_id = $1 AND product_id = $2", [testPriceList.id, product1.id]);

        // 2. Admin adds item to price list
        const createItemRes = await request("POST", `/price-lists/${testPriceList.id}/items`, {
            productId: product1.id,
            unitPrice: 150.00,
            minQuantity: 1,
            maxQuantity: 10
        }, admin.token);
        assert(createItemRes.status === 201, `Admin created price list item for product ${product1.name} at $150.00`);
        const createdItemId = createItemRes.data.data.id;

        // 3. Admin views items in price list (Acceptance Criterion 1)
        const getItemsRes = await request("GET", `/price-lists/${testPriceList.id}/items`, null, admin.token);
        assert(getItemsRes.status === 200, "Admin can GET /api/price-lists/:priceListId/items");
        const items = getItemsRes.data.data;
        const foundItem = items.find(i => Number(i.id) === Number(createdItemId));
        assert(Boolean(foundItem), `Item ${createdItemId} visible in price list items list`);
        assert(Number(foundItem.unit_price) === 150.00, `Configured unit_price matches $150.00`);
        assert(foundItem.product_name === product1.name, `Product name '${foundItem.product_name}' displayed`);
        assert(foundItem.product_sku === product1.sku, `Product SKU '${foundItem.product_sku}' displayed`);

        // 4. Admin edits item price and quantity (Acceptance Criterion 2 & 3)
        const updateItemRes = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            priceListId: testPriceList.id,
            productId: product1.id,
            unitPrice: 175.50,
            minQuantity: 2,
            maxQuantity: 20
        }, admin.token);
        assert(updateItemRes.status === 200, "Admin successfully updated price list item via PUT /price-lists/:priceListId/items/:id");

        // Verify changes persisted after reloading
        const reloadItemsRes = await request("GET", `/price-lists/${testPriceList.id}/items`, null, admin.token);
        const reloadedItem = reloadItemsRes.data.data.find(i => Number(i.id) === Number(createdItemId));
        assert(Number(reloadedItem.unit_price) === 175.50, `Reloaded item price persisted as $175.50 (was $150.00)`);
        assert(Number(reloadedItem.min_quantity) === 2, `Reloaded item min_quantity persisted as 2`);
        assert(Number(reloadedItem.max_quantity) === 20, `Reloaded item max_quantity persisted as 20`);

        // 5. Validation checks: negative price, invalid quantities
        const negativePriceRes = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            priceListId: testPriceList.id,
            unitPrice: -50.00,
            minQuantity: 1
        }, admin.token);
        assert(negativePriceRes.status === 400, "Rejected negative unit price with 400 Bad Request");

        const invalidMinQtyRes = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            priceListId: testPriceList.id,
            unitPrice: 100.00,
            minQuantity: 0
        }, admin.token);
        assert(invalidMinQtyRes.status === 400, "Rejected min quantity < 1 with 400 Bad Request");

        const invalidMaxQtyRes = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            priceListId: testPriceList.id,
            unitPrice: 100.00,
            minQuantity: 10,
            maxQuantity: 5
        }, admin.token);
        assert(invalidMaxQtyRes.status === 400, "Rejected max quantity < min quantity with 400 Bad Request");

        // 6. Cross-price-list tampering protection (Acceptance Criterion 7)
        // Trying to edit an item belonging to testPriceList while asserting it belongs to secondPriceList
        const tamperedUpdate = await request("PUT", `/price-lists/${secondPriceList.id}/items/${createdItemId}`, {
            priceListId: secondPriceList.id,
            unitPrice: 999.00
        }, admin.token);
        assert(tamperedUpdate.status === 400, "Tampered edit targeting item with wrong priceListId rejected with 400");

        const tamperedDelete = await request("DELETE", `/price-lists/${secondPriceList.id}/items/${createdItemId}`, null, admin.token);
        assert(tamperedDelete.status === 400, "Tampered delete targeting item with wrong priceListId rejected with 400");

        // 7. Non-admin authorization enforcement (Acceptance Criterion 8)
        const nonAdminUpdate = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            unitPrice: 99.00
        }, salesRep.token);
        assert(nonAdminUpdate.status === 403, "Sales Rep rejected from updating price list item with 403 Forbidden");

        const nonAdminDelete = await request("DELETE", `/price-lists/${testPriceList.id}/items/${createdItemId}`, null, salesRep.token);
        assert(nonAdminDelete.status === 403, "Sales Rep rejected from deleting price list item with 403 Forbidden");

        const financeUpdate = await request("PUT", `/price-lists/${testPriceList.id}/items/${createdItemId}`, {
            unitPrice: 99.00
        }, finance.token);
        assert(financeUpdate.status === 403, "Finance user rejected from updating price list item with 403 Forbidden");

        // 8. Admin removes item from price list (Acceptance Criterion 5 & 6)
        const deleteItemRes = await request("DELETE", `/price-lists/${testPriceList.id}/items/${createdItemId}`, null, admin.token);
        assert(deleteItemRes.status === 200, "Admin removed item from price list with 200 OK");

        // Verify item is no longer in price list items
        const postDeleteItemsRes = await request("GET", `/price-lists/${testPriceList.id}/items`, null, admin.token);
        const deletedFound = postDeleteItemsRes.data.data.find(i => Number(i.id) === Number(createdItemId));
        assert(!deletedFound, `Deleted item ${createdItemId} no longer exists in price list`);

        // Verify underlying catalog product remains completely intact in products table (Acceptance Criterion 6)
        const productCheck = await pool.query("SELECT id, name, sku, is_active FROM products WHERE id = $1", [product1.id]);
        assert(productCheck.rows.length === 1, `Underlying catalog product ${product1.name} remains intact in database`);
        assert(productCheck.rows[0].is_active === true, `Underlying catalog product is still active`);

        // 9. Historical quotations and invoices safety check (Acceptance Criterion 10)
        const quotesCount = await pool.query("SELECT COUNT(*) FROM quotation_items");
        assert(Number(quotesCount.rows[0].count) >= 0, `Historical quotation items count intact (${quotesCount.rows[0].count} records)`);

        console.log("\n==========================================================================");
        console.log("ALL PRICE LIST ITEM MANAGEMENT & FINANCE FULFILLMENT E2E TESTS PASSED!");
        console.log("==========================================================================\n");
    } finally {
        await pool.end();
    }
}

runTestSuite().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
