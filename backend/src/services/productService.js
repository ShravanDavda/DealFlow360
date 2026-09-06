import pool from "../config/db.js";

const taxFields = `
    COALESCE(NULLIF(p.cgst_percent, 0), p.tax_percent / 2, 0) AS "cgstPercent",
    COALESCE(NULLIF(p.sgst_percent, 0), p.tax_percent / 2, 0) AS "sgstPercent",
    COALESCE(NULLIF(p.cgst_percent, 0), p.tax_percent / 2, 0) + COALESCE(NULLIF(p.sgst_percent, 0), p.tax_percent / 2, 0) AS "taxPercent"
`;
const totalTaxExpression = `COALESCE(NULLIF(p.cgst_percent, 0), p.tax_percent / 2, 0) + COALESCE(NULLIF(p.sgst_percent, 0), p.tax_percent / 2, 0)`;

const validateTax = (value, label) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new Error(`${label} must be between 0 and 100`);
    return numeric;
};

const getAllProducts = async () => {
    const result = await pool.query(`
        SELECT p.id, p.category_id, c.name AS category_name, c.name AS category, p.name, p.sku,
               p.description, p.base_cost, pli.unit_price AS price, COALESCE(p.unit, 'Each') AS unit,
               ${taxFields}, CONCAT(${totalTaxExpression}, '%') AS tax,
               CASE WHEN (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) > 0 THEN CONCAT((SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id), ' variants') ELSE '-' END AS variants,
               CASE WHEN p.is_active THEN 'Active' ELSE 'Archived' END AS status, p.is_active, p.created_at, p.updated_at
        FROM products p INNER JOIN categories c ON p.category_id = c.id
        LEFT JOIN (SELECT DISTINCT ON (pli_sub.product_id) pli_sub.product_id, pli_sub.unit_price FROM price_list_items pli_sub JOIN price_lists pl_sub ON pl_sub.id = pli_sub.price_list_id WHERE pl_sub.is_default = TRUE AND pl_sub.is_active = TRUE AND pli_sub.is_active = TRUE ORDER BY pli_sub.product_id, pli_sub.product_variant_id NULLS FIRST, pli_sub.min_quantity ASC NULLS FIRST, pli_sub.id ASC) pli ON p.id = pli.product_id
        ORDER BY p.id ASC
    `);
    return result.rows;
};

const getProductById = async (idOrSku) => {
    const isNum = !isNaN(Number(idOrSku)) && !String(idOrSku).startsWith("PROD-");
    const result = await pool.query(`SELECT p.id, p.category_id, c.name AS category_name, p.name, p.sku, p.description, p.base_cost, p.unit, ${taxFields}, p.is_subscription AS "isSubscription", p.recurring_cycle AS "recurringCycle", p.is_active, p.created_at, p.updated_at FROM products p INNER JOIN categories c ON p.category_id = c.id WHERE ${isNum ? "p.id = $1" : "p.sku = $1 OR p.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END"}`, [idOrSku]);
    if (!result.rows.length) return null;
    const prod = result.rows[0];
    const [varRes, plRes, invRes] = await Promise.all([
        pool.query(`SELECT id, variant_name AS "variantName", sku, attributes, additional_cost AS "extraPrice" FROM product_variants WHERE product_id = $1 AND is_active = TRUE`, [prod.id]),
        pool.query(`SELECT pl.name AS "tier", pl.currency, pli.unit_price AS "unitPrice" FROM price_list_items pli JOIN price_lists pl ON pli.price_list_id = pl.id WHERE pli.product_id = $1`, [prod.id]),
        pool.query(`SELECT SUM(quantity_on_hand) AS "qoh" FROM warehouse_inventory WHERE product_id = $1`, [prod.id])
    ]);
    return {
        ...prod,
        quantityOnHand: Number(invRes.rows[0]?.qoh || 0),
        variants: varRes.rows.map((v) => ({ id: v.id, attribute: v.attributes?.color ? 'Color' : (v.attributes?.ram ? 'RAM' : 'Option'), values: Object.values(v.attributes || {}), extraPrice: Number(v.extraPrice) })),
        pricelists: plRes.rows.map((pl) => ({ tier: pl.tier.replace(' Price List', ''), currency: [pl.currency], priceRule: `$${Number(pl.unitPrice).toLocaleString()}` }))
    };
};

export const getNextProductSku = async () => {
    const result = await pool.query(`SELECT GREATEST(COALESCE((SELECT last_value FROM product_sku_seq), 0), COALESCE((SELECT MAX(CASE WHEN sku ~ '^[0-9]+$' THEN sku::BIGINT WHEN sku ~ '^PROD-[0-9]+$' THEN SUBSTRING(sku FROM 6)::BIGINT END) FROM products), 0)) + 1 AS sku`);
    return String(result.rows[0].sku);
};

const createProduct = async ({ categoryId, name, description, baseCost, unit, cgstPercent = 0, sgstPercent = 0 }) => {
    const cgst = validateTax(cgstPercent, "CGST");
    const sgst = validateTax(sgstPercent, "SGST");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const category = await client.query("SELECT id FROM categories WHERE id = $1 AND is_active = TRUE", [categoryId]);
        if (!category.rows.length) throw new Error("Category not found or inactive");
        const result = await client.query(`INSERT INTO products (category_id, name, sku, description, base_cost, unit, tax_percent, cgst_percent, sgst_percent) VALUES ($1, $2, nextval('product_sku_seq')::TEXT, $3, $4, $5, $6, $7, $8) RETURNING id, category_id, name, sku, description, base_cost, unit, cgst_percent AS "cgstPercent", sgst_percent AS "sgstPercent", cgst_percent + sgst_percent AS "taxPercent", is_active, created_at, updated_at`, [categoryId, name, description || null, baseCost ?? 0, unit || 'Each', cgst + sgst, cgst, sgst]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

const updateProduct = async (id, { categoryId, name, description, baseCost, unit, cgstPercent, sgstPercent, isActive }) => {
    const existing = await getProductById(id);
    if (!existing) throw new Error("Product not found");
    if (categoryId !== undefined) {
        const category = await pool.query("SELECT id FROM categories WHERE id = $1 AND is_active = TRUE", [categoryId]);
        if (!category.rows.length) throw new Error("Category not found or inactive");
    }
    const cgst = validateTax(cgstPercent ?? existing.cgstPercent, "CGST");
    const sgst = validateTax(sgstPercent ?? existing.sgstPercent, "SGST");
    const result = await pool.query(`UPDATE products SET category_id = $1, name = $2, description = $3, base_cost = $4, unit = $5, tax_percent = $6, cgst_percent = $7, sgst_percent = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING id, category_id, name, sku, description, base_cost, unit, cgst_percent AS "cgstPercent", sgst_percent AS "sgstPercent", cgst_percent + sgst_percent AS "taxPercent", is_active, created_at, updated_at`, [categoryId ?? existing.category_id, name ?? existing.name, description ?? existing.description, baseCost ?? existing.base_cost, unit ?? existing.unit, cgst + sgst, cgst, sgst, isActive ?? existing.is_active, id]);
    return result.rows[0];
};

const deactivateProduct = async (id) => {
    if (!await getProductById(id)) throw new Error("Product not found");
    const result = await pool.query("UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, sku, is_active", [id]);
    return result.rows[0];
};

export { getAllProducts, getProductById, createProduct, updateProduct, deactivateProduct };