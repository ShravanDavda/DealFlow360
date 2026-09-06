import pool from "../config/db.js";

const formatPairing = (row) => ({
    id: row.id,
    sourceProductId: row.base_product_id,
    baseProductId: row.base_product_id,
    sourceProductName: row.source_product_name,
    sourceProductSku: row.source_product_sku,
    recommendedProductId: row.suggested_product_id,
    suggestedProductId: row.suggested_product_id,
    recommendedProductName: row.recommended_product_name,
    recommendedProductSku: row.recommended_product_sku,
    type: row.relationship_type,
    relationshipType: row.relationship_type,
    priority: row.priority,
    tag: row.tag,
    marginDelta: Number(row.margin_delta || 0),
    isActive: row.is_active,
    is_active: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

export const getAllPairings = async ({ sourceProductId, type, isActive, search } = {}) => {
    let query = `
        SELECT 
            pp.id,
            pp.base_product_id,
            p1.name AS source_product_name,
            p1.sku AS source_product_sku,
            pp.suggested_product_id,
            p2.name AS recommended_product_name,
            p2.sku AS recommended_product_sku,
            pp.relationship_type,
            pp.priority,
            pp.tag,
            pp.margin_delta,
            pp.is_active,
            pp.created_at,
            pp.updated_at
        FROM product_pairings pp
        INNER JOIN products p1 ON pp.base_product_id = p1.id
        INNER JOIN products p2 ON pp.suggested_product_id = p2.id
        WHERE 1=1
    `;
    const params = [];

    if (sourceProductId) {
        params.push(Number(sourceProductId));
        query += ` AND pp.base_product_id = $${params.length}`;
    }

    if (type) {
        params.push(type.toUpperCase());
        query += ` AND pp.relationship_type = $${params.length}`;
    }

    if (isActive !== undefined && isActive !== null && isActive !== '') {
        params.push(isActive === true || isActive === 'true');
        query += ` AND pp.is_active = $${params.length}`;
    }

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (p1.name ILIKE $${params.length} OR p1.sku ILIKE $${params.length} OR p2.name ILIKE $${params.length} OR p2.sku ILIKE $${params.length})`;
    }

    query += ` ORDER BY p1.name ASC, pp.priority ASC, pp.id ASC`;

    const { rows } = await pool.query(query, params);
    return rows.map(formatPairing);
};

export const getPairingById = async (id) => {
    const { rows } = await pool.query(
        `
        SELECT 
            pp.id,
            pp.base_product_id,
            p1.name AS source_product_name,
            p1.sku AS source_product_sku,
            pp.suggested_product_id,
            p2.name AS recommended_product_name,
            p2.sku AS recommended_product_sku,
            pp.relationship_type,
            pp.priority,
            pp.tag,
            pp.margin_delta,
            pp.is_active,
            pp.created_at,
            pp.updated_at
        FROM product_pairings pp
        INNER JOIN products p1 ON pp.base_product_id = p1.id
        INNER JOIN products p2 ON pp.suggested_product_id = p2.id
        WHERE pp.id = $1
        `,
        [Number(id)]
    );

    if (rows.length === 0) {
        const error = new Error(`Product pairing with ID ${id} not found`);
        error.statusCode = 404;
        throw error;
    }

    return formatPairing(rows[0]);
};

export const createPairing = async (payload) => {
    const sourceId = payload.sourceProductId ?? payload.baseProductId ?? payload.source_product_id ?? payload.base_product_id;
    const recommendedId = payload.recommendedProductId ?? payload.suggestedProductId ?? payload.recommended_product_id ?? payload.suggested_product_id;
    const relType = (payload.type ?? payload.relationshipType ?? payload.relationship_type ?? '').toUpperCase();
    const priority = payload.priority !== undefined && payload.priority !== null && payload.priority !== ''
        ? parseInt(payload.priority, 10)
        : 1;
    const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : (payload.is_active !== undefined ? Boolean(payload.is_active) : true);
    const tag = payload.tag !== undefined && payload.tag !== null && String(payload.tag).trim() !== ''
        ? String(payload.tag).trim()
        : (relType === 'UPSELL' ? 'Recommended Upgrade' : 'Frequently Bought Together');
    const marginDelta = payload.marginDelta !== undefined && payload.marginDelta !== null && payload.marginDelta !== ''
        ? Number(payload.marginDelta)
        : 25.00;

    if (!sourceId) {
        const error = new Error("Source product is required");
        error.statusCode = 400;
        throw error;
    }
    if (!recommendedId) {
        const error = new Error("Recommended product is required");
        error.statusCode = 400;
        throw error;
    }
    if (!relType || !['UPSELL', 'CROSS_SELL'].includes(relType)) {
        const error = new Error("Relationship type is required and must be either UPSELL or CROSS_SELL");
        error.statusCode = 400;
        throw error;
    }

    if (Number(sourceId) === Number(recommendedId)) {
        const error = new Error("Source product and recommended product cannot be the same product");
        error.statusCode = 400;
        throw error;
    }

    if (isNaN(priority) || priority < 1) {
        const error = new Error("Priority must be a positive integer (1 or higher)");
        error.statusCode = 400;
        throw error;
    }

    const sourceProductRes = await pool.query(
        "SELECT id, name, is_active FROM products WHERE id = $1",
        [Number(sourceId)]
    );
    if (sourceProductRes.rows.length === 0) {
        const error = new Error(`Source product with ID ${sourceId} does not exist`);
        error.statusCode = 400;
        throw error;
    }
    const sourceProduct = sourceProductRes.rows[0];
    if (sourceProduct.is_active === false) {
        const error = new Error(`Source product "${sourceProduct.name}" is inactive and cannot be paired`);
        error.statusCode = 400;
        throw error;
    }

    const recommendedProductRes = await pool.query(
        "SELECT id, name, is_active FROM products WHERE id = $1",
        [Number(recommendedId)]
    );
    if (recommendedProductRes.rows.length === 0) {
        const error = new Error(`Recommended product with ID ${recommendedId} does not exist`);
        error.statusCode = 400;
        throw error;
    }
    const recommendedProduct = recommendedProductRes.rows[0];
    if (recommendedProduct.is_active === false) {
        const error = new Error(`Recommended product "${recommendedProduct.name}" is inactive and cannot be paired`);
        error.statusCode = 400;
        throw error;
    }

    if (isActive) {
        const duplicateRes = await pool.query(
            `
            SELECT id FROM product_pairings
            WHERE base_product_id = $1 
              AND suggested_product_id = $2 
              AND relationship_type = $3 
              AND is_active = TRUE
            `,
            [Number(sourceId), Number(recommendedId), relType]
        );

        if (duplicateRes.rows.length > 0) {
            const error = new Error(
                `An active ${relType} relationship already exists between "${sourceProduct.name}" and "${recommendedProduct.name}"`
            );
            error.statusCode = 400;
            throw error;
        }
    }

    const insertRes = await pool.query(
        `
        INSERT INTO product_pairings (
            base_product_id,
            suggested_product_id,
            relationship_type,
            priority,
            is_active,
            tag,
            margin_delta,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
        `,
        [Number(sourceId), Number(recommendedId), relType, priority, isActive, tag, marginDelta]
    );

    return getPairingById(insertRes.rows[0].id);
};

export const updatePairing = async (id, updates) => {
    const existing = await getPairingById(id);

    const sourceId = updates.sourceProductId ?? updates.baseProductId ?? existing.sourceProductId;
    const recommendedId = updates.recommendedProductId ?? updates.suggestedProductId ?? updates.recommended_product_id ?? updates.suggested_product_id ?? existing.recommendedProductId;
    const relType = updates.type ?? updates.relationshipType ?? updates.relationship_type
        ? String(updates.type ?? updates.relationshipType ?? updates.relationship_type).toUpperCase()
        : existing.relationshipType;
    const priority = updates.priority !== undefined && updates.priority !== null && updates.priority !== ''
        ? parseInt(updates.priority, 10)
        : existing.priority;
    const isActive = updates.isActive !== undefined
        ? Boolean(updates.isActive)
        : (updates.is_active !== undefined ? Boolean(updates.is_active) : existing.isActive);
    const tag = updates.tag !== undefined && updates.tag !== null && String(updates.tag).trim() !== ''
        ? String(updates.tag).trim()
        : existing.tag;
    const marginDelta = updates.marginDelta !== undefined && updates.marginDelta !== null && updates.marginDelta !== ''
        ? Number(updates.marginDelta)
        : existing.marginDelta;

    if (Number(sourceId) === Number(recommendedId)) {
        const error = new Error("Source product and recommended product cannot be the same product");
        error.statusCode = 400;
        throw error;
    }

    if (!['UPSELL', 'CROSS_SELL'].includes(relType)) {
        const error = new Error("Relationship type must be either UPSELL or CROSS_SELL");
        error.statusCode = 400;
        throw error;
    }

    if (isNaN(priority) || priority < 1) {
        const error = new Error("Priority must be a positive integer (1 or higher)");
        error.statusCode = 400;
        throw error;
    }

    const recommendedProductRes = await pool.query(
        "SELECT id, name, is_active FROM products WHERE id = $1",
        [Number(recommendedId)]
    );
    if (recommendedProductRes.rows.length === 0) {
        const error = new Error(`Recommended product with ID ${recommendedId} does not exist`);
        error.statusCode = 400;
        throw error;
    }
    const recommendedProduct = recommendedProductRes.rows[0];
    if (recommendedProduct.is_active === false) {
        const error = new Error(`Recommended product "${recommendedProduct.name}" is inactive and cannot be paired`);
        error.statusCode = 400;
        throw error;
    }

    if (isActive) {
        const duplicateRes = await pool.query(
            `
            SELECT id FROM product_pairings
            WHERE base_product_id = $1 
              AND suggested_product_id = $2 
              AND relationship_type = $3 
              AND is_active = TRUE
              AND id != $4
            `,
            [Number(sourceId), Number(recommendedId), relType, Number(id)]
        );

        if (duplicateRes.rows.length > 0) {
            const error = new Error(
                `An active ${relType} relationship already exists between these products (ID ${duplicateRes.rows[0].id})`
            );
            error.statusCode = 400;
            throw error;
        }
    }

    await pool.query(
        `
        UPDATE product_pairings
        SET suggested_product_id = $1,
            relationship_type = $2,
            priority = $3,
            is_active = $4,
            tag = $5,
            margin_delta = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        `,
        [Number(recommendedId), relType, priority, isActive, tag, marginDelta, Number(id)]
    );

    return getPairingById(id);
};

export const deactivatePairing = async (id) => {
    await getPairingById(id);

    await pool.query(
        `
        UPDATE product_pairings
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [Number(id)]
    );

    return getPairingById(id);
};

export const deletePairing = async (id, { hard = false } = {}) => {
    await getPairingById(id);

    if (hard) {
        await pool.query("DELETE FROM product_pairings WHERE id = $1", [Number(id)]);
        return { success: true, message: `Product pairing ${id} deleted successfully` };
    }

    await pool.query(
        `
        UPDATE product_pairings
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [Number(id)]
    );

    return { success: true, message: `Product pairing ${id} deactivated successfully` };
};

export const getActiveRecommendationsForProduct = async (productId) => {
    const numId = Number(productId);
    if (isNaN(numId) || numId <= 0) {
        const error = new Error("Invalid product ID");
        error.statusCode = 400;
        throw error;
    }

    const { rows } = await pool.query(
        `
        SELECT 
            pp.id AS "pairingId",
            p.id AS "productId",
            p.name AS "productName",
            p.sku AS "productSku",
            p.base_cost AS "baseCost",
            pp.relationship_type AS "type",
            pp.priority,
            pp.tag,
            pp.margin_delta AS "marginDelta"
        FROM product_pairings pp
        INNER JOIN products p ON pp.suggested_product_id = p.id
        WHERE pp.base_product_id = $1
          AND pp.is_active = TRUE
          AND p.is_active = TRUE
        ORDER BY pp.priority ASC, pp.id ASC
        `,
        [numId]
    );

    return {
        sourceProductId: numId,
        recommendations: rows.map((row) => ({
            pairingId: row.pairingId,
            productId: row.productId,
            name: row.productName,
            sku: row.productSku,
            baseCost: Number(row.baseCost || 0),
            type: row.type,
            relationshipType: row.type,
            priority: row.priority,
            tag: row.tag,
            marginDelta: Number(row.marginDelta || 0)
        }))
    };
};
