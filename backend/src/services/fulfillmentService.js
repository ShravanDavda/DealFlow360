import pool from "../config/db.js";

const getFulfillmentItems = async (quotationId, orderId = null, fallbackFulfilledQuantity = 0) => {
    const result = await pool.query(`
        SELECT qi.product_id AS "productId", qi.item_name AS product, SUM(qi.quantity)::int AS "requiredQuantity",
               COALESCE((SELECT SUM(GREATEST(wi.quantity_on_hand - wi.reserved_quantity, 0))
                         FROM warehouse_inventory wi WHERE wi.product_id = qi.product_id), 0)::int AS "availableStock"
        FROM quotation_items qi
        WHERE qi.quotation_id = $1 AND qi.is_recurring = FALSE
        GROUP BY qi.product_id, qi.item_name
        ORDER BY qi.product_id
    `, [quotationId]);

    let fulfilledMap = new Map();
    if (orderId) {
        const fRes = await pool.query(
            `SELECT product_id, SUM(quantity_fulfilled)::int AS fulfilled
             FROM fulfillment_splits
             WHERE fulfillment_order_id = $1 AND product_id IS NOT NULL
             GROUP BY product_id`,
            [orderId]
        );
        for (const row of fRes.rows) {
            fulfilledMap.set(row.product_id, Number(row.fulfilled || 0));
        }
    }

    let remainingFulfilled = Number(fallbackFulfilledQuantity || 0);
    return result.rows.map((item) => {
        const requiredQuantity = Number(item.requiredQuantity || 0);
        let fulfilled = 0;
        if (fulfilledMap.has(item.productId)) {
            fulfilled = Math.min(requiredQuantity, fulfilledMap.get(item.productId));
        } else {
            fulfilled = Math.min(requiredQuantity, remainingFulfilled);
            remainingFulfilled -= fulfilled;
        }
        return {
            productId: item.productId,
            product: item.product,
            requiredQuantity,
            availableStock: Number(item.availableStock || 0),
            fulfilledQuantity: fulfilled,
            remainingQuantity: Math.max(0, requiredQuantity - fulfilled)
        };
    });
};

export const getAllFulfillmentOrders = async () => {
    const res = await pool.query(`
        SELECT 
            fo.id,
            fo.order_code AS "orderId",
            fo.customer_name AS "customerName",
            fo.status,
            fo.total_shipments AS "totalShipments",
            fo.estimated_shipping_cost AS "totalCost",
            fo.backorder_consolidated AS "backorderConsolidated",
            q.quote_code AS "quotationId",
            q.total_amount AS "orderAmount",
            COALESCE(required.required_quantity, 0)::int AS "requiredQuantity",
            COALESCE(required.item_summary, '--') AS "itemSummary",
            COALESCE(fulfilled.fulfilled_quantity, 0)::int AS "fulfilledQuantity",
            GREATEST(COALESCE(required.required_quantity, 0) - COALESCE(fulfilled.fulfilled_quantity, 0), 0)::int AS "remainingQuantity"
        FROM fulfillment_orders fo
        LEFT JOIN quotations q ON fo.quotation_id = q.id
        LEFT JOIN LATERAL (SELECT SUM(quantity)::int AS required_quantity, string_agg(DISTINCT item_name, ', ' ORDER BY item_name) AS item_summary FROM quotation_items WHERE quotation_id = q.id AND is_recurring = FALSE) required ON TRUE
        LEFT JOIN LATERAL (SELECT SUM(quantity_fulfilled)::int AS fulfilled_quantity FROM fulfillment_splits WHERE fulfillment_order_id = fo.id) fulfilled ON TRUE
        ORDER BY fo.id DESC
    `);

    return res.rows.map((r) => ({
        ...r,
        id: r.orderId,
        dbId: r.id,
        totalCost: Number(r.totalCost || 0),
        orderAmount: Number(r.orderAmount || 0),
        requiredQuantity: Number(r.requiredQuantity || 0),
        itemSummary: r.itemSummary || '--',
        fulfilledQuantity: Number(r.fulfilledQuantity || 0),
        remainingQuantity: Number(r.remainingQuantity || 0)
    }));
};

export const getFulfillmentDetail = async (orderCodeOrId) => {
    let orderRes = await pool.query(
        `
        SELECT 
            fo.*,
            q.quote_code AS "quoteCode"
        FROM fulfillment_orders fo
        LEFT JOIN quotations q ON fo.quotation_id = q.id
        WHERE fo.order_code = $1 
           OR fo.quotation_id = (SELECT id FROM quotations WHERE quote_code = $1)
           OR fo.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
        LIMIT 1
        `,
        [orderCodeOrId]
    );

    let order = orderRes.rows[0];

    if (!order) {
        const quoteRes = await pool.query("SELECT * FROM quotations WHERE quote_code = $1 OR id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END", [orderCodeOrId]);
        if (quoteRes.rows.length === 0) {
            throw new Error(`Fulfillment order '${orderCodeOrId}' not found`);
        }
        const q = quoteRes.rows[0];
        const custRes = await pool.query("SELECT company_name FROM customers WHERE id = $1", [q.customer_id]);
        const custName = custRes.rows[0]?.company_name || "Valued Customer";

        const newFo = await pool.query(
            `
            INSERT INTO fulfillment_orders (order_code, quotation_id, customer_name, status, total_shipments, estimated_shipping_cost)
            VALUES ($1, $2, $3, 'Pending Split', 0, 0)
            RETURNING *
            `,
            [`ORD-${q.quote_code.replace("Q-", "")}`, q.id, custName]
        );
        order = newFo.rows[0];
        order.quoteCode = q.quote_code;
    }

    let splitsRes = await pool.query(
        `
        SELECT 
            id,
            warehouse_id AS "warehouseId",
            warehouse_name AS "warehouse",
            quantity_fulfilled AS "quantityFulfilled",
            estimated_shipments AS "estimatedShipments",
            shipping_cost AS "cost"
        FROM fulfillment_splits
        WHERE fulfillment_order_id = $1
        ORDER BY id ASC
        `,
        [order.id]
    );

    let splits = splitsRes.rows;

    const fulfilledQuantity = splits.reduce((total, split) => total + Number(split.quantityFulfilled || 0), 0);
    const items = await getFulfillmentItems(order.quotation_id, order.id, fulfilledQuantity);

    const boRes = await pool.query(
        `SELECT id, product_id AS "productId", product_name AS "productName",
                backordered_quantity AS "backorderedQuantity", fulfilled_quantity AS "fulfilledQuantity", status
         FROM backorder_records
         WHERE fulfillment_order_id = $1
         ORDER BY id ASC`,
        [order.id]
    );

    return {
        id: order.order_code,
        dbId: order.id,
        orderId: order.order_code,
        quotationId: order.quoteCode || `Q-${order.quotation_id}`,
        customerName: order.customer_name,
        status: order.status,
        totalShipments: Number(order.total_shipments || 1),
        totalCost: Number(order.estimated_shipping_cost || 0),
        backorderConsolidated: Boolean(order.backorder_consolidated),
        requiredQuantity: items.reduce((total, item) => total + item.requiredQuantity, 0),
        fulfilledQuantity,
        remainingQuantity: items.reduce((total, item) => total + item.remainingQuantity, 0),
        items,
        backorders: boRes.rows,
        warehouseSplits: splits.map((s, idx) => ({
            id: `SPLIT-${s.id || idx + 1}`,
            dbId: s.id,
            warehouse: s.warehouse,
            quantityFulfilled: Number(s.quantityFulfilled),
            estimatedShipments: Number(s.estimatedShipments || 1),
            cost: Number(s.cost || 0)
        }))
    };
};

export const fulfillFulfillmentOrder = async (client, orderId, quotationId) => {
    const orderRes = await client.query(
        "SELECT * FROM fulfillment_orders WHERE id = $1 FOR UPDATE",
        [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new Error(`Fulfillment order ID ${orderId} not found`);

    const itemsRes = await client.query(
        `SELECT id, product_id AS "productId", item_name AS "itemName", quantity
         FROM quotation_items
         WHERE quotation_id = $1 AND is_recurring = FALSE
         ORDER BY id ASC`,
        [quotationId]
    );
    const items = itemsRes.rows;

    for (const item of items) {
        const reqQty = Number(item.quantity || 0);

        const alreadyFulfilledRes = await client.query(
            `SELECT COALESCE(SUM(quantity_fulfilled), 0)::int AS fulfilled
             FROM fulfillment_splits
             WHERE fulfillment_order_id = $1 AND product_id = $2`,
            [orderId, item.productId]
        );
        const alreadyFulfilled = Number(alreadyFulfilledRes.rows[0]?.fulfilled || 0);
        let needed = Math.max(0, reqQty - alreadyFulfilled);

        if (needed > 0) {
            const invRes = await client.query(
                `SELECT wi.id, wi.warehouse_id AS "warehouseId", w.name AS "warehouseName",
                        w.shipping_cost_weight AS "shippingCost", wi.quantity_on_hand AS "quantityOnHand",
                        wi.reserved_quantity AS "reservedQuantity"
                 FROM warehouse_inventory wi
                 JOIN warehouses w ON w.id = wi.warehouse_id
                 WHERE wi.product_id = $1 AND w.is_active = TRUE
                 ORDER BY w.id ASC
                 FOR UPDATE OF wi`,
                [item.productId]
            );

            for (const stock of invRes.rows) {
                if (needed <= 0) break;
                const available = Math.max(0, Number(stock.quantityOnHand) - Number(stock.reservedQuantity));
                if (available <= 0) continue;

                const toDeduct = Math.min(needed, available);
                if (toDeduct <= 0) continue;

                await client.query(
                    `UPDATE warehouse_inventory
                     SET quantity_on_hand = quantity_on_hand - $1,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2 AND quantity_on_hand - reserved_quantity >= $1`,
                    [toDeduct, stock.id]
                );

                const existingSplitRes = await client.query(
                    `SELECT id, quantity_fulfilled FROM fulfillment_splits
                     WHERE fulfillment_order_id = $1 AND warehouse_id = $2 AND product_id = $3
                     LIMIT 1`,
                    [orderId, stock.warehouseId, item.productId]
                );

                if (existingSplitRes.rows[0]) {
                    await client.query(
                        `UPDATE fulfillment_splits
                         SET quantity_fulfilled = quantity_fulfilled + $1
                         WHERE id = $2`,
                        [toDeduct, existingSplitRes.rows[0].id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO fulfillment_splits (fulfillment_order_id, warehouse_id, warehouse_name, product_id, quantity_fulfilled, estimated_shipments, shipping_cost)
                         VALUES ($1, $2, $3, $4, $5, 1, $6)`,
                        [orderId, stock.warehouseId, stock.warehouseName, item.productId, toDeduct, stock.shippingCost || 20]
                    );
                }

                needed -= toDeduct;
            }
        }

        const currentFulfilledRes = await client.query(
            `SELECT COALESCE(SUM(quantity_fulfilled), 0)::int AS fulfilled
             FROM fulfillment_splits
             WHERE fulfillment_order_id = $1 AND product_id = $2`,
            [orderId, item.productId]
        );
        const currentFulfilled = Number(currentFulfilledRes.rows[0]?.fulfilled || 0);
        const remainingBackorder = Math.max(0, reqQty - currentFulfilled);

        const existingBoRes = await client.query(
            `SELECT id FROM backorder_records WHERE fulfillment_order_id = $1 AND quotation_item_id = $2`,
            [orderId, item.id]
        );

        const boStatus = remainingBackorder === 0
            ? "FULFILLED"
            : currentFulfilled > 0
            ? "PARTIALLY_FULFILLED"
            : "PENDING";

        if (existingBoRes.rows[0]) {
            await client.query(
                `UPDATE backorder_records
                 SET backordered_quantity = $1,
                     fulfilled_quantity = $2,
                     status = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4`,
                [remainingBackorder, currentFulfilled, boStatus, existingBoRes.rows[0].id]
            );
        } else if (remainingBackorder > 0 || currentFulfilled > 0) {
            await client.query(
                `INSERT INTO backorder_records (fulfillment_order_id, quotation_id, quotation_item_id, product_id, product_name, backordered_quantity, fulfilled_quantity, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [orderId, quotationId, item.id, item.productId, item.itemName, remainingBackorder, currentFulfilled, boStatus]
            );
        }
    }

    const splitsSummary = await client.query(
        `SELECT COUNT(DISTINCT warehouse_id)::int AS shipments,
                COALESCE(SUM(shipping_cost), 0) AS total_cost,
                COALESCE(SUM(quantity_fulfilled), 0)::int AS total_fulfilled
         FROM fulfillment_splits
         WHERE fulfillment_order_id = $1`,
        [orderId]
    );

    const totalRequired = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    const totalFulfilled = Number(splitsSummary.rows[0]?.total_fulfilled || 0);
    const shipments = Math.max(1, Number(splitsSummary.rows[0]?.shipments || 1));
    const totalCost = Number(splitsSummary.rows[0]?.total_cost || 0);

    let nextStatus = "Pending Split";
    if (totalRequired === 0 || totalFulfilled >= totalRequired) {
        nextStatus = "Fulfilled";
    } else if (totalFulfilled > 0) {
        nextStatus = "Partially Shipped";
    } else {
        nextStatus = "Backordered";
    }

    await client.query(
        `UPDATE fulfillment_orders
         SET status = $1, total_shipments = $2, estimated_shipping_cost = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [nextStatus, shipments, totalCost, orderId]
    );

    return {
        orderId,
        quotationId,
        totalRequired,
        totalFulfilled,
        remainingQuantity: Math.max(0, totalRequired - totalFulfilled),
        status: nextStatus
    };
};

export const autoSplitOrder = async (orderId, quotationId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await fulfillFulfillmentOrder(client, orderId, quotationId);
        await client.query("COMMIT");
        const splitsRes = await pool.query("SELECT * FROM fulfillment_splits WHERE fulfillment_order_id = $1 ORDER BY id ASC", [orderId]);
        return splitsRes.rows;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const acceptSplit = async (orderCodeOrId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const orderResult = await client.query(
            `SELECT fo.*
             FROM fulfillment_orders fo
             WHERE fo.order_code = $1
                OR fo.quotation_id = (SELECT id FROM quotations WHERE quote_code = $1)
                OR fo.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
             LIMIT 1 FOR UPDATE`,
            [orderCodeOrId]
        );
        const order = orderResult.rows[0];
        if (!order) throw new Error(`Fulfillment order '${orderCodeOrId}' not found`);

        const splitsRes = await client.query(
            `SELECT COALESCE(SUM(quantity_fulfilled), 0)::int AS total_fulfilled FROM fulfillment_splits WHERE fulfillment_order_id = $1`,
            [order.id]
        );
        const itemsRes = await client.query(
            `SELECT COALESCE(SUM(quantity), 0)::int AS total_required FROM quotation_items WHERE quotation_id = $1 AND is_recurring = FALSE`,
            [order.quotation_id]
        );
        const totalFulfilled = Number(splitsRes.rows[0]?.total_fulfilled || 0);
        const totalRequired = Number(itemsRes.rows[0]?.total_required || 0);

        if (totalRequired > 0 && totalFulfilled >= totalRequired && order.status === "Fulfilled") {
            await client.query("COMMIT");
            return getFulfillmentDetail(order.order_code);
        }

        await fulfillFulfillmentOrder(client, order.id, order.quotation_id);
        await client.query("COMMIT");
        return getFulfillmentDetail(order.order_code);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const manualOverride = async (orderCodeOrId, { splits = [] } = {}) => {
    const detail = await getFulfillmentDetail(orderCodeOrId);

    if (splits.length > 0) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM fulfillment_splits WHERE fulfillment_order_id = $1", [detail.dbId]);

            let totalShipments = 0;
            let totalCost = 0;

            for (const s of splits) {
                const warehouseRes = await client.query("SELECT id, shipping_cost_weight FROM warehouses WHERE name = $1 AND is_active = TRUE LIMIT 1", [s.warehouse]);
                if (!warehouseRes.rows[0]) throw new Error(`Active warehouse '${s.warehouse}' not found`);
                const whId = warehouseRes.rows[0].id;
                const cost = Number(warehouseRes.rows[0].shipping_cost_weight || 0);
                const qty = Number(s.quantityFulfilled || 0);
                totalShipments += 1;
                totalCost += cost;

                await client.query(
                    `
                    INSERT INTO fulfillment_splits (fulfillment_order_id, warehouse_id, warehouse_name, quantity_fulfilled, estimated_shipments, shipping_cost)
                    VALUES ($1, $2, $3, $4, 1, $5)
                    `,
                    [detail.dbId, whId, s.warehouse, qty, cost]
                );
            }

            await client.query(
                `
                UPDATE fulfillment_orders
                SET status = 'Split Accepted', total_shipments = $1, estimated_shipping_cost = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                `,
                [totalShipments, totalCost, detail.dbId]
            );

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    return getFulfillmentDetail(detail.orderId);
};

export const consolidateBackorder = async (orderCodeOrId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const orderResult = await client.query(
            `SELECT fo.*
             FROM fulfillment_orders fo
             WHERE fo.order_code = $1
                OR fo.quotation_id = (SELECT id FROM quotations WHERE quote_code = $1)
                OR fo.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
             LIMIT 1 FOR UPDATE`,
            [orderCodeOrId]
        );
        const order = orderResult.rows[0];
        if (!order) throw new Error(`Fulfillment order '${orderCodeOrId}' not found`);

        const result = await fulfillFulfillmentOrder(client, order.id, order.quotation_id);

        if (result.remainingQuantity === 0) {
            await client.query(
                `UPDATE fulfillment_orders
                 SET backorder_consolidated = TRUE, total_shipments = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [order.id]
            );
        }

        await client.query("COMMIT");
        return getFulfillmentDetail(order.order_code);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
