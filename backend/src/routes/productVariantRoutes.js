import express from "express";

import {
    getVariants,
    getVariantsForProduct,
    getVariant,
    createNewVariant,
    updateExistingVariant,
    deactivateExistingVariant
} from "../controllers/productVariantController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    getVariants
);

router.get(
    "/product/:productId",
    getVariantsForProduct
);

router.get(
    "/:id",
    getVariant
);

router.use(requireAdmin);

router.post(
    "/",
    createNewVariant
);

router.put(
    "/:id",
    updateExistingVariant
);

router.patch(
    "/:id/deactivate",
    deactivateExistingVariant
);

export default router;