import {
    getAllPriceListItems,
    getPriceListItems,
    getPriceListItemById,
    createPriceListItem,
    updatePriceListItem,
    deactivatePriceListItem
} from "../services/priceListItemService.js";

const getItems = async (req, res) => {
    try {
        const items =
            await getAllPriceListItems();

        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error(
            "Get price list items error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch price list items"
        });
    }
};

const getItemsForPriceList = async (
    req,
    res
) => {
    try {
        const items =
            await getPriceListItems(
                req.params.priceListId
            );

        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error(
            "Get price list items error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch price list items"
        });
    }
};

const getItem = async (req, res) => {
    try {
        const item =
            await getPriceListItemById(
                req.params.id
            );

        if (!item) {
            return res.status(404).json({
                success: false,
                message:
                    "Price list item not found"
            });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error(
            "Get price list item error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch price list item"
        });
    }
};

const createNewItem = async (
    req,
    res
) => {
    try {
        const {
            priceListId,
            productId,
            productVariantId,
            unitPrice,
            minQuantity,
            maxQuantity
        } = req.body;

        if (
            !priceListId ||
            !productId ||
            unitPrice === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Price list, product and unit price are required"
            });
        }

        const item =
            await createPriceListItem({
                priceListId,
                productId,
                productVariantId,
                unitPrice,
                minQuantity,
                maxQuantity
            });

        res.status(201).json({
            success: true,
            message:
                "Price list item created successfully",
            data: item
        });
    } catch (error) {
        console.error(
            "Create price list item error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingItem = async (
    req,
    res
) => {
    try {
        const item =
            await updatePriceListItem(
                req.params.id,
                req.body
            );

        res.status(200).json({
            success: true,
            message:
                "Price list item updated successfully",
            data: item
        });
    } catch (error) {
        console.error(
            "Update price list item error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deactivateExistingItem =
    async (req, res) => {
        try {
            const item =
                await deactivatePriceListItem(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Price list item deactivated successfully",
                data: item
            });
        } catch (error) {
            console.error(
                "Deactivate price list item error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

export {
    getItems,
    getItemsForPriceList,
    getItem,
    createNewItem,
    updateExistingItem,
    deactivateExistingItem
};