import express from "express";
import * as reportController from "../controllers/reportController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/dashboard-summary", authenticateToken, requireRoles("admin", "sales_rep", "sales_manager"), reportController.getDashboardSummary);
router.get("/sales-rep", authenticateToken, requireRoles("sales_rep"), reportController.getSalesRepDashboard);
router.get("/sales-manager", authenticateToken, requireRoles("sales_manager"), reportController.getSalesManagerDashboard);
router.get("/", authenticateToken, requireRoles("admin", "sales_manager"), reportController.getReports);
router.get("/export/pdf", authenticateToken, requireRoles("admin", "sales_manager"), reportController.exportPdf);
router.get("/export-pdf", authenticateToken, requireRoles("admin", "sales_manager"), reportController.exportPdf);
router.get("/export/xls", authenticateToken, requireRoles("admin", "sales_manager"), reportController.exportXls);
router.get("/export-xls", authenticateToken, requireRoles("admin", "sales_manager"), reportController.exportXls);

export default router;
