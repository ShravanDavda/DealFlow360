import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
    console.log("================================================================================");
    console.log("🚀 INITIALIZING DEALFLOW360 DATABASE FOR DEPLOYMENT / PRODUCTION");
    console.log("================================================================================");
    
    let client;
    try {
        client = await pool.connect();
        const schemaPath = path.join(__dirname, "schema.sql");
        const seedPath = path.join(__dirname, "seed.sql");

        console.log("📄 Reading and applying schema.sql...");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        await client.query(schemaSql);
        console.log("✅ Schema applied successfully.");

        console.log("🌱 Reading and applying seed.sql...");
        const seedSql = fs.readFileSync(seedPath, "utf8");
        await client.query(seedSql);
        console.log("✅ Seed data populated successfully.");

        const usersCount = await client.query("SELECT COUNT(*) FROM users");
        const productsCount = await client.query("SELECT COUNT(*) FROM products");
        const quotesCount = await client.query("SELECT COUNT(*) FROM quotations");

        console.log("\n📊 DATABASE STATUS SUMMARY:");
        console.log(`   - Users:      ${usersCount.rows[0].count}`);
        console.log(`   - Products:   ${productsCount.rows[0].count}`);
        console.log(`   - Quotations: ${quotesCount.rows[0].count}`);
        console.log("\n🎉 Database initialization finished successfully!");
    } catch (err) {
        console.error("❌ Database initialization error:", err);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
        process.exit(0);
    }
}

initDatabase();
