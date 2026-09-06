import pool from "../config/db.js";

const getAllProductVariants = async () => {
    const result = await pool.query(`
        SELECT
            pv.id,
            pv.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pv.variant_name,
            pv.sku,
            pv.attributes,
            pv.additional_cost,
            pv.is_active,
            pv.created_at,
            pv.updated_at
        FROM product_variants pv
        INNER JOIN products p
            ON pv.product_id = p.id
        ORDER BY pv.id DESC
    `);

    return result.rows;
};

const getProductVariants = async (productId) => {
    const result = await pool.query(
        `
        SELECT
            pv.id,
            pv.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pv.variant_name,
            pv.sku,
            pv.attributes,
            pv.additional_cost,
            pv.is_active,
            pv.created_at,
            pv.updated_at
        FROM product_variants pv
        INNER JOIN products p
            ON pv.product_id = p.id
        WHERE pv.product_id = $1
        ORDER BY pv.id ASC
        `,
        [productId]
    );

    return result.rows;
};

const getProductVariantById = async (id) => {
    const result = await pool.query(
        `
        SELECT
            pv.id,
            pv.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pv.variant_name,
            pv.sku,
            pv.attributes,
            pv.additional_cost,
            pv.is_active,
            pv.created_at,
            pv.updated_at
        FROM product_variants pv
        INNER JOIN products p
            ON pv.product_id = p.id
        WHERE pv.id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createProductVariant = async ({
    productId,
    variantName,
    sku,
    attributes,
    additionalCost
}) => {
    const product = await pool.query(
        `
        SELECT id
        FROM products
        WHERE id = $1
        AND is_active = TRUE
        `,
        [productId]
    );

    if (product.rows.length === 0) {
        throw new Error(
            "Product not found or inactive"
        );
    }

    const existingVariant = await pool.query(
        `
        SELECT id
        FROM product_variants
        WHERE LOWER(sku) = LOWER($1)
        `,
        [sku]
    );

    if (existingVariant.rows.length > 0) {
        throw new Error(
            "Variant SKU already exists"
        );
    }

    const result = await pool.query(
        `
        INSERT INTO product_variants (
            product_id,
            variant_name,
            sku,
            attributes,
            additional_cost
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
        )
        RETURNING
            id,
            product_id,
            variant_name,
            sku,
            attributes,
            additional_cost,
            is_active,
            created_at,
            updated_at
        `,
        [
            productId,
            variantName,
            sku,
            attributes || {},
            additionalCost ?? 0
        ]
    );

    return result.rows[0];
};

const updateProductVariant = async (
    id,
    {
        productId,
        variantName,
        sku,
        attributes,
        additionalCost,
        isActive
    }
) => {
    const existingVariant =
        await getProductVariantById(id);

    if (!existingVariant) {
        throw new Error(
            "Product variant not found"
        );
    }

    if (productId !== undefined) {
        const product = await pool.query(
            `
            SELECT id
            FROM products
            WHERE id = $1
            AND is_active = TRUE
            `,
            [productId]
        );

        if (product.rows.length === 0) {
            throw new Error(
                "Product not found or inactive"
            );
        }
    }

    const result = await pool.query(
        `
        UPDATE product_variants
        SET
            product_id = $1,
            variant_name = $2,
            sku = $3,
            attributes = $4,
            additional_cost = $5,
            is_active = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING
            id,
            product_id,
            variant_name,
            sku,
            attributes,
            additional_cost,
            is_active,
            created_at,
            updated_at
        `,
        [
            productId ??
                existingVariant.product_id,

            variantName ??
                existingVariant.variant_name,

            sku ??
                existingVariant.sku,

            attributes ??
                existingVariant.attributes,

            additionalCost ??
                existingVariant.additional_cost,

            isActive ??
                existingVariant.is_active,

            id
        ]
    );

    return result.rows[0];
};

const deactivateProductVariant = async (id) => {
    const existingVariant =
        await getProductVariantById(id);

    if (!existingVariant) {
        throw new Error(
            "Product variant not found"
        );
    }

    const result = await pool.query(
        `
        UPDATE product_variants
        SET
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            variant_name,
            sku,
            is_active
        `,
        [id]
    );

    return result.rows[0];
};

export {
    getAllProductVariants,
    getProductVariants,
    getProductVariantById,
    createProductVariant,
    updateProductVariant,
    deactivateProductVariant
};