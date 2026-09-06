import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deactivateProduct
} from "../services/productService.js";

const getProducts = async (req, res) => {
    try {
        const products =
            await getAllProducts();

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error(
            "Get products error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch products"
        });
    }
};

const getProduct = async (req, res) => {
    try {
        const product =
            await getProductById(
                req.params.id
            );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error(
            "Get product error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch product"
        });
    }
};

const createNewProduct = async (
    req,
    res
) => {
    try {
        const {
            categoryId,
            name,
            sku,
            description,
            baseCost,
            unit,
            taxPercent
        } = req.body;

        if (
            !categoryId ||
            !name ||
            !sku
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Category, product name and SKU are required"
            });
        }

        const product =
            await createProduct({
                categoryId,
                name,
                sku,
                description,
                baseCost,
                unit,
                taxPercent
            });

        res.status(201).json({
            success: true,
            message:
                "Product created successfully",
            data: product
        });
    } catch (error) {
        console.error(
            "Create product error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingProduct = async (
    req,
    res
) => {
    try {
        const product =
            await updateProduct(
                req.params.id,
                req.body
            );

        res.status(200).json({
            success: true,
            message:
                "Product updated successfully",
            data: product
        });
    } catch (error) {
        console.error(
            "Update product error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deactivateExistingProduct =
    async (req, res) => {
        try {
            const product =
                await deactivateProduct(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Product deactivated successfully",
                data: product
            });
        } catch (error) {
            console.error(
                "Deactivate product error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

export {
    getProducts,
    getProduct,
    createNewProduct,
    updateExistingProduct,
    deactivateExistingProduct
};