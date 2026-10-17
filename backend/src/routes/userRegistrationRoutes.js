import express from "express";
import * as controller from "../controllers/userRegistrationController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();
router.use(authenticateToken, requireAdmin);
router.get("/", controller.list);
router.get("/pending/count", controller.count);
router.post("/users", controller.createAdmin);
router.patch("/:id/approve", controller.approve);
router.patch("/:id/reject", controller.reject);

export default router;
