import {
    getAllCustomerTiers,
    getCustomerTierById,
    createCustomerTier,
    updateCustomerTier,
    deactivateCustomerTier
} from "../services/customerTierService.js";

const getTiers = async (req, res) => {
    try {
        const tiers = await getAllCustomerTiers();

        res.status(200).json({
            success: true,
            data: tiers
        });
    } catch (error) {
        console.error("Get customer tiers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer tiers"
        });
    }
};

const getTier = async (req, res) => {
    try {
        const tier = await getCustomerTierById(
            req.params.id
        );

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: "Customer tier not found"
            });
        }

        res.status(200).json({
            success: true,
            data: tier
        });
    } catch (error) {
        console.error("Get customer tier error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer tier"
        });
    }
};

const createTier = async (req, res) => {
    try {
        const {
            name,
            description,
            defaultDiscountCeiling
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Tier name is required"
            });
        }

        if (
            defaultDiscountCeiling === undefined ||
            defaultDiscountCeiling === null
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Default discount ceiling is required"
            });
        }

        const tier = await createCustomerTier({
            name,
            description,
            defaultDiscountCeiling
        });

        res.status(201).json({
            success: true,
            message: "Customer tier created successfully",
            data: tier
        });
    } catch (error) {
        console.error("Create customer tier error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateTier = async (req, res) => {
    try {
        const tier = await updateCustomerTier(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Customer tier updated successfully",
            data: tier
        });
    } catch (error) {
        console.error("Update customer tier error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deactivateTier = async (req, res) => {
    try {
        const tier = await deactivateCustomerTier(
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: "Customer tier deactivated successfully",
            data: tier
        });
    } catch (error) {
        console.error(
            "Deactivate customer tier error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export {
    getTiers,
    getTier,
    createTier,
    updateTier,
    deactivateTier
};