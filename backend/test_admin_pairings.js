import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

let adminToken = "";
let salesRepToken = "";
let testUpsellId = null;
let testCrossSellId = null;
let laptopPro14Id = null;
let laptopPro16Id = null;
let dockingStationId = null;

const results = [];

function record(testNum, name, status, details = "") {
    console.log(`[TEST ${testNum}] ${name}: ${status ? "PASS" : "FAIL"} ${details ? `(${details})` : ""}`);
    results.push({ testNum, name, status: status ? "PASS" : "FAIL", details });
}

async function runTests() {
    console.log("==================================================");
    console.log("RUNNING ADMIN UPSELL / CROSS-SELL MANAGEMENT TESTS");
    console.log("==================================================\n");

    try {
        const p1 = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%Laptop Pro 14%' LIMIT 1");
        laptopPro14Id = p1.rows[0]?.id || 1;

        let p16 = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%Laptop Pro 16%' LIMIT 1");
        if (!p16.rows.length) {
            const ins16 = await pool.query(
                "INSERT INTO products (category_id, sku, name, description, base_cost, unit, tax_percent, is_active) VALUES (1, 'PROD-016', 'Laptop Pro 16', '16-inch laptop', 1450.00, 'Each', 18.00, TRUE) RETURNING id, name"
            );
            laptopPro16Id = ins16.rows[0].id;
        } else {
            laptopPro16Id = p16.rows[0].id;
        }

        const pDock = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%Docking Station%' LIMIT 1");
        dockingStationId = pDock.rows[0]?.id || 3;

        console.log(`Product IDs: Laptop Pro 14 = ${laptopPro14Id}, Laptop Pro 16 = ${laptopPro16Id}, Docking Station = ${dockingStationId}\n`);

        await pool.query(
            "DELETE FROM product_pairings WHERE base_product_id = $1 AND suggested_product_id IN ($2, $3)",
            [laptopPro14Id, laptopPro16Id, dockingStationId]
        );

        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "admin@dealflow360.com", password: "password123" })
            });
            const data = await res.json();
            const token = data.data?.token || data.token;
            if (res.ok && token) {
                adminToken = token;
                record(1, "Admin login", true, `HTTP ${res.status}, token received`);
            } else {
                record(1, "Admin login", false, `HTTP ${res.status}: ${JSON.stringify(data)}`);
            }
        } catch (err) {
            record(1, "Admin login", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();
            const isAdmin = res.ok && (data.data?.role === "admin" || data.user?.role === "admin");
            record(2, "Open Admin page / Verify Admin role", isAdmin, `Role: ${data.data?.role || data.user?.role}`);
        } catch (err) {
            record(2, "Open Admin page / Verify Admin role", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();
            record(3, "Open Upsell/Cross-sell management endpoint", res.ok && data.success, `HTTP ${res.status}, Count: ${data.count}`);
        } catch (err) {
            record(3, "Open Upsell/Cross-sell management endpoint", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/admin/product-pairings`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();
            const hasData = res.ok && Array.isArray(data.data) && data.data.length > 0;
            record(4, "Load existing recommendations", hasData, `Found ${data.data?.length} existing pairings in PostgreSQL`);
        } catch (err) {
            record(4, "Load existing recommendations", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    sourceProductId: laptopPro14Id,
                    recommendedProductId: laptopPro16Id,
                    type: "UPSELL",
                    priority: 1,
                    tag: "Premium Upgrade"
                })
            });
            const data = await res.json();
            testUpsellId = data.data?.id;

            const dbCheck = await pool.query(
                "SELECT * FROM product_pairings WHERE id = $1 AND relationship_type = 'UPSELL' AND is_active = TRUE",
                [testUpsellId]
            );

            const pass = res.status === 201 && dbCheck.rows.length === 1 && data.data?.type === "UPSELL";
            record(5, "Create UPSELL relationship (Laptop Pro 14 -> Laptop Pro 16)", pass, `API: HTTP ${res.status}, DB ID: ${testUpsellId}, Type: ${dbCheck.rows[0]?.relationship_type}`);
        } catch (err) {
            record(5, "Create UPSELL relationship", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    sourceProductId: laptopPro14Id,
                    recommendedProductId: dockingStationId,
                    type: "CROSS_SELL",
                    priority: 1,
                    tag: "Essential Accessory"
                })
            });
            const data = await res.json();
            testCrossSellId = data.data?.id;

            const dbCheck = await pool.query(
                "SELECT * FROM product_pairings WHERE id = $1 AND relationship_type = 'CROSS_SELL' AND is_active = TRUE",
                [testCrossSellId]
            );

            const pass = res.status === 201 && dbCheck.rows.length === 1 && data.data?.type === "CROSS_SELL";
            record(6, "Create CROSS-SELL relationship (Laptop Pro 14 -> Docking Station)", pass, `API: HTTP ${res.status}, DB ID: ${testCrossSellId}, Type: ${dbCheck.rows[0]?.relationship_type}`);
        } catch (err) {
            record(6, "Create CROSS-SELL relationship", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings/${testCrossSellId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    priority: 2,
                    tag: "Top Productivity Accessory"
                })
            });
            const data = await res.json();

            const dbCheck = await pool.query(
                "SELECT priority, tag, updated_at FROM product_pairings WHERE id = $1",
                [testCrossSellId]
            );

            const pass = res.status === 200 && dbCheck.rows[0]?.priority === 2 && dbCheck.rows[0]?.tag === "Top Productivity Accessory";
            record(7, "Edit relationship (priority -> 2, tag -> updated)", pass, `HTTP ${res.status}, DB Priority: ${dbCheck.rows[0]?.priority}`);
        } catch (err) {
            record(7, "Edit relationship", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings/${testUpsellId}/deactivate`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();

            const dbCheck = await pool.query(
                "SELECT is_active FROM product_pairings WHERE id = $1",
                [testUpsellId]
            );

            const pass = res.status === 200 && dbCheck.rows[0]?.is_active === false;
            record(8, "Deactivate/delete relationship", pass, `HTTP ${res.status}, DB is_active: ${dbCheck.rows[0]?.is_active}`);
        } catch (err) {
            record(8, "Deactivate/delete relationship", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    sourceProductId: laptopPro14Id,
                    recommendedProductId: dockingStationId,
                    type: "CROSS_SELL",
                    priority: 1
                })
            });
            const data = await res.json();
            const pass = res.status === 400 && data.success === false;
            record(9, "Attempt duplicate relationship", pass, `Expected HTTP 400, got HTTP ${res.status} (${data.message})`);
        } catch (err) {
            record(9, "Attempt duplicate relationship", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    sourceProductId: laptopPro14Id,
                    recommendedProductId: laptopPro14Id,
                    type: "UPSELL",
                    priority: 1
                })
            });
            const data = await res.json();
            const pass = res.status === 400 && data.success === false;
            record(10, "Attempt source product = recommended product", pass, `Expected HTTP 400, got HTTP ${res.status} (${data.message})`);
        } catch (err) {
            record(10, "Attempt source product = recommended product", false, err.message);
        }

        try {
            const loginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "salesrep1@dealflow360.com", password: "password123" })
            });
            const loginData = await loginRes.json();
            salesRepToken = loginData.data?.token || loginData.token;

            const mutateRes = await fetch(`${BASE_URL}/product-pairings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${salesRepToken}`
                },
                body: JSON.stringify({
                    sourceProductId: laptopPro14Id,
                    recommendedProductId: dockingStationId,
                    type: "UPSELL",
                    priority: 1
                })
            });
            const mutateData = await mutateRes.json();
            const pass = mutateRes.status === 403 && mutateData.success === false;
            record(11, "Sales Rep attempt Admin mutation (RBAC verification)", pass, `Expected HTTP 403, got HTTP ${mutateRes.status} (${mutateData.message})`);
        } catch (err) {
            record(11, "Sales Rep attempt Admin mutation (RBAC verification)", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings/recommendations/${laptopPro14Id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();
            const recs = data.data?.recommendations || [];
            const hasDockingStation = recs.some((r) => Number(r.productId) === Number(dockingStationId));
            const pass = res.status === 200 && data.success && hasDockingStation;
            record(12, "Verify active recommendations endpoint returns DB recommendations", pass, `HTTP ${res.status}, Count: ${recs.length}, Contains Docking Station: ${hasDockingStation}`);
        } catch (err) {
            record(12, "Verify active recommendations endpoint returns DB recommendations", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/product-pairings/recommendations/${laptopPro14Id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();
            const recs = data.data?.recommendations || [];
            const containsInactiveUpsell = recs.some((r) => Number(r.productId) === Number(laptopPro16Id));
            const pass = res.status === 200 && !containsInactiveUpsell;
            record(13, "Verify inactive recommendations are excluded", pass, `Deactivated Laptop Pro 16 excluded: ${!containsInactiveUpsell}`);
        } catch (err) {
            record(13, "Verify inactive recommendations are excluded", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/quotations/1`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const data = await res.json();

            const recsRes = await fetch(`${BASE_URL}/quotations/1/recommendations`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const recsData = await recsRes.json();

            const pass = res.status === 200 && data.success && recsRes.status === 200 && Array.isArray(recsData.data);
            record(14, "Verify existing quotation functionality still works", pass, `Quotation 1: HTTP ${res.status}, Recommendations: HTTP ${recsRes.status}, Suggestions: ${recsData.data?.length}`);
        } catch (err) {
            record(14, "Verify existing quotation functionality still works", false, err.message);
        }

        try {
            const res = await fetch(`${BASE_URL}/quotations/preview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    customerId: 1,
                    priceListId: 1,
                    items: [
                        { productId: dockingStationId, quantity: 2, discountPercent: 10 }
                    ]
                })
            });
            const data = await res.json();
            const pass = res.status === 200 && (data.success || data.subtotal || data.totalAmount);
            record(15, "Verify existing pricing/risk functionality still works", pass, `Preview HTTP ${res.status}, Total: ${data.totalAmount || data.data?.totalAmount}`);
        } catch (err) {
            record(15, "Verify existing pricing/risk functionality still works", false, err.message);
        }

    } catch (globalErr) {
        console.error("Global Test Error:", globalErr);
    } finally {
        console.log("\n==================================================");
        console.log("TEST SUMMARY");
        console.log("==================================================");
        const passedCount = results.filter((r) => r.status === "PASS").length;
        const failedCount = results.filter((r) => r.status === "FAIL").length;
        console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
        console.log("==================================================");

        await pool.end();
        process.exit(failedCount > 0 ? 1 : 0);
    }
}

runTests();
