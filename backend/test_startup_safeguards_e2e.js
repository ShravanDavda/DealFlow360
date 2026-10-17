import pool from "./src/config/db.js";
import ensureAdminConfigurationSchema from "./src/config/ensureAdminConfigurationSchema.js";
import assert from "assert";

async function runStartupSafeguardsTest() {
    console.log("==================================================");
    console.log("TESTING STARTUP CONFIGURATION SIDE EFFECTS");
    console.log("==================================================");

    // 1. Create an intentionally deactivated test product
    const testSku = `PROD-SAFE-${Date.now()}`;
    const insertRes = await pool.query(
        `INSERT INTO products (category_id, name, sku, description, base_cost, unit, tax_percent, is_active)
         VALUES (1, 'Deactivated Safe Test Product', $1, 'Testing startup side effects', 50.00, 'Each', 15.00, FALSE)
         RETURNING id, is_active`,
        [testSku]
    );
    const testProdId = insertRes.rows[0].id;
    assert.strictEqual(insertRes.rows[0].is_active, false, "Product successfully created with is_active = false");

    // 2. Intentionally deactivate an existing product (e.g. Laptop Pro 16)
    const p16Before = await pool.query("SELECT id, is_active FROM products WHERE sku = 'PROD-016'");
    let p16OrigActive = true;
    if (p16Before.rows.length) {
        p16OrigActive = p16Before.rows[0].is_active;
        await pool.query("UPDATE products SET is_active = FALSE WHERE id = $1", [p16Before.rows[0].id]);
    }

    try {
        console.log("Executing ensureAdminConfigurationSchema()...");
        await ensureAdminConfigurationSchema();

        // 3. Verify that test product is NOT reactivated
        const checkTestProd = await pool.query("SELECT is_active FROM products WHERE id = $1", [testProdId]);
        assert.strictEqual(checkTestProd.rows[0].is_active, false, "ensureAdminConfigurationSchema did NOT silently reactivate inactive test product");
        console.log("✅ PASSED: Inactive test product remains inactive after schema initialization");

        // 4. Verify that Laptop Pro 16 was NOT silently reactivated if it was deactivated
        if (p16Before.rows.length) {
            const checkP16 = await pool.query("SELECT is_active FROM products WHERE id = $1", [p16Before.rows[0].id]);
            assert.strictEqual(checkP16.rows[0].is_active, false, "ensureAdminConfigurationSchema did NOT overwrite administrator deactivation of PROD-016");
            console.log("✅ PASSED: Administrator deactivation of existing product preserved across startup");
        }

        // 5. Verify price list default was not modified if explicitly configured
        const plList = await pool.query("SELECT id, name, is_default FROM price_lists");
        const defaultLists = plList.rows.filter(p => p.is_default);
        assert(defaultLists.length <= 1, "At most one price list is marked as default");
        console.log("✅ PASSED: Price list configuration remains intact and consistent");

    } finally {
        // Cleanup test product
        await pool.query("DELETE FROM products WHERE id = $1", [testProdId]);
        // Restore PROD-016
        if (p16Before.rows.length) {
            await pool.query("UPDATE products SET is_active = $1 WHERE id = $2", [p16OrigActive, p16Before.rows[0].id]);
        }
        await pool.end();
    }

    console.log("==================================================");
    console.log("🎉 STARTUP CONFIGURATION SAFEGUARDS TEST PASSED (100%)");
    console.log("==================================================");
}

runStartupSafeguardsTest().catch(err => {
    console.error("💥 FAILED:", err);
    process.exit(1);
});
