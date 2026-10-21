import express from "express";
import {
    getPriceLists,
    getPriceList,
    createNewPriceList,
    updateExistingPriceList,
    deactivateExistingPriceList,
    deleteExistingPriceList
} from "../controllers/priceListController.js";

import {
    getItemsForPriceList,
    createNewItem,
    updateExistingItem,
    deleteExistingItem
} from "../controllers/priceListItemController.js";

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

router.get(
    "/:priceListId/items",
    getItemsForPriceList
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

router.delete(
    "/:id",
    deleteExistingPriceList
);

router.post(
    "/:priceListId/items",
    createNewItem
);

router.put(
    "/:priceListId/items/:id",
    updateExistingItem
);

router.delete(
    "/:priceListId/items/:id",
    deleteExistingItem
);

export default router;