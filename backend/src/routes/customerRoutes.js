import express from "express";

import {
    getCustomers,
    getCustomer,
    createNewCustomer,
    updateExistingCustomer,
    deactivateExistingCustomer,
    activateExistingCustomer,
    reissueCustomerActivation
} from "../controllers/customerController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getCustomers);

router.get("/:id", getCustomer);

router.post("/", requireAdmin, createNewCustomer);

router.post("/:id/reissue-activation", requireAdmin, reissueCustomerActivation);

router.put("/:id", requireAdmin, updateExistingCustomer);

router.patch(
    "/:id/deactivate",
    requireAdmin,
    deactivateExistingCustomer
);

router.patch(
    "/:id/activate",
    requireAdmin,
    activateExistingCustomer
);

export default router;