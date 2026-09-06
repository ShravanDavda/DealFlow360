import express from "express";

import {
    getCategories,
    getCategory,
    createNewCategory,
    updateExistingCategory,
    deactivateExistingCategory
} from "../controllers/categoryController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get(
    "/",
    getCategories
);

router.get(
    "/:id",
    getCategory
);

router.post(
    "/",
    createNewCategory
);

router.put(
    "/:id",
    updateExistingCategory
);

router.patch(
    "/:id/deactivate",
    deactivateExistingCategory
);

export default router;