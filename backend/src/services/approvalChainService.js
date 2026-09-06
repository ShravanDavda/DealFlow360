import pool from "../config/db.js";

export const getApprovalChains = async () => {
    const result = await pool.query(`SELECT id, name, min_discount_percent AS "minDiscountPercent", max_discount_percent AS "maxDiscountPercent", min_risk AS "minRisk", is_active AS "isActive" FROM approval_chains ORDER BY min_discount_percent, id`);
    for (const chain of result.rows) {
        const steps = await pool.query(`SELECT id, step_order AS "stepOrder", approver_role AS "approverRole" FROM approval_chain_steps WHERE approval_chain_id = $1 ORDER BY step_order`, [chain.id]);
        chain.steps = steps.rows;
    }
    return result.rows;
};

export const getApprovalChain = async (id) => (await getApprovalChains()).find((chain) => String(chain.id) === String(id)) || null;

export const createApprovalChain = async ({ name, minDiscountPercent, maxDiscountPercent, minRisk, steps = [] }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const chain = await client.query(`INSERT INTO approval_chains (name, min_discount_percent, max_discount_percent, min_risk) VALUES ($1, $2, $3, $4) RETURNING id, name, min_discount_percent AS "minDiscountPercent", max_discount_percent AS "maxDiscountPercent", min_risk AS "minRisk", is_active AS "isActive"`, [name, minDiscountPercent ?? 0, maxDiscountPercent ?? null, minRisk || null]);
        for (const [index, step] of steps.entries()) await client.query(`INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, $2, $3)`, [chain.rows[0].id, step.stepOrder || index + 1, step.approverRole]);
        await client.query("COMMIT");
        return getApprovalChain(chain.rows[0].id);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const updateApprovalChain = async (id, payload) => {
    const existing = await getApprovalChain(id);
    if (!existing) throw new Error("Approval chain not found");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`UPDATE approval_chains SET name = $1, min_discount_percent = $2, max_discount_percent = $3, min_risk = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`, [payload.name ?? existing.name, payload.minDiscountPercent ?? existing.minDiscountPercent, payload.maxDiscountPercent ?? existing.maxDiscountPercent, payload.minRisk ?? existing.minRisk, payload.isActive ?? existing.isActive, id]);
        if (Array.isArray(payload.steps)) {
            await client.query(`DELETE FROM approval_chain_steps WHERE approval_chain_id = $1`, [id]);
            for (const [index, step] of payload.steps.entries()) await client.query(`INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, $2, $3)`, [id, step.stepOrder || index + 1, step.approverRole]);
        }
        await client.query("COMMIT");
        return getApprovalChain(id);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const deactivateApprovalChain = (id) => updateApprovalChain(id, { isActive: false });