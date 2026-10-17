import pool from "../config/db.js";

export const getWarehouses = async () => {
    const result = await pool.query(`
        SELECT w.id, w.name, w.code, w.location,
               w.shipping_cost_weight AS "shippingCostWeight",
               w.is_active AS "isActive",
               COALESCE(SUM(wi.quantity_on_hand), 0) AS "totalStock"
        FROM warehouses w
        LEFT JOIN warehouse_inventory wi ON wi.warehouse_id = w.id
        GROUP BY w.id
        ORDER BY w.id ASC
    `);
    return result.rows;
};

export const getWarehouse = async (id) => {
    const warehouse = await pool.query(
        `SELECT id, name, code, location, shipping_cost_weight AS "shippingCostWeight", is_active AS "isActive" FROM warehouses WHERE id = $1`,
        [id]
    );
    if (!warehouse.rows[0]) return null;
    const inventory = await pool.query(
        `SELECT wi.id, wi.product_id AS "productId", p.name AS "productName", wi.quantity_on_hand AS "quantityOnHand", wi.reserved_quantity AS "reservedQuantity" FROM warehouse_inventory wi JOIN products p ON p.id = wi.product_id WHERE wi.warehouse_id = $1 ORDER BY p.name`,
        [id]
    );
    return { ...warehouse.rows[0], inventory: inventory.rows };
};

export const createWarehouse = async ({ name, code, location, shippingCostWeight }) => {
    const result = await pool.query(
        `INSERT INTO warehouses (name, code, location, shipping_cost_weight) VALUES ($1, $2, $3, $4) RETURNING id, name, code, location, shipping_cost_weight AS "shippingCostWeight", is_active AS "isActive"`,
        [name, code, location || null, shippingCostWeight ?? 20]
    );
    return result.rows[0];
};

export const updateWarehouse = async (id, payload) => {
    const current = await getWarehouse(id);
    if (!current) throw new Error("Warehouse not found");
    const result = await pool.query(
        `UPDATE warehouses SET name = $1, code = $2, location = $3, shipping_cost_weight = $4, is_active = $5 WHERE id = $6 RETURNING id, name, code, location, shipping_cost_weight AS "shippingCostWeight", is_active AS "isActive"`,
        [payload.name ?? current.name, payload.code ?? current.code, payload.location ?? current.location, payload.shippingCostWeight ?? current.shippingCostWeight, payload.isActive ?? current.isActive, id]
    );
    return result.rows[0];
};

export const upsertInventory = async (warehouseId, { productId, quantityOnHand, reservedQuantity }) => {
    const result = await pool.query(
        `INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity) VALUES ($1, $2, $3, $4) ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand, reserved_quantity = EXCLUDED.reserved_quantity, updated_at = CURRENT_TIMESTAMP RETURNING id, warehouse_id AS "warehouseId", product_id AS "productId", quantity_on_hand AS "quantityOnHand", reserved_quantity AS "reservedQuantity"`,
        [warehouseId, productId, quantityOnHand ?? 0, reservedQuantity ?? 0]
    );
    return result.rows[0];
};

export const deactivateWarehouse = (id) => updateWarehouse(id, { isActive: false });