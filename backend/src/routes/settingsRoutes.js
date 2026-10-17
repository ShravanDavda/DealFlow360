import express from "express";
import * as settingsController from "../controllers/settingsController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get("/discount-approval", settingsController.getDiscountApprovalSettings);
router.put("/discount-approval", settingsController.updateDiscountApprovalSettings);

export default router;
