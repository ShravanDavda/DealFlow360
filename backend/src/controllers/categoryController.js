import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deactivateCategory
} from "../services/categoryService.js";

const getCategories = async (
    req,
    res
) => {
    try {
        const categories =
            await getAllCategories();

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error(
            "Get categories error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch categories"
        });
    }
};

const getCategory = async (
    req,
    res
) => {
    try {
        const category =
            await getCategoryById(
                req.params.id
            );

        if (!category) {
            return res.status(404).json({
                success: false,
                message:
                    "Category not found"
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error(
            "Get category error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch category"
        });
    }
};

const createNewCategory = async (
    req,
    res
) => {
    try {
        const {
            name,
            description
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message:
                    "Category name is required"
            });
        }

        const category =
            await createCategory({
                name,
                description
            });

        res.status(201).json({
            success: true,
            message:
                "Category created successfully",
            data: category
        });
    } catch (error) {
        console.error(
            "Create category error:",
            error
        );

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingCategory =
    async (req, res) => {
        try {
            const category =
                await updateCategory(
                    req.params.id,
                    req.body
                );

            res.status(200).json({
                success: true,
                message:
                    "Category updated successfully",
                data: category
            });
        } catch (error) {
            console.error(
                "Update category error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

const deactivateExistingCategory =
    async (req, res) => {
        try {
            const category =
                await deactivateCategory(
                    req.params.id
                );

            res.status(200).json({
                success: true,
                message:
                    "Category deactivated successfully",
                data: category
            });
        } catch (error) {
            console.error(
                "Deactivate category error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

export {
    getCategories,
    getCategory,
    createNewCategory,
    updateExistingCategory,
    deactivateExistingCategory
};