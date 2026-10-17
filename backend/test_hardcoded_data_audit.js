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

async function runAuditSuite() {
    console.log("==================================================");
    console.log("STARTING HARDCODED / MOCK BUSINESS DATA AUDIT SUITE");
    console.log("==================================================\n");

    try {
        const loginRes = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
        assert(loginRes.status === 200, "Admin login successful (HTTP 200)");
        const adminToken = loginRes.data.data.token;
        const authHeader = { Authorization: `Bearer ${adminToken}` };

        console.log("\n--- TEST 1: Products API & PostgreSQL Source of Truth ---");
        const productsRes = await request("GET", "/products", null, authHeader);
        assert(productsRes.status === 200, "GET /api/products returns HTTP 200");
        const apiProducts = productsRes.data.data;
        assert(Array.isArray(apiProducts) && apiProducts.length > 0, `Products returned: ${apiProducts.length}`);

        const dbProductCount = await pool.query("SELECT COUNT(*)::int FROM products");
        assert(apiProducts.length === dbProductCount.rows[0].count, `API product count (${apiProducts.length}) matches PostgreSQL products count (${dbProductCount.rows[0].count})`);

        const laptop = apiProducts.find(p => p.sku === "PROD-001");
        assert(laptop, "Laptop Pro 14 (PROD-001) found in products");
        assert(Number(laptop.price) === 1200, `Laptop Pro 14 price is 1200 from price list (not base_cost * 1.4 = ${850 * 1.4})`);

        const singleProdRes = await request("GET", `/products/${laptop.id}`, null, authHeader);
        assert(singleProdRes.status === 200, `GET /api/products/${laptop.id} returns HTTP 200`);
        const prodDetail = singleProdRes.data.data;
        assert(prodDetail.sku === "PROD-001", "Product SKU matches");
        assert(typeof prodDetail.quantityOnHand === "number", `Real inventory quantityOnHand returned: ${prodDetail.quantityOnHand}`);

        console.log("\n--- TEST 2: Reports API & Computed Metrics ---");
        const reportsRes = await request("GET", "/reports", null, authHeader);
        assert(reportsRes.status === 200, "GET /api/reports returns HTTP 200");
        const reportData = reportsRes.data.data;
        assert(reportData.metrics, "Report metrics object present");

        const dbQuotesThisMonth = await pool.query("SELECT COUNT(DISTINCT id)::int FROM quotations WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP)");
        assert(reportData.metrics.quotesCreated === dbQuotesThisMonth.rows[0].count, `quotesCreated (${reportData.metrics.quotesCreated}) matches PostgreSQL quotes count (${dbQuotesThisMonth.rows[0].count})`);
        assert(reportData.metrics.quotesCreated !== 148, "quotesCreated is NOT hardcoded 148");

        assert(typeof reportData.metrics.avgApprovalTime === "string" && reportData.metrics.avgApprovalTime.includes("hours"), `avgApprovalTime formatted: ${reportData.metrics.avgApprovalTime}`);

        const dbProductsList = await pool.query("SELECT name FROM products WHERE is_active = TRUE ORDER BY name ASC");
        assert(reportData.filters.products.length === dbProductsList.rows.length + 1, `Report product filter options (${reportData.filters.products.length}) matches DB active products + 'All Products'`);
        assert(reportData.filters.products[0] === "All Products", "First product filter option is 'All Products'");

        console.log("\n--- TEST 3: Dynamic CSV Export from Database ---");
        const csvRes = await request("GET", "/reports/export-xls", null, authHeader);
        assert(csvRes.status === 200, "GET /api/reports/export-xls returns HTTP 200");
        assert(csvRes.contentType.includes("text/csv"), "Content-Type is text/csv");
        assert(csvRes.data.startsWith("Quotation,Customer,Amount,Status,Risk\n"), "CSV header format is correct");

        const csvLines = csvRes.data.trim().split("\n");
        const dataRowsCount = csvLines.length - 1;
        assert(dataRowsCount === reportData.metrics.quotesCreated, `CSV rows count (${dataRowsCount}) matches filtered quotes count (${reportData.metrics.quotesCreated})`);

        console.log("\n--- TEST 4: Dashboard Summary ---");
        const dashRes = await request("GET", "/dashboard/dashboard-summary", null, authHeader);
        assert(dashRes.status === 200, "GET /api/dashboard/dashboard-summary returns HTTP 200");
        const dashData = dashRes.data.data;

        const dbPendingApprovals = await pool.query("SELECT COUNT(*)::int FROM quotations WHERE status = 'Pending Approval'");
        const dbOpenQuotes = await pool.query("SELECT COUNT(*)::int FROM quotations WHERE status IN ('Draft', 'Under Negotiation', 'Pending Approval')");
        const dbAtRisk = await pool.query("SELECT COUNT(*)::int FROM quotations WHERE blended_risk_score = 'HIGH' OR total_discount > 1000");

        assert(dashData.pendingApprovals === dbPendingApprovals.rows[0].count, `pendingApprovals (${dashData.pendingApprovals}) matches DB (${dbPendingApprovals.rows[0].count})`);
        assert(dashData.openQuotations === dbOpenQuotes.rows[0].count, `openQuotations (${dashData.openQuotations}) matches DB (${dbOpenQuotes.rows[0].count})`);
        assert(dashData.atRiskDeals === dbAtRisk.rows[0].count, `atRiskDeals (${dashData.atRiskDeals}) matches DB (${dbAtRisk.rows[0].count})`);
        assert(Array.isArray(dashData.recentActivities), "recentActivities is array");

        console.log("\n--- TEST 5: Deal Health Anomalies ---");
        const dhRes = await request("GET", "/deal-health", null, authHeader);
        assert(dhRes.status === 200, "GET /api/deal-health returns HTTP 200");
        const dhData = dhRes.data.data;

        const dbAnomalies = await pool.query("SELECT COUNT(*)::int FROM deal_health_anomalies");
        assert(dhData.anomalies.length === dbAnomalies.rows[0].count, `Anomalies count (${dhData.anomalies.length}) matches DB (${dbAnomalies.rows[0].count})`);

        console.log("\n--- TEST 6: Subscriptions API ---");
        const subRes = await request("GET", "/subscriptions", null, authHeader);
        assert(subRes.status === 200, "GET /api/subscriptions returns HTTP 200");
        const subs = subRes.data.data;
        const dbSubs = await pool.query("SELECT COUNT(*)::int FROM subscriptions");
        assert(subs.length === dbSubs.rows[0].count, `Subscriptions count (${subs.length}) matches DB (${dbSubs.rows[0].count})`);

        console.log("\n==================================================");
        console.log("🎉 ALL AUDIT VERIFICATIONS PASSED (100% POSTGRESQL TRUTH)");
        console.log("==================================================");
    } catch (err) {
        console.error("\n💥 AUDIT FAILED:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runAuditSuite();
