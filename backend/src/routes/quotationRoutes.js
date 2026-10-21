import express from "express";
import * as quotationController from "../controllers/quotationController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import * as approvalController from "../controllers/approvalController.js";

const router = express.Router();
router.use(authenticateToken);

router.post("/preview", quotationController.previewQuotation);
router.get("/", quotationController.getQuotations);
router.post("/", quotationController.createQuotation);
router.get("/:quotationId", quotationController.getQuotation);
router.put("/:quotationId", quotationController.updateQuotation);
router.patch("/:quotationId", quotationController.updateQuotation);
router.post("/:quotationId/submit", approvalController.submit);
router.get("/:quotationId/approval", approvalController.getApproval);
router.post("/:quotationId/approval/approve", approvalController.approve);
router.post("/:quotationId/approval/reject", approvalController.reject);
router.post("/:quotationId/approval/return", approvalController.returnForRevision);
router.get("/:quotationId/recommendations", quotationController.getRecommendations);

export default router;
