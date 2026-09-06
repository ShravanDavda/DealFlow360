import express from "express";
import * as customerPortalController from "../controllers/customerPortalController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/quotes", customerPortalController.getCustomerQuotes);
router.get("/quotes/:quoteId", customerPortalController.getCustomerQuote);
router.get("/quotes/:quoteId/history", customerPortalController.getNegotiationHistory);

router.post("/quotes/:quoteId/negotiation", customerPortalController.submitNegotiation);
router.post("/quotes/:quoteId/negotiate", customerPortalController.submitNegotiation);
router.post("/quotes/:quoteId/confirm", customerPortalController.confirmQuote);

export default router;
