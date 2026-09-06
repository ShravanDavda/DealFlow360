import express from "express";
import * as controller from "../controllers/warehouseController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireAdmin);
router.get("/", controller.listWarehouses);
router.get("/:id", controller.getWarehouse);
router.post("/", controller.createWarehouse);
router.put("/:id", controller.updateWarehouse);
router.put("/:id/inventory", controller.upsertInventory);
router.post("/:id/inventory", controller.upsertInventory);
router.patch("/:id/deactivate", controller.deactivateWarehouse);
export default router;