import pool from "../config/db.js";
import { calculateQuotation } from "./quotationCalculationService.js";

export const calculateBlendedRisk = (items = []) => {
    let totalViolationPoints = 0;
    let maxSingleViolation = 0;
    let hasAnyViolation = false;

    const evaluatedItems = items.map((item) => {
        const effectiveLimit = Number(item.allowedDiscount ?? item.discountLimit ?? 0);
        const discountGiven = Number(item.discountGiven ?? item.discountPercent ?? 0);
        const overBy = Math.max(0, discountGiven - effectiveLimit);

        if (overBy > 0) {
            hasAnyViolation = true;
            totalViolationPoints += overBy;
            if (overBy > maxSingleViolation) {
                maxSingleViolation = overBy;
            }
        }

        const riskStatus = overBy > 0 ? `OVER (+${overBy}pt)` : "OK";

        return {
            ...item,
            discountLimit: effectiveLimit,
            overBy,
            riskStatus
        };
    });

    let blendedRisk = "LOW";
    let requiredApproval = "None";

    if (maxSingleViolation >= 6 || totalViolationPoints >= 8) {
        blendedRisk = "HIGH";
    } else if (hasAnyViolation) {
        blendedRisk = "MEDIUM";
    }

    if (blendedRisk === "HIGH") {
        requiredApproval = "Sales Manager then Finance";
    } else if (blendedRisk === "MEDIUM") {
        requiredApproval = "Sales Manager";
    }

    return {
        blendedRisk,
        requiredApproval,
        items: evaluatedItems,
        totalViolationPoints
    };
};

export const previewQuotation = async ({ customerId, priceListId, items = [] }) => {
    return calculateQuotation({ customerId, priceListId, items });
};

export const getAllQuotations = async ({ status, ownerId, ownerRole, customerId } = {}) => {
    let query = `
        SELECT 
            q.id,
            q.quote_code AS "idStr",
            q.quote_code AS "quoteId",
            COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS "salesRep",
            c.company_name AS "customerName",
            ct.name AS "customerTier",
            ct.default_discount_ceiling AS "tierCeiling",
            q.status,
            q.total_amount AS "amount",
            q.subtotal,
            q.total_discount AS "totalDiscount",
            q.overall_margin AS "overallMargin",
            q.blended_risk_score AS "blendedRisk",
            q.approval_stage AS "approvalStage",
            q.created_at AS "createdAt",
            q.updated_at AS "updatedAt",
            COUNT(qi.id) AS "itemCount"
        FROM quotations q
        INNER JOIN customers c ON q.customer_id = c.id
        INNER JOIN users u ON q.user_id = u.id
        LEFT JOIN customer_tiers ct ON c.customer_tier_id = ct.id
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    `;

    const params = [];
    const filters = [];
    if (status && status !== "All") {
        params.push(status);
        filters.push(`q.status = $${params.length}`);
    }
    if (ownerId) {
        params.push(ownerId);
        filters.push(`q.user_id = $${params.length}`);
    }
    if (ownerRole) {
        params.push(ownerRole);
        filters.push(`u.role = $${params.length}`);
    }
    if (customerId) {
        params.push(customerId);
        filters.push(`q.customer_id = $${params.length}`);
    }
    if (filters.length) query += ` WHERE ${filters.join(" AND ")}`;

    query += `
        GROUP BY q.id, u.first_name, u.last_name, u.username, c.company_name, ct.name, ct.default_discount_ceiling
        ORDER BY q.id DESC
    `;

    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
        ...row,
        id: row.idStr || `Q-${row.id}`,
        dbId: row.id,
        amount: Number(row.amount || 0),
        subtotal: Number(row.subtotal || 0),
        totalDiscount: Number(row.totalDiscount || 0),
        overallMargin: Number(row.overallMargin || 0),
        itemCount: Number(row.itemCount || 0)
    }));
};

export const getQuotationByCodeOrId = async (codeOrId) => {
    let quoteRes;
    const isNum = !isNaN(Number(codeOrId)) && !String(codeOrId).startsWith("Q-");

    if (isNum) {
        quoteRes = await pool.query(
            `
            SELECT 
                q.*,
                c.company_name AS "customerName",
                c.email AS "customerEmail",
                c.currency AS "currency",
                ct.name AS "customerTier",
                ct.default_discount_ceiling AS "tierCeiling",
                pl.name AS "priceListName"
            FROM quotations q
            INNER JOIN customers c ON q.customer_id = c.id
            LEFT JOIN customer_tiers ct ON c.customer_tier_id = ct.id
            LEFT JOIN price_lists pl ON q.price_list_id = pl.id
            WHERE q.id = $1
            `,
            [codeOrId]
        );
    } else {
        quoteRes = await pool.query(
            `
            SELECT 
                q.*,
                c.company_name AS "customerName",
                c.email AS "customerEmail",
                c.currency AS "currency",
                ct.name AS "customerTier",
                ct.default_discount_ceiling AS "tierCeiling",
                pl.name AS "priceListName"
            FROM quotations q
            INNER JOIN customers c ON q.customer_id = c.id
            LEFT JOIN customer_tiers ct ON c.customer_tier_id = ct.id
            LEFT JOIN price_lists pl ON q.price_list_id = pl.id
            WHERE q.quote_code = $1
            `,
            [codeOrId]
        );
    }

    if (quoteRes.rows.length === 0) return null;

    const quote = quoteRes.rows[0];

    const itemsRes = await pool.query(
        `
        SELECT 
            qi.id,
            qi.product_id AS "productId",
            qi.product_variant_id AS "productVariantId",
            qi.item_name AS "name",
            qi.category_name AS "category",
            cat.discount_ceiling AS "categoryCeiling",
            qi.quantity,
            qi.unit_price AS "price",
            qi.base_cost AS "baseCost",
            qi.discount_percent AS "discount",
            qi.discount_limit AS "discountLimit",
            qi.line_total AS "lineTotal",
            qi.margin_percent AS "marginPercent",
            p.tax_percent AS "taxPercent",
            qi.risk_status AS "status",
            qi.is_recurring AS "isRecurring",
            qi.recurring_cycle AS "recurringCycle"
        FROM quotation_items qi
        LEFT JOIN products p ON qi.product_id = p.id
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE qi.quotation_id = $1
        ORDER BY qi.id ASC
        `,
        [quote.id]
    );

    const auditRes = await pool.query(
        `
        SELECT id, user_name AS "user", action, note, to_char(created_at, 'Mon DD') AS "date"
        FROM quotation_audit_trail
        WHERE quotation_id = $1
        ORDER BY id ASC
        `,
        [quote.id]
    );

    const negRes = await pool.query(
        `
        SELECT id, product_name AS "productName", customer_comment AS "customerComment", requested_discount AS "requestedDiscount"
        FROM quotation_negotiation_lines
        WHERE quotation_id = $1
        ORDER BY id ASC
        `,
        [quote.id]
    );

    return {
        id: quote.quote_code,
        dbId: quote.id,
        quoteCode: quote.quote_code,
        customerId: quote.customer_id,
        priceListId: quote.price_list_id,
        userId: quote.user_id,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerTier: quote.customerTier,
        tierCeiling: Number(quote.tierCeiling || 0),
        priceList: quote.priceListName,
        currency: quote.currency,
        status: quote.status,
        subtotal: Number(quote.subtotal || 0),
        totalDiscount: Number(quote.total_discount || 0),
        taxAmount: Number(quote.tax_amount || 0),
        totalAmount: Number(quote.total_amount || 0),
        overallMargin: Number(quote.overall_margin || 0),
        blendedRisk: quote.blended_risk_score,
        approvalStage: quote.approval_stage,
        paymentTerms: quote.payment_terms || "Net 30",
        requestedDeliveryDate: quote.requested_delivery_date,
        products: itemsRes.rows.map((row) => ({
            id: `P-${row.id}`,
            dbId: row.id,
            productId: row.productId,
            productVariantId: row.productVariantId,
            name: row.name,
            category: row.category,
            categoryCeiling: Number(row.categoryCeiling || 0),
            quantity: Number(row.quantity),
            price: Number(row.price),
            baseCost: Number(row.baseCost),
            discount: Number(row.discount),
            discountLimit: Number(row.discountLimit),
            lineTotal: Number(row.lineTotal),
            marginPercent: Number(row.marginPercent),
            taxPercent: Number(row.taxPercent || 0),
            status: row.status,
            isRecurring: row.isRecurring,
            recurringCycle: row.recurringCycle
        })),
        auditTrail: auditRes.rows,
        negotiationLines: negRes.rows
    };
};

export const createQuotation = async ({ customerId, userId, priceListId, items = [] }) => {
    if (!customerId || !userId || !priceListId) {
        throw new Error("Customer, authenticated user, and price list are required");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const userRes = await client.query(`SELECT id FROM users WHERE id = $1 AND is_active = TRUE`, [userId]);
        if (!userRes.rows[0]) throw new Error("Authenticated user not found or inactive");
        const calculation = await calculateQuotation({ client, customerId, priceListId, items });
        const userNameRes = await client.query(`SELECT COALESCE(NULLIF(CONCAT(first_name, ' ', last_name), ' '), username) AS name FROM users WHERE id = $1`, [userId]);
        const userName = userNameRes.rows[0]?.name || "User";

        const quoteInsert = await client.query(
            `
            INSERT INTO quotations (
                quote_code, customer_id, user_id, price_list_id,
                status, subtotal, total_discount, tax_amount, total_amount,
                overall_margin, blended_risk_score, approval_stage
            )
            VALUES ('Q-' || nextval('quotations_id_seq'), $1, $2, $3, 'Draft', $4, $5, $6, $7, $8, $9, 'None')
            RETURNING *
            `,
            [
                customerId,
                userId,
                priceListId,
                calculation.subtotal,
                calculation.totalDiscount,
                calculation.taxAmount,
                calculation.totalAmount,
                calculation.overallMargin.toFixed(2),
                calculation.blendedRisk
            ]
        );

        const newQuote = quoteInsert.rows[0];

        for (const item of calculation.items) {
            await client.query(
                `
                INSERT INTO quotation_items (
                    quotation_id, product_id, product_variant_id, item_name, category_name,
                    quantity, unit_price, base_cost, discount_percent, discount_limit,
                    line_total, margin_percent, risk_status, is_recurring, recurring_cycle
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `,
                [
                    newQuote.id,
                    item.productId,
                    item.variantId,
                    item.itemName,
                    item.category,
                    item.quantity,
                    item.unitPrice,
                    item.baseCost,
                    item.discountPercent,
                    item.discountLimit,
                    item.lineTotal,
                    item.marginPercent.toFixed(2),
                    item.riskStatus,
                    item.isRecurring,
                    item.recurringCycle || null
                ]
            );
        }

        await client.query(
            `
            INSERT INTO quotation_audit_trail (quotation_id, user_name, action, note)
            VALUES ($1, $2, 'Created', 'Draft quotation created')
            `,
            [newQuote.id, userName]
        );

        await client.query("COMMIT");
        return getQuotationByCodeOrId(newQuote.quote_code);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const updateQuotation = async (idOrCode, { items = [], customerNotes, internalNotes }, userId) => {
    const quote = await getQuotationByCodeOrId(idOrCode);
    if (!quote) throw new Error("Quotation not found");
    if (!userId) throw new Error("Authenticated user is required");
    if (Number(quote.userId) !== Number(userId)) {
        const error = new Error("Only the quotation creator can edit it");
        error.statusCode = 403;
        throw error;
    }
    if (["Approved", "Pending Approval", "Rejected"].includes(quote.status)) throw new Error("Quotation cannot be edited in its current state");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const userRes = await client.query(`SELECT id FROM users WHERE id = $1 AND is_active = TRUE`, [userId]);
        if (!userRes.rows[0]) throw new Error("Authenticated user not found or inactive");
        const calculation = await calculateQuotation({
            client,
            customerId: quote.customerId,
            priceListId: quote.priceListId,
            items
        });
        const userNameRes = await client.query(`SELECT COALESCE(NULLIF(CONCAT(first_name, ' ', last_name), ' '), username) AS name FROM users WHERE id = $1`, [userId]);
        const userName = userNameRes.rows[0]?.name || "User";

        await client.query(`UPDATE quotation_approval_requests SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE quotation_id = $1 AND status IN ('RETURNED', 'PENDING')`, [quote.dbId]);

        await client.query(
            `
            UPDATE quotations
            SET subtotal = $1, total_discount = $2, tax_amount = $3,
                total_amount = $4, overall_margin = $5, blended_risk_score = $6,
                customer_notes = COALESCE($7, customer_notes),
                internal_notes = COALESCE($8, internal_notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            `,
            [
                calculation.subtotal,
                calculation.totalDiscount,
                calculation.taxAmount,
                calculation.totalAmount,
                calculation.overallMargin.toFixed(2),
                calculation.blendedRisk,
                customerNotes,
                internalNotes,
                quote.dbId
            ]
        );

        await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [quote.dbId]);

        for (const item of calculation.items) {
            await client.query(
                `
                INSERT INTO quotation_items (
                    quotation_id, product_id, product_variant_id, item_name, category_name,
                    quantity, unit_price, base_cost, discount_percent, discount_limit,
                    line_total, margin_percent, risk_status, is_recurring, recurring_cycle
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `,
                [
                    quote.dbId,
                    item.productId,
                    item.variantId,
                    item.itemName,
                    item.category,
                    item.quantity,
                    item.unitPrice,
                    item.baseCost,
                    item.discountPercent,
                    item.discountLimit,
                    item.lineTotal,
                    item.marginPercent.toFixed(2),
                    item.riskStatus,
                    item.isRecurring,
                    item.recurringCycle || null
                ]
            );
        }

        await client.query(
            `
            INSERT INTO quotation_audit_trail (quotation_id, user_name, action, note)
            VALUES ($1, $2, 'Saved Draft', 'Quotation items updated')
            `,
            [quote.dbId, userName]
        );

        await client.query("COMMIT");
        return getQuotationByCodeOrId(quote.quoteCode);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const submitQuotationForApproval = async (idOrCode, { userName = "Sales Rep", note } = {}) => {
    const quote = await getQuotationByCodeOrId(idOrCode);
    if (!quote) throw new Error("Quotation not found");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let nextStatus = "Approved";
        let nextStage = "Auto-Approved";
        if (quote.blendedRisk === "HIGH" || quote.blendedRisk === "MEDIUM") {
            nextStatus = "Pending Approval";
            nextStage = "Sales Manager";
        }

        await client.query(
            `
            UPDATE quotations
            SET status = $1, approval_stage = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            `,
            [nextStatus, nextStage, quote.dbId]
        );

        await client.query(
            `
            INSERT INTO quotation_audit_trail (quotation_id, user_name, action, note)
            VALUES ($1, $2, 'Submitted', $3)
            `,
            [
                quote.dbId,
                userName,
                note || `Submitted for approval with risk rating: ${quote.blendedRisk}`
            ]
        );

        await client.query("COMMIT");
        return getQuotationByCodeOrId(quote.quoteCode);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const getUpsellRecommendations = async (idOrCode) => {
    const quote = await getQuotationByCodeOrId(idOrCode);
    if (!quote) throw new Error("Quotation not found");

    const currentProductIds = quote.products.map((p) => p.productId).filter(Boolean);

    let pairingsRes;
    if (currentProductIds.length > 0) {
        pairingsRes = await pool.query(
            `
            SELECT 
                pp.id AS "pairingId",
                p.id,
                p.name,
                p.base_cost AS "baseCost",
                c.name AS "category",
                c.discount_ceiling AS "categoryCeiling",
                pli.unit_price AS "price",
                pp.tag,
                pp.margin_delta AS "marginDelta",
                pp.relationship_type AS "type",
                pp.priority
            FROM product_pairings pp
            INNER JOIN products p ON pp.suggested_product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN price_list_items pli ON (p.id = pli.product_id AND pli.price_list_id = $2 AND pli.product_variant_id IS NULL AND pli.is_active = TRUE AND pli.min_quantity <= 1 AND (pli.max_quantity IS NULL OR pli.max_quantity >= 1))
            WHERE pp.base_product_id = ANY($1::int[])
              AND p.id != ALL($1::int[])
              AND pp.is_active = TRUE
              AND p.is_active = TRUE
            ORDER BY pp.priority ASC
            LIMIT 5
            `,
            [currentProductIds, quote.priceListId]
        );
    }

    if (!pairingsRes || pairingsRes.rows.length === 0) {
        pairingsRes = await pool.query(
            `
            SELECT 
                p.id,
                p.name,
                p.base_cost AS "baseCost",
                c.name AS "category",
                c.discount_ceiling AS "categoryCeiling",
                pli.unit_price AS "price",
                'Recommended' AS tag,
                ROUND((pli.unit_price - p.base_cost), 2) AS "marginDelta",
                'UPSELL' AS "type",
                1 AS priority
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN price_list_items pli ON (p.id = pli.product_id AND pli.price_list_id = $2 AND pli.product_variant_id IS NULL AND pli.is_active = TRUE AND pli.min_quantity <= 1 AND (pli.max_quantity IS NULL OR pli.max_quantity >= 1))
            WHERE p.id != ALL($1::int[]) AND pli.unit_price IS NOT NULL AND p.is_active = TRUE
            LIMIT 3
            `,
            [currentProductIds.length ? currentProductIds : [0], quote.priceListId]
        );
    }

    return pairingsRes.rows.map((row) => ({
        id: `S-${row.id}`,
        productId: row.id,
        name: row.name,
        category: row.category,
        categoryCeiling: Number(row.categoryCeiling || 0),
        price: Number(row.price),
        baseCost: Number(row.baseCost),
        tag: row.tag || "Recommended",
        detail: row.tag?.includes("%") ? row.tag : `Margin +$${Math.round(Number(row.marginDelta))}`,
        type: row.type || "CROSS_SELL",
        relationshipType: row.type || "CROSS_SELL",
        priority: row.priority || 1
    }));
};
