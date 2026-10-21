import express from "express";
import * as approvalController from "../controllers/approvalController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticateToken);
router.use((req, res, next) => {
    if (req.user?.role === "customer") {
        return res.status(403).json({ success: false, message: "Customer accounts are not permitted to access approval workflows" });
    }
    next();
});

router.get("/", approvalController.getApprovals);
router.get("/:approvalId", approvalController.getApprovalDetail);
router.post("/:approvalId/approve", approvalController.approve);
router.post("/:approvalId/reject", approvalController.reject);
router.post("/:approvalId/return", approvalController.returnForRevision);

export default router;
