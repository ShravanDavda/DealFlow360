import express from "express";
import * as fulfillmentController from "../controllers/fulfillmentController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireRoles from "../middleware/roleMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireRoles("admin", "finance", "operations"));

router.get("/orders", fulfillmentController.getFulfillmentOrders);
router.get("/orders/:orderId", fulfillmentController.getFulfillmentDetail);
router.post("/orders/:orderId/accept-split", fulfillmentController.acceptSplit);
router.post("/orders/:orderId/manual-override", fulfillmentController.manualOverride);
router.post("/orders/:orderId/consolidate-backorder", fulfillmentController.consolidateBackorder);

export default router;
