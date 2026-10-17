import pool from "../config/db.js";

const getAllPriceListItems = async () => {
    const result = await pool.query(`
        SELECT
            pli.id,
            pli.price_list_id,
            pl.name AS price_list_name,
            pli.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pli.product_variant_id,
            pv.variant_name,
            pv.sku AS variant_sku,
            pli.unit_price,
            pli.min_quantity,
            pli.max_quantity,
            pli.is_active,
            pli.created_at,
            pli.updated_at
        FROM price_list_items pli
        INNER JOIN price_lists pl
            ON pli.price_list_id = pl.id
        INNER JOIN products p
            ON pli.product_id = p.id
        LEFT JOIN product_variants pv
            ON pli.product_variant_id = pv.id
        ORDER BY pli.id DESC
    `);

    return result.rows;
};

const getPriceListItems = async (priceListId) => {
    const result = await pool.query(
        `
        SELECT
            pli.id,
            pli.price_list_id,
            pl.name AS price_list_name,
            pli.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pli.product_variant_id,
            pv.variant_name,
            pv.sku AS variant_sku,
            pli.unit_price,
            pli.min_quantity,
            pli.max_quantity,
            pli.is_active,
            pli.created_at,
            pli.updated_at
        FROM price_list_items pli
        INNER JOIN price_lists pl
            ON pli.price_list_id = pl.id
        INNER JOIN products p
            ON pli.product_id = p.id
        LEFT JOIN product_variants pv
            ON pli.product_variant_id = pv.id
        WHERE pli.price_list_id = $1
        ORDER BY pli.id ASC
        `,
        [priceListId]
    );

    return result.rows;
};

const getPriceListItemById = async (id) => {
    const result = await pool.query(
        `
        SELECT 
            pli.id,
            pli.price_list_id,
            pl.name AS price_list_name,
            pli.product_id,
            p.name AS product_name,
            p.sku AS product_sku,
            pli.product_variant_id,
            pv.variant_name,
            pv.sku AS variant_sku,
            pli.unit_price,
            pli.min_quantity,
            pli.max_quantity,
            pli.is_active,
            pli.created_at,
            pli.updated_at
        FROM price_list_items pli
        INNER JOIN price_lists pl
            ON pli.price_list_id = pl.id
        INNER JOIN products p
            ON pli.product_id = p.id
        LEFT JOIN product_variants pv
            ON pli.product_variant_id = pv.id
        WHERE pli.id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createPriceListItem = async ({
    priceListId,
    productId,
    productVariantId,
    unitPrice,
    minQuantity,
    maxQuantity
}) => {
    const priceList = await pool.query(
        `
        SELECT id
        FROM price_lists
        WHERE id = $1
        AND is_active = TRUE
        `,
        [priceListId]
    );

    if (priceList.rows.length === 0) {
        throw new Error(
            "Price list not found or inactive"
        );
    }

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

    if (productVariantId) {
        const variant = await pool.query(
            `
            SELECT id
            FROM product_variants
            WHERE id = $1
            AND product_id = $2
            AND is_active = TRUE
            `,
            [
                productVariantId,
                productId
            ]
        );

        if (variant.rows.length === 0) {
            throw new Error(
                "Product variant not found, inactive, or does not belong to the selected product"
            );
        }
    }

    if (
        maxQuantity !== undefined &&
        maxQuantity !== null &&
        Number(maxQuantity) <
            Number(minQuantity || 1)
    ) {
        throw new Error(
            "Maximum quantity cannot be less than minimum quantity"
        );
    }

    const existingItem = await pool.query(
        `
        SELECT id
        FROM price_list_items
        WHERE price_list_id = $1
        AND product_id = $2
        AND (
            product_variant_id = $3
            OR (
                product_variant_id IS NULL
                AND $3 IS NULL
            )
        )
        AND min_quantity = $4
        `,
        [
            priceListId,
            productId,
            productVariantId || null,
            minQuantity || 1
        ]
    );

    if (existingItem.rows.length > 0) {
        throw new Error(
            "A price entry already exists for this product, variant and quantity range"
        );
    }

    const result = await pool.query(
        `
        INSERT INTO price_list_items (
            price_list_id,
            product_id,
            product_variant_id,
            unit_price,
            min_quantity,
            max_quantity
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            price_list_id,
            product_id,
            product_variant_id,
            unit_price,
            min_quantity,
            max_quantity,
            is_active,
            created_at,
            updated_at
        `,
        [
            priceListId,
            productId,
            productVariantId || null,
            unitPrice,
            minQuantity || 1,
            maxQuantity || null
        ]
    );

    return result.rows[0];
};

const updatePriceListItem = async (
    id,
    {
        priceListId,
        productId,
        productVariantId,
        unitPrice,
        minQuantity,
        maxQuantity,
        isActive
    }
) => {
    const existingItem =
        await getPriceListItemById(id);

    if (!existingItem) {
        throw new Error(
            "Price list item not found"
        );
    }

    const finalPriceListId =
        priceListId ??
        existingItem.price_list_id;

    const finalProductId =
        productId ??
        existingItem.product_id;

    const finalVariantId =
        productVariantId !== undefined
            ? productVariantId || null
            : existingItem.product_variant_id;

    const finalMinQuantity =
        minQuantity ??
        existingItem.min_quantity;

    const finalMaxQuantity =
        maxQuantity !== undefined
            ? maxQuantity || null
            : existingItem.max_quantity;

    const priceList = await pool.query(
        `
        SELECT id
        FROM price_lists
        WHERE id = $1
        AND is_active = TRUE
        `,
        [finalPriceListId]
    );

    if (priceList.rows.length === 0) {
        throw new Error(
            "Price list not found or inactive"
        );
    }

    const product = await pool.query(
        `
        SELECT id
        FROM products
        WHERE id = $1
        AND is_active = TRUE
        `,
        [finalProductId]
    );

    if (product.rows.length === 0) {
        throw new Error(
            "Product not found or inactive"
        );
    }

    if (finalVariantId) {
        const variant = await pool.query(
            `
            SELECT id
            FROM product_variants
            WHERE id = $1
            AND product_id = $2
            AND is_active = TRUE
            `,
            [
                finalVariantId,
                finalProductId
            ]
        );

        if (variant.rows.length === 0) {
            throw new Error(
                "Product variant not found, inactive, or does not belong to the selected product"
            );
        }
    }

    if (
        finalMaxQuantity !== null &&
        Number(finalMaxQuantity) <
            Number(finalMinQuantity)
    ) {
        throw new Error(
            "Maximum quantity cannot be less than minimum quantity"
        );
    }

    const duplicateItem =
        await pool.query(
            `
            SELECT id
            FROM price_list_items
            WHERE price_list_id = $1
            AND product_id = $2
            AND (
                product_variant_id = $3
                OR (
                    product_variant_id IS NULL
                    AND $3 IS NULL
                )
            )
            AND min_quantity = $4
            AND id != $5
            `,
            [
                finalPriceListId,
                finalProductId,
                finalVariantId,
                finalMinQuantity,
                id
            ]
        );

    if (duplicateItem.rows.length > 0) {
        throw new Error(
            "A price entry already exists for this product, variant and quantity range"
        );
    }

    const result = await pool.query(
        `
        UPDATE price_list_items
        SET
            price_list_id = $1,
            product_id = $2,
            product_variant_id = $3,
            unit_price = $4,
            min_quantity = $5,
            max_quantity = $6,
            is_active = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING
            id,
            price_list_id,
            product_id,
            product_variant_id,
            unit_price,
            min_quantity,
            max_quantity,
            is_active,
            created_at,
            updated_at
        `,
        [
            finalPriceListId,
            finalProductId,
            finalVariantId,
            unitPrice ??
                existingItem.unit_price,
            finalMinQuantity,
            finalMaxQuantity,
            isActive ??
                existingItem.is_active,
            id
        ]
    );

    return result.rows[0];
};

const deactivatePriceListItem = async (
    id
) => {
    const existingItem =
        await getPriceListItemById(id);

    if (!existingItem) {
        throw new Error(
            "Price list item not found"
        );
    }

    const result = await pool.query(
        `
        UPDATE price_list_items
        SET
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            price_list_id,
            product_id,
            product_variant_id,
            is_active
        `,
        [id]
    );

    return result.rows[0];
};

export {
    getAllPriceListItems,
    getPriceListItems,
    getPriceListItemById,
    createPriceListItem,
    updatePriceListItem,
    deactivatePriceListItem
};