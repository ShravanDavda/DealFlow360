import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import customerTierRoutes from "./routes/customerTierRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import productVariantRoutes from "./routes/productVariantRoutes.js";
import priceListRoutes from "./routes/priceListRoutes.js";
import priceListItemRoutes from "./routes/priceListItemRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import fulfillmentRoutes from "./routes/fulfillmentRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import customerPortalRoutes from "./routes/customerPortalRoutes.js";
import dealHealthRoutes from "./routes/dealHealthRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import approvalChainRoutes from "./routes/approvalChainRoutes.js";
import subscriptionPlanRoutes from "./routes/subscriptionPlanRoutes.js";
import userRegistrationRoutes from "./routes/userRegistrationRoutes.js";
import productPairingRoutes from "./routes/productPairingRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            const configuredOrigin = process.env.FRONTEND_URL;
            if (
                (configuredOrigin && origin === configuredOrigin) ||
                origin.startsWith("http://localhost:") ||
                origin.startsWith("http://127.0.0.1:")
            ) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true
    })
);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "DealFlow360 API is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/customer-tiers", customerTierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-variants", productVariantRoutes);
app.use("/api/price-lists", priceListRoutes);
app.use("/api/price-list-items", priceListItemRoutes);
app.use("/api/admin/warehouses", warehouseRoutes);
app.use("/api/admin/approval-chains", approvalChainRoutes);
app.use("/api/admin/subscription-plans", subscriptionPlanRoutes);
app.use("/api/admin/user-registrations", userRegistrationRoutes);
app.use("/api/product-pairings", productPairingRoutes);
app.use("/api/admin/product-pairings", productPairingRoutes);

app.use("/api/quotations", quotationRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/fulfillment", fulfillmentRoutes);
app.use("/api", billingRoutes);
app.use("/api/customer", customerPortalRoutes);
app.use("/api/deal-health", dealHealthRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", reportRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route '${req.originalUrl}' not found`
    });
});

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal server error"
    });
});

export default app;