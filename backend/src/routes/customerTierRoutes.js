import express from "express";

import {
    getTiers,
    getTier,
    createTier,
    updateTier,
    deactivateTier
} from "../controllers/customerTierController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get("/", getTiers);

router.get("/:id", getTier);

router.post("/", createTier);

router.put("/:id", updateTier);

router.patch("/:id/deactivate", deactivateTier);

export default router;