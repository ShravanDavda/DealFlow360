import express from "express";

import {
    getItems,
    getItemsForPriceList,
    getItem,
    createNewItem,
    updateExistingItem,
    deactivateExistingItem
} from "../controllers/priceListItemController.js";

import authenticateToken from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    getItems
);

router.get(
    "/price-list/:priceListId",
    getItemsForPriceList
);

router.get(
    "/:id",
    getItem
);

router.use(requireAdmin);

router.post(
    "/",
    createNewItem
);

router.put(
    "/:id",
    updateExistingItem
);

router.patch(
    "/:id/deactivate",
    deactivateExistingItem
);

export default router;