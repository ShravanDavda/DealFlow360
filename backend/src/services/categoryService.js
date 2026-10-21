import pool from "../config/db.js";

const getAllCategories = async () => {
    const result = await pool.query(`
        SELECT
            id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        FROM categories
        ORDER BY id ASC
    `);

    return result.rows;
};

const getCategoryById = async (id) => {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        FROM categories
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createCategory = async ({
    name,
    description
}) => {
    const existingCategory = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE LOWER(name) = LOWER($1)
        `,
        [name]
    );

    if (existingCategory.rows.length > 0) {
        throw new Error(
            "Category already exists"
        );
    }

    const result = await pool.query(
        `
        INSERT INTO categories (
            name,
            description
        )
        VALUES ($1, $2)
        RETURNING
            id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        `,
        [
            name,
            description || null
        ]
    );

    return result.rows[0];
};

const updateCategory = async (
    id,
    {
        name,
        description,
        isActive
    }
) => {
    const existingCategory =
        await getCategoryById(id);

    if (!existingCategory) {
        throw new Error(
            "Category not found"
        );
    }

    const result = await pool.query(
        `
        UPDATE categories
        SET
            name = $1,
            description = $2,
            is_active = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING
            id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        `,
        [
            name ?? existingCategory.name,
            description ??
                existingCategory.description,
            isActive ??
                existingCategory.is_active,
            id
        ]
    );

    return result.rows[0];
};

const deactivateCategory = async (id) => {
    const existingCategory =
        await getCategoryById(id);

    if (!existingCategory) {
        throw new Error(
            "Category not found"
        );
    }

    const result = await pool.query(
        `
        UPDATE categories
        SET
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            name,
            is_active
        `,
        [id]
    );

    return result.rows[0];
};

export {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deactivateCategory
};