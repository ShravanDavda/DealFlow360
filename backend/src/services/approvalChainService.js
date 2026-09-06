import pool from "../config/db.js";

const VALID_RISKS = new Set([null, undefined, "MEDIUM", "HIGH"]);
const VALID_ROLES = new Set(["Sales Manager", "Finance"]);
const validationError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

const validateChain = ({ name, minDiscountPercent, maxDiscountPercent, minRisk, isActive, steps = [] }) => {
    if (!String(name || "").trim()) throw validationError("Approval chain name is required");
    const min = Number(minDiscountPercent);
    const max = maxDiscountPercent === null || maxDiscountPercent === undefined || maxDiscountPercent === "" ? null : Number(maxDiscountPercent);
    if (!Number.isFinite(min) || min < 0 || min > 100) throw validationError("Minimum discount must be between 0 and 100");
    if (max !== null && (!Number.isFinite(max) || max < 0 || max > 100)) throw validationError("Maximum discount must be null or between 0 and 100");
    if (max !== null && min > max) throw validationError("Minimum discount cannot exceed maximum discount");
    const normalizedRisk = minRisk === "" ? null : minRisk;
    if (!VALID_RISKS.has(normalizedRisk)) throw validationError("Minimum risk must be null, MEDIUM, or HIGH");
    const normalizedSteps = Array.isArray(steps) ? steps : [];
    if (isActive !== false && normalizedSteps.length === 0) throw validationError("An active approval chain must contain at least one step");
    const stepOrders = new Set();
    normalizedSteps.forEach((step, index) => {
        const order = Number(step.stepOrder ?? index + 1);
        if (!Number.isInteger(order) || order <= 0) throw validationError("Approval step order must be a positive integer");
        if (stepOrders.has(order)) throw validationError("Approval step orders must be unique");
        stepOrders.add(order);
        if (!VALID_ROLES.has(step.approverRole)) throw validationError("Approver role must be Sales Manager or Finance");
    });
    const roles = normalizedSteps.map((step) => step.approverRole);
    if (new Set(roles).size !== roles.length) throw validationError("Approval roles cannot be duplicated in one chain");
    if (normalizedSteps.some((step) => step.approverRole === "Finance" && Number(step.stepOrder) === 1)) {
        throw validationError("Finance cannot be the first approval step");
    }
    return { name: String(name).trim(), min, max, minRisk: normalizedRisk, steps: normalizedSteps };
};

export const getApprovalChains = async () => {
    const result = await pool.query(`SELECT id, name, min_discount_percent AS "minDiscountPercent", max_discount_percent AS "maxDiscountPercent", min_risk AS "minRisk", is_active AS "isActive" FROM approval_chains ORDER BY min_discount_percent, id`);
    for (const chain of result.rows) {
        const steps = await pool.query(`SELECT id, step_order AS "stepOrder", approver_role AS "approverRole" FROM approval_chain_steps WHERE approval_chain_id = $1 ORDER BY step_order`, [chain.id]);
        chain.steps = steps.rows.map((step) => ({ ...step, role: step.approverRole }));
    }
    return result.rows;
};

export const getApprovalChain = async (id) => (await getApprovalChains()).find((chain) => String(chain.id) === String(id)) || null;

export const createApprovalChain = async ({ name, minDiscountPercent, maxDiscountPercent, minRisk, steps = [] }) => {
    const validated = validateChain({ name, minDiscountPercent: minDiscountPercent ?? 0, maxDiscountPercent, minRisk, isActive: true, steps });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const chain = await client.query(`INSERT INTO approval_chains (name, min_discount_percent, max_discount_percent, min_risk) VALUES ($1, $2, $3, $4) RETURNING id, name, min_discount_percent AS "minDiscountPercent", max_discount_percent AS "maxDiscountPercent", min_risk AS "minRisk", is_active AS "isActive"`, [validated.name, validated.min, validated.max, validated.minRisk]);
        for (const [index, step] of validated.steps.entries()) await client.query(`INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, $2, $3)`, [chain.rows[0].id, Number(step.stepOrder ?? index + 1), step.approverRole]);
        await client.query("COMMIT");
        return getApprovalChain(chain.rows[0].id);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const updateApprovalChain = async (id, payload) => {
    const existing = await getApprovalChain(id);
    if (!existing) throw new Error("Approval chain not found");
    const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
    const values = {
        name: has("name") ? payload.name : existing.name,
        minDiscountPercent: has("minDiscountPercent") ? payload.minDiscountPercent : existing.minDiscountPercent,
        maxDiscountPercent: has("maxDiscountPercent") ? payload.maxDiscountPercent : existing.maxDiscountPercent,
        minRisk: has("minRisk") ? payload.minRisk : existing.minRisk,
        isActive: has("isActive") ? payload.isActive : existing.isActive,
        steps: has("steps") ? payload.steps : existing.steps
    };
    const validated = validateChain(values);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`UPDATE approval_chains SET name = $1, min_discount_percent = $2, max_discount_percent = $3, min_risk = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`, [validated.name, validated.min, validated.max, validated.minRisk, values.isActive, id]);
        if (has("steps")) {
            await client.query(`DELETE FROM approval_chain_steps WHERE approval_chain_id = $1`, [id]);
            for (const [index, step] of validated.steps.entries()) await client.query(`INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role) VALUES ($1, $2, $3)`, [id, Number(step.stepOrder ?? index + 1), step.approverRole]);
        }
        await client.query("COMMIT");
        return getApprovalChain(id);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const deactivateApprovalChain = (id) => updateApprovalChain(id, { isActive: false });

export const deleteApprovalChain = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const chainResult = await client.query("SELECT id FROM approval_chains WHERE id = $1 FOR UPDATE", [id]);
        if (!chainResult.rows[0]) {
            const error = new Error("Approval chain not found");
            error.statusCode = 404;
            throw error;
        }
        const historyResult = await client.query("SELECT 1 FROM quotation_approval_requests WHERE approval_chain_id = $1 LIMIT 1", [id]);
        if (historyResult.rows[0]) {
            const error = new Error("This approval chain is used by existing approval history and cannot be deleted. Deactivate it instead.");
            error.statusCode = 409;
            throw error;
        }
        await client.query("DELETE FROM approval_chain_steps WHERE approval_chain_id = $1", [id]);
        await client.query("DELETE FROM approval_chains WHERE id = $1", [id]);
        await client.query("COMMIT");
        return { id: Number(id), deleted: true };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};