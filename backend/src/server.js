import dotenv from "dotenv";
import app from "./app.js";
import pool from "./config/db.js";
import ensureAdminConfigurationSchema from "./config/ensureAdminConfigurationSchema.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await pool.query("SELECT NOW()");
        await ensureAdminConfigurationSchema();

        console.log("Database connection verified");

        app.listen(PORT, () => {
            console.log(`DealFlow360 server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();