import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes will be added here
// Example:
// import authRoutes from "./routes/authRoute.js";
// app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend up and running"
    });
});

export default app;