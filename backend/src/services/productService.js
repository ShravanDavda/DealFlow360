import pool from "../config/db.js";

const getAllProducts = async () => {
    const result = await pool.query(`
        SELECT
            p.id,
            p.category_id,
            c.name AS category_name,
            c.name AS category,
            p.name,
            p.sku,
            p.description,
            p.base_cost,
            pli.unit_price AS price,
            COALESCE(p.unit, 'Each') AS unit,
            COALESCE(p.tax_percent, 0) AS "taxPercent",
            CONCAT(COALESCE(p.tax_percent, 0), '%') AS tax,
            CASE 
                WHEN (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) > 0 
                THEN CONCAT((SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id), ' variants')
                ELSE '-'
            END AS variants,
            CASE WHEN p.is_active THEN 'Active' ELSE 'Archived' END AS status,
            p.is_active,
            p.created_at,
            p.updated_at
        FROM products p
        INNER JOIN categories c
            ON p.category_id = c.id
        LEFT JOIN (
            SELECT DISTINCT ON (pli_sub.product_id) pli_sub.product_id, pli_sub.unit_price
            FROM price_list_items pli_sub
            JOIN price_lists pl_sub ON pl_sub.id = pli_sub.price_list_id
            WHERE pl_sub.is_default = TRUE AND pl_sub.is_active = TRUE AND pli_sub.is_active = TRUE
            ORDER BY pli_sub.product_id, pli_sub.product_variant_id NULLS FIRST, pli_sub.min_quantity ASC NULLS FIRST, pli_sub.id ASC
        ) pli ON p.id = pli.product_id
        ORDER BY p.id ASC
    `);

    return result.rows;
};

const getProductById = async (idOrSku) => {
    const isNum = !isNaN(Number(idOrSku)) && !String(idOrSku).startsWith("PROD-");
    const query = `
        SELECT
            p.id,
            p.category_id,
            c.name AS category_name,
            p.name,
            p.sku,
            p.description,
            p.base_cost,
            p.unit,
            p.tax_percent AS "taxPercent",
            p.is_subscription AS "isSubscription",
            p.recurring_cycle AS "recurringCycle",
            p.is_active,
            p.created_at,
            p.updated_at
        FROM products p
        INNER JOIN categories c
            ON p.category_id = c.id
        WHERE ${isNum ? "p.id = $1" : "p.sku = $1 OR p.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END"}
    `;

    const result = await pool.query(query, [idOrSku]);
    if (result.rows.length === 0) return null;

    const prod = result.rows[0];

    const varRes = await pool.query(
        `SELECT id, variant_name AS "variantName", sku, attributes, additional_cost AS "extraPrice" FROM product_variants WHERE product_id = $1 AND is_active = TRUE`,
        [prod.id]
    );

    const plRes = await pool.query(
        `
        SELECT pl.name AS "tier", pl.currency, pli.unit_price AS "unitPrice"
        FROM price_list_items pli
        JOIN price_lists pl ON pli.price_list_id = pl.id
        WHERE pli.product_id = $1
        `,
        [prod.id]
    );

    const invRes = await pool.query(
        `SELECT SUM(quantity_on_hand) AS "qoh" FROM warehouse_inventory WHERE product_id = $1`,
        [prod.id]
    );

    const qoh = Number(invRes.rows[0]?.qoh || 0);

    return {
        ...prod,
        quantityOnHand: qoh,
        variants: varRes.rows.map(v => ({
            id: v.id,
            attribute: v.attributes?.color ? 'Color' : (v.attributes?.ram ? 'RAM' : 'Option'),
            values: Object.values(v.attributes || {}),
            extraPrice: Number(v.extraPrice)
        })),
        pricelists: plRes.rows.map(pl => ({
            tier: pl.tier.replace(' Price List', ''),
            currency: [pl.currency],
            priceRule: `$${Number(pl.unitPrice).toLocaleString()}`
        }))
    };
};

const createProduct = async ({
    categoryId,
    name,
    sku,
    description,
    baseCost,
    unit,
    taxPercent
}) => {
    const existingProduct = await pool.query(
        `
        SELECT id
        FROM products
        WHERE LOWER(sku) = LOWER($1)
        `,
        [sku]
    );

    if (existingProduct.rows.length > 0) {
        throw new Error("Product SKU already exists");
    }

    const category = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE id = $1
        AND is_active = TRUE
        `,
        [categoryId]
    );

    if (category.rows.length === 0) {
        throw new Error(
            "Category not found or inactive"
        );
    }

    const result = await pool.query(
        `
        INSERT INTO products (
            category_id,
            name,
            sku,
            description,
            base_cost,
            unit,
            tax_percent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
            id,
            category_id,
            name,
            sku,
            description,
            base_cost,
            unit,
            tax_percent AS "taxPercent",
            is_active,
            created_at,
            updated_at
        `,
        [
            categoryId,
            name,
            sku,
            description || null,
            baseCost ?? 0,
            unit || 'Each',
            taxPercent ?? 0
        ]
    );

    return result.rows[0];
};

const updateProduct = async (
    id,
    {
        categoryId,
        name,
        sku,
        description,
        baseCost,
        unit,
        taxPercent,
        isActive
    }
) => {
    const existingProduct =
        await getProductById(id);

    if (!existingProduct) {
        throw new Error("Product not found");
    }

    if (categoryId !== undefined) {
        const category = await pool.query(
            `
            SELECT id
            FROM categories
            WHERE id = $1
            AND is_active = TRUE
            `,
            [categoryId]
        );

        if (category.rows.length === 0) {
            throw new Error(
                "Category not found or inactive"
            );
        }
    }

    const result = await pool.query(
        `
        UPDATE products
        SET
            category_id = $1,
            name = $2,
            sku = $3,
            description = $4,
            base_cost = $5,
            unit = $6,
            tax_percent = $7,
            is_active = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING
            id,
            category_id,
            name,
            sku,
            description,
            base_cost,
            unit,
            tax_percent AS "taxPercent",
            is_active,
            created_at,
            updated_at
        `,
        [
            categoryId ??
                existingProduct.category_id,

            name ??
                existingProduct.name,

            sku ??
                existingProduct.sku,

            description ??
                existingProduct.description,

            baseCost ??
                existingProduct.base_cost,

            unit ?? existingProduct.unit,

            taxPercent ?? existingProduct.taxPercent,

            isActive ??
                existingProduct.is_active,

            id
        ]
    );

    return result.rows[0];
};

const deactivateProduct = async (id) => {
    const existingProduct =
        await getProductById(id);

    if (!existingProduct) {
        throw new Error("Product not found");
    }

    const result = await pool.query(
        `
        UPDATE products
        SET
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            name,
            sku,
            is_active
        `,
        [id]
    );

    return result.rows[0];
};

export {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deactivateProduct
};