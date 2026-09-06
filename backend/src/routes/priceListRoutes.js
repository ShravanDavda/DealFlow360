import express from "express";

import {
    getPriceLists,
    getPriceList,
    createNewPriceList,
    updateExistingPriceList,
    deactivateExistingPriceList
} from "../controllers/priceListController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    getPriceLists
);

router.get(
    "/:id",
    getPriceList
);

router.use(requireAdmin);

router.post(
    "/",
    createNewPriceList
);

router.put(
    "/:id",
    updateExistingPriceList
);

router.patch(
    "/:id/deactivate",
    deactivateExistingPriceList
);

export default router;