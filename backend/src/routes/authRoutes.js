import express from "express";

import {
    register,
    login,
    activateCustomerAccount,
    getCurrentUser,
    forgotPassword,
    resendResetOtp,
    verifyResetOtp,
    resetPassword
} from "../controllers/authController.js";

import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/activate-customer", activateCustomerAccount);
router.post("/activate", activateCustomerAccount);

router.post("/forgot-password", forgotPassword);
router.post("/resend-reset-otp", resendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

router.get(
    "/me",
    authenticateToken,
    getCurrentUser
);

export default router;