import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const poolConfig = hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "dealflow360",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

pool.on("connect", () => {
    console.log("PostgreSQL connected");
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});

export default pool;