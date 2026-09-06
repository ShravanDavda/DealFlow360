import pool from "../config/db.js";

const selectPlan = `SELECT sp.id, sp.name, sp.description, sp.billing_interval AS "billingInterval", sp.recurring_price AS "recurringPrice", sp.proration_rule AS "prorationRule", sp.cancellation_rule AS "cancellationRule", sp.partial_refund_rule AS "partialRefundRule", sp.is_active AS "isActive" FROM subscription_plans sp`;
export const getPlans = async () => {
    const result = await pool.query(`${selectPlan} ORDER BY sp.id DESC`);
    for (const plan of result.rows) {
        const products = await pool.query(`SELECT p.id, p.name, p.sku FROM subscription_plan_products spp JOIN products p ON p.id = spp.product_id WHERE spp.subscription_plan_id = $1 ORDER BY p.name`, [plan.id]);
        plan.products = products.rows;
    }
    return result.rows;
};
export const getPlan = async (id) => (await getPlans()).find((plan) => String(plan.id) === String(id)) || null;
export const createPlan = async (payload) => savePlan(null, payload);
export const updatePlan = async (id, payload) => savePlan(id, payload);
async function savePlan(id, payload) {
    const current = id ? await getPlan(id) : null;
    if (id && !current) throw new Error("Subscription plan not found");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const values = [payload.name ?? current?.name, payload.description ?? current?.description, payload.billingInterval ?? current?.billingInterval ?? "Monthly", payload.recurringPrice ?? current?.recurringPrice ?? null, payload.prorationRule ?? current?.prorationRule, payload.cancellationRule ?? current?.cancellationRule, payload.partialRefundRule ?? current?.partialRefundRule, payload.isActive ?? current?.isActive ?? true];
        const result = id
            ? await client.query(`UPDATE subscription_plans SET name = $1, description = $2, billing_interval = $3, recurring_price = $4, proration_rule = $5, cancellation_rule = $6, partial_refund_rule = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING id`, [...values, id])
            : await client.query(`INSERT INTO subscription_plans (name, description, billing_interval, recurring_price, proration_rule, cancellation_rule, partial_refund_rule, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, values);
        const planId = result.rows[0].id;
        if (Array.isArray(payload.productIds)) {
            await client.query(`DELETE FROM subscription_plan_products WHERE subscription_plan_id = $1`, [planId]);
            for (const productId of payload.productIds) await client.query(`INSERT INTO subscription_plan_products (subscription_plan_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [planId, productId]);
        }
        await client.query("COMMIT");
        return getPlan(planId);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
export const deactivatePlan = (id) => updatePlan(id, { isActive: false });
export const activatePlan = (id) => updatePlan(id, { isActive: true });
export const deletePlan = async (id) => {
    const current = await getPlan(id);
    if (!current) throw new Error("Subscription plan not found");
    const result = await pool.query(`DELETE FROM subscription_plans WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0];
};