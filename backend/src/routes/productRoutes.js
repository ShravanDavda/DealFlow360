import express from "express";

import {
    getProducts,
    getProduct,
    getNextSku,
    createNewProduct,
    updateExistingProduct,
    deactivateExistingProduct
} from "../controllers/productController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";
import { getRecommendationsForProduct } from "../controllers/productPairingController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/next-sku", authenticateToken, requireAdmin, getNextSku);
router.get("/:id/recommendations", getRecommendationsForProduct);
router.get("/:id", getProduct);

router.post("/", authenticateToken, requireAdmin, createNewProduct);
router.put("/:id", authenticateToken, requireAdmin, updateExistingProduct);
router.patch("/:id/deactivate", authenticateToken, requireAdmin, deactivateExistingProduct);

export default router;