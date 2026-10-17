import pool from "../config/db.js";

const getAllCustomerTiers = async () => {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            default_discount_ceiling,
            is_active,
            created_at,
            updated_at
        FROM customer_tiers
        ORDER BY id ASC
        `
    );

    return result.rows;
};

const getCustomerTierById = async (id) => {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            default_discount_ceiling,
            is_active,
            created_at,
            updated_at
        FROM customer_tiers
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createCustomerTier = async ({
    name,
    description,
    defaultDiscountCeiling
}) => {
    const existingTier = await pool.query(
        `
        SELECT id
        FROM customer_tiers
        WHERE LOWER(name) = LOWER($1)
        `,
        [name]
    );

    if (existingTier.rows.length > 0) {
        throw new Error("Customer tier already exists");
    }

    const result = await pool.query(
        `
        INSERT INTO customer_tiers (
            name,
            description,
            default_discount_ceiling
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            name,
            description,
            default_discount_ceiling,
            is_active,
            created_at,
            updated_at
        `,
        [
            name,
            description || null,
            defaultDiscountCeiling
        ]
    );

    return result.rows[0];
};

const updateCustomerTier = async (
    id,
    {
        name,
        description,
        defaultDiscountCeiling,
        isActive
    }
) => {
    const existingTier = await getCustomerTierById(id);

    if (!existingTier) {
        throw new Error("Customer tier not found");
    }

    const result = await pool.query(
        `
        UPDATE customer_tiers
        SET
            name = $1,
            description = $2,
            default_discount_ceiling = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING
            id,
            name,
            description,
            default_discount_ceiling,
            is_active,
            created_at,
            updated_at
        `,
        [
            name ?? existingTier.name,
            description ?? existingTier.description,
            defaultDiscountCeiling ??
                existingTier.default_discount_ceiling,
            isActive ?? existingTier.is_active,
            id
        ]
    );

    return result.rows[0];
};

const deactivateCustomerTier = async (id) => {
    const existingTier = await getCustomerTierById(id);

    if (!existingTier) {
        throw new Error("Customer tier not found");
    }

    const result = await pool.query(
        `
        UPDATE customer_tiers
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
    getAllCustomerTiers,
    getCustomerTierById,
    createCustomerTier,
    updateCustomerTier,
    deactivateCustomerTier
};