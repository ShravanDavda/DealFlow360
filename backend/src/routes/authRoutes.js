import express from "express";

import {
    register,
    login,
    activateCustomerAccount,
    getCurrentUser,
    googleAuth
} from "../controllers/authController.js";

import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/google", googleAuth);

router.post("/activate-customer", activateCustomerAccount);
router.post("/activate", activateCustomerAccount);

router.get(
    "/me",
    authenticateToken,
    getCurrentUser
);

export default router;