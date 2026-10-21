import express from "express";
import * as controller from "../controllers/productPairingController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", controller.listPairings);
router.get("/recommendations/:productId", controller.getRecommendationsForProduct);
router.get("/:id", controller.getPairing);

router.post("/", requireAdmin, controller.createPairing);
router.put("/:id", requireAdmin, controller.updatePairing);
router.patch("/:id", requireAdmin, controller.updatePairing);
router.patch("/:id/deactivate", requireAdmin, controller.deactivatePairing);
router.delete("/:id", requireAdmin, controller.deletePairing);

export default router;
