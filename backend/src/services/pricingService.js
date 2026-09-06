import pool from "../config/db.js";

const getDb = (client) => client || pool;

export const resolveQuotationLine = async ({ client, customerId, priceListId, productId, productVariantId = null, quantity }) => {
    const db = getDb(client);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error("Quantity must be a positive integer");

    const customerRes = await db.query(
        `SELECT c.id, c.is_active, c.currency, c.customer_tier_id AS "customerTierId", ct.default_discount_ceiling AS "tierCeiling"
         FROM customers c LEFT JOIN customer_tiers ct ON ct.id = c.customer_tier_id WHERE c.id = $1`,
        [customerId]
    );
    const customer = customerRes.rows[0];
    if (!customer) throw new Error("Customer not found");
    if (!customer.is_active) throw new Error("Customer is inactive");

    const priceListRes = await db.query(
        `SELECT id, name, currency FROM price_lists WHERE id = $1 AND is_active = TRUE`,
        [priceListId]
    );
    const priceList = priceListRes.rows[0];
    if (!priceList) throw new Error("Price list not found or inactive");

    const productRes = await db.query(
        `SELECT p.id, p.name, p.base_cost AS "baseCost", p.unit, p.tax_percent AS "taxPercent",
                p.is_subscription AS "isRecurring", p.recurring_cycle AS "recurringCycle",
                c.id AS "categoryId", c.name AS category, c.discount_ceiling AS "categoryCeiling"
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.id = $1 AND p.is_active = TRUE`,
        [productId]
    );
    const product = productRes.rows[0];
    if (!product) throw new Error("Product not found or inactive");

    let variant = null;
    if (productVariantId !== null && productVariantId !== undefined) {
        const variantRes = await db.query(
            `SELECT id, variant_name AS "variantName", sku, attributes, additional_cost AS "additionalCost"
             FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = TRUE`,
            [productVariantId, productId]
        );
        variant = variantRes.rows[0];
        if (!variant) throw new Error("Variant not found, inactive, or does not belong to product");
    }

    const priceRes = await db.query(
        `SELECT pli.unit_price AS "unitPrice", pli.min_quantity AS "minQuantity", pli.max_quantity AS "maxQuantity",
                pli.product_variant_id AS "productVariantId"
         FROM price_list_items pli
         WHERE pli.price_list_id = $1 AND pli.product_id = $2 AND pli.is_active = TRUE
           AND (pli.product_variant_id = $3 OR ($3 IS NULL AND pli.product_variant_id IS NULL))
           AND pli.min_quantity <= $4 AND (pli.max_quantity IS NULL OR pli.max_quantity >= $4)
         ORDER BY pli.min_quantity DESC, pli.id DESC LIMIT 1`,
        [priceListId, productId, productVariantId, qty]
    );

    let priceItem = priceRes.rows[0];
    if (!priceItem && variant) {
        const basePriceRes = await db.query(
            `SELECT pli.unit_price AS "unitPrice" FROM price_list_items pli
             WHERE pli.price_list_id = $1 AND pli.product_id = $2 AND pli.product_variant_id IS NULL
               AND pli.is_active = TRUE AND pli.min_quantity <= $3
               AND (pli.max_quantity IS NULL OR pli.max_quantity >= $3)
             ORDER BY pli.min_quantity DESC, pli.id DESC LIMIT 1`,
            [priceListId, productId, qty]
        );
        if (basePriceRes.rows[0]) {
            priceItem = { unitPrice: Number(basePriceRes.rows[0].unitPrice) + Number(variant.additionalCost || 0) };
        }
    }
    if (!priceItem) throw new Error(`No applicable price found for ${product.name} in the selected price list`);

    const ruleCeiling = await resolveDiscountRuleCeiling({
        db,
        customerTierId: customer.customerTierId,
        categoryId: product.categoryId,
        productId
    });

    return {
        customerId: Number(customer.id),
        customerTierCeiling: Number(customer.tierCeiling ?? 0),
        discountRuleCeiling: ruleCeiling,
        currency: priceList.currency || customer.currency || "USD",
        priceListId: Number(priceList.id),
        priceListName: priceList.name,
        productId: product.id,
        productName: product.name,
        category: product.category,
        categoryCeiling: Number(product.categoryCeiling ?? 0),
        variantId: variant?.id || null,
        variantName: variant?.variantName || null,
        unitPrice: Number(priceItem.unitPrice),
        baseCost: Number(product.baseCost || 0),
        unit: product.unit || "Each",
        taxPercent: Number(product.taxPercent || 0),
        isRecurring: Boolean(product.isRecurring),
        recurringCycle: product.recurringCycle || null,
        quantity: qty
    };
};

export const resolveQuotationLines = async ({ client, customerId, priceListId, items = [] }) => {
    if (!customerId) throw new Error("Customer is required");
    if (!priceListId) throw new Error("Price list is required");
    if (!Array.isArray(items) || items.length === 0) throw new Error("At least one quotation item is required");

    return Promise.all(items.map(async (item) => {
        const discountPercent = Number(item.discountPercent ?? item.discount ?? 0);
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            throw new Error("Discount must be between 0 and 100 percent");
        }
        return {
            ...(await resolveQuotationLine({
                client,
                customerId,
                priceListId,
                productId: item.productId,
                productVariantId: item.productVariantId ?? null,
                quantity: item.quantity
            })),
            discountPercent
        };
    }));
};

const resolveDiscountRuleCeiling = async ({ db, customerTierId, categoryId, productId }) => {
    const tableRes = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'discount_rules'
    `);
    const columns = new Set(tableRes.rows.map((row) => row.column_name));
    if (!columns.size) return null;

    const ceilingColumn = ['max_discount_percent', 'discount_ceiling', 'max_discount'].find((column) => columns.has(column));
    if (!ceilingColumn) return null;
    const conditions = columns.has('is_active') ? ['is_active = TRUE'] : ['TRUE'];
    const values = [];
    if (columns.has('customer_tier_id')) {
        values.push(customerTierId);
        conditions.push(`(customer_tier_id = $${values.length} OR customer_tier_id IS NULL)`);
    }
    if (columns.has('category_id')) {
        values.push(categoryId);
        conditions.push(`(category_id = $${values.length} OR category_id IS NULL)`);
    }
    if (columns.has('product_id')) {
        values.push(productId);
        conditions.push(`(product_id = $${values.length} OR product_id IS NULL)`);
    }
    const result = await db.query(
        `SELECT ${ceilingColumn} AS ceiling FROM discount_rules WHERE ${conditions.join(' AND ')} ORDER BY
            CASE WHEN ${columns.has('product_id') ? 'product_id IS NOT NULL' : 'FALSE'} THEN 0 ELSE 1 END,
            CASE WHEN ${columns.has('category_id') ? 'category_id IS NOT NULL' : 'FALSE'} THEN 0 ELSE 1 END,
            id DESC LIMIT 1`,
        values
    );
    return result.rows[0]?.ceiling === undefined ? null : Number(result.rows[0].ceiling);
};