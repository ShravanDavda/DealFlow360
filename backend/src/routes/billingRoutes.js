import express from "express";
import * as billingController from "../controllers/billingController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireRoles from "../middleware/roleMiddleware.js";

const router = express.Router();
const billingAccess = [authenticateToken, requireRoles("admin", "finance", "operations")];

router.get("/subscriptions", billingAccess, billingController.getSubscriptions);
router.get("/subscriptions/:subscriptionId", billingAccess, billingController.getSubscriptionDetail);
router.patch("/subscriptions/:subscriptionId", billingAccess, billingController.modifySubscription);
router.post("/subscriptions/:subscriptionId/cancel", billingAccess, billingController.cancelSubscription);

router.get("/invoices", billingAccess, billingController.getInvoices);
router.post("/invoices/generate", billingAccess, billingController.generateInvoice);
router.get("/invoices/:invoiceId", billingAccess, billingController.getInvoiceDetail);
router.post("/invoices/:invoiceId/payment", billingAccess, billingController.recordPayment);

export default router;
