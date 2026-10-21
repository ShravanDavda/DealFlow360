import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", notificationController.getNotifications);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);

export default router;
