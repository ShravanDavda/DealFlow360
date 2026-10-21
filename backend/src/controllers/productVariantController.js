import {
    getAllProductVariants,
    getProductVariants,
    getProductVariantById,
    createProductVariant,
    updateProductVariant,
    deactivateProductVariant
} from "../services/productVariantService.js";

const getVariants = async (req, res) => {
    try {
        const variants =
            await getAllProductVariants();

        res.status(200).json({
            success: true,
            data: variants
        });
    } catch (error) {
        console.error(
            "Get product variants error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch product variants"
        });
    }
};

const getVariantsForProduct = async (
    req,
    res
) => {
    try {
        const variants =
            await getProductVariants(
                req.params.productId
            );

        res.status(200).json({
            success: true,
            data: variants
        });
    } catch (error) {
        console.error(
            "Get product variants error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch product variants"
        });
    }
};

const getVariant = async (req, res) => {
    try {
        const variant =
            await getProductVariantById(
                req.params.id
            );

        if (!variant) {
            return res.status(404).json({
                success: false,
                message:
                    "Product variant not found"
            });
        }

        res.status(200).json({
            success: true,
            data: variant
        });
    } catch (error) {
        console.error(
            "Get product variant error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch product variant"
        });
    }
};

const createNewVariant = async (
    req,
    res
) => {
    try {
        const {
            productId,
            variantName,
            sku,
            attributes,
            additionalCost
        } = req.body;

        if (
            !productId ||
            !variantName ||
            !sku
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Product, variant name and SKU are required"
            });
        }

        const variant =
            await createProductVariant({
                productId,
                variantName,
                sku,
                attributes,
                additionalCost
            });

        res.status(201).json({
            success: true,
            message:
                "Product variant created successfully",
            data: variant
        });
    } catch (error) {
        console.error(
            "Create product variant error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingVariant = async (
    req,
    res
) => {
    try {
        const variant =
            await updateProductVariant(
                req.params.id,
                req.body
            );

        res.status(200).json({
            success: true,
            message:
                "Product variant updated successfully",
            data: variant
        });
    } catch (error) {
        console.error(
            "Update product variant error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deactivateExistingVariant =
    async (req, res) => {
        try {
            const variant =
                await deactivateProductVariant(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Product variant deactivated successfully",
                data: variant
            });
        } catch (error) {
            console.error(
                "Deactivate product variant error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

export {
    getVariants,
    getVariantsForProduct,
    getVariant,
    createNewVariant,
    updateExistingVariant,
    deactivateExistingVariant
};