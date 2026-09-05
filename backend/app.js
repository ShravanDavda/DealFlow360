import express from "express";
import cors from "cors";
import dotenv from "dotenv";




dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

//imports

import authRoutes from "./routes/authRoutes.js";


// Routes 
app.use("/api/auth", authRoutes);




app.get("/", (req, res) => {
    res.json({
        message: "Backend up and running"
    });
});

export default app;