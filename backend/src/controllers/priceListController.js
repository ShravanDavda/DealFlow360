import {
    getAllPriceLists,
    getPriceListById,
    createPriceList,
    updatePriceList,
    deactivatePriceList,
    deletePriceList
} from "../services/priceListService.js";

const getPriceLists = async (
    req,
    res
) => {
    try {
        const priceLists =
            await getAllPriceLists();

        res.status(200).json({
            success: true,
            data: priceLists
        });
    } catch (error) {
        console.error(
            "Get price lists error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch price lists"
        });
    }
};

const getPriceList = async (
    req,
    res
) => {
    try {
        const priceList =
            await getPriceListById(
                req.params.id
            );

        if (!priceList) {
            return res.status(404).json({
                success: false,
                message:
                    "Price list not found"
            });
        }

        res.status(200).json({
            success: true,
            data: priceList
        });
    } catch (error) {
        console.error(
            "Get price list error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch price list"
        });
    }
};

const createNewPriceList = async (
    req,
    res
) => {
    try {
        const {
            name,
            description,
            currency,
            isDefault
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message:
                    "Price list name is required"
            });
        }

        const priceList =
            await createPriceList({
                name,
                description,
                currency,
                isDefault
            });

        res.status(201).json({
            success: true,
            message:
                "Price list created successfully",
            data: priceList
        });
    } catch (error) {
        console.error(
            "Create price list error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingPriceList =
    async (req, res) => {
        try {
            const priceList =
                await updatePriceList(
                    req.params.id,
                    req.body
                );

            res.status(200).json({
                success: true,
                message:
                    "Price list updated successfully",
                data: priceList
            });
        } catch (error) {
            console.error(
                "Update price list error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

const deactivateExistingPriceList =
    async (req, res) => {
        try {
            const priceList =
                await deactivatePriceList(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Price list deactivated successfully",
                data: priceList
            });
        } catch (error) {
            console.error(
                "Deactivate price list error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

const deleteExistingPriceList =
    async (req, res) => {
        try {
            const priceList =
                await deletePriceList(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Price list deleted successfully",
                data: priceList
            });
        } catch (error) {
            console.error(
                "Delete price list error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

export {
    getPriceLists,
    getPriceList,
    createNewPriceList,
    updateExistingPriceList,
    deactivateExistingPriceList,
    deleteExistingPriceList
};