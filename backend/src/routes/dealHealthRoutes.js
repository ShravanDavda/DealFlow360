import express from "express";
import * as dealHealthController from "../controllers/dealHealthController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authenticateToken, requireRoles("admin", "sales_manager"));

router.get("/", dealHealthController.getDealHealth);
router.post("/:dealId/escalate", dealHealthController.escalate);
router.post("/:dealId/nudge", dealHealthController.nudge);

export default router;
