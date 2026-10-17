import pool from "../config/db.js";
import { calculateQuotation } from "./quotationCalculationService.js";
import { getQuotationByCodeOrId } from "./quotationService.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
const normalizeApproverRole = (role) => {
    const normalized = normalizeRole(role).replace(/^salesmanager$/, "sales_manager");
    if (normalized === "sales_manager") return "Sales Manager";
    if (normalized === "finance") return "Finance";
    if (normalized === "operations") return "Operations";
    return String(role || "").trim();
};
const allowedRoles = (role) => {
    const normalized = normalizeRole(role).replace(/^salesmanager$/, "sales_manager");
    if (normalized === "sales_manager") return new Set(["sales_manager"]);
    if (normalized === "finance") return new Set(["finance"]);
    return new Set();
};

const createApprovalError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getUser = async (client, userId) => {
    const result = await client.query(
        `SELECT COALESCE(NULLIF(CONCAT(first_name, ' ', last_name), ' '), username) AS name, role FROM users WHERE id = $1 AND is_active = TRUE`,
        [userId]
    );
    if (!result.rows[0]) throw createApprovalError("Authenticated user not found or inactive", 401);
    return result.rows[0];
};

const addAudit = async (client, { quotationId, userId, user, action, note, previousStatus, newStatus }) => {
    await client.query(
        `INSERT INTO quotation_audit_trail (quotation_id, user_id, user_name, user_role, action, note, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [quotationId, userId, user.name, user.role, action, note || null, previousStatus || null, newStatus || null]
    );
};

const loadChains = async (client) => {
    const result = await client.query(`
        SELECT id, name, min_discount_percent AS "minDiscountPercent",
               max_discount_percent AS "maxDiscountPercent", min_risk AS "minRisk"
        FROM approval_chains WHERE is_active = TRUE
        ORDER BY min_discount_percent DESC, id
    `);
    for (const chain of result.rows) {
        const steps = await client.query(
            `SELECT id, step_order AS "stepOrder", approver_role AS "approverRole"
             FROM approval_chain_steps WHERE approval_chain_id = $1 ORDER BY step_order`,
            [chain.id]
        );
        chain.steps = steps.rows.map((step) => ({ ...step, approverRole: normalizeApproverRole(step.approverRole) }));
    }
    return result.rows;
};

const resolveApprovalChain = async (client, calculation) => {
    if (calculation.blendedRisk === "LOW") return null;
    const discountGovernanceScore = Math.max(
        Number(calculation.maxSingleViolation || 0),
        Number(calculation.totalViolationPoints || 0)
    );
    const matchingChains = (await loadChains(client)).filter((candidate) => {
        const riskMatches = !candidate.minRisk || String(candidate.minRisk).toUpperCase() === calculation.blendedRisk;
        const minMatches = Number(candidate.minDiscountPercent || 0) <= discountGovernanceScore;
        const maxMatches = candidate.maxDiscountPercent === null || discountGovernanceScore <= Number(candidate.maxDiscountPercent);
        return riskMatches && minMatches && maxMatches && candidate.steps.length > 0;
    });

    // Prefer exact risk, then the highest applicable minimum threshold, then the
    // most specific maximum boundary, with deterministic id/name tie breakers.
    const chain = matchingChains.sort((left, right) => {
        const leftExactRisk = String(left.minRisk || "").toUpperCase() === calculation.blendedRisk ? 1 : 0;
        const rightExactRisk = String(right.minRisk || "").toUpperCase() === calculation.blendedRisk ? 1 : 0;
        if (rightExactRisk !== leftExactRisk) return rightExactRisk - leftExactRisk;
        const minDifference = Number(right.minDiscountPercent || 0) - Number(left.minDiscountPercent || 0);
        if (minDifference !== 0) return minDifference;
        const leftMax = left.maxDiscountPercent === null ? Number.POSITIVE_INFINITY : Number(left.maxDiscountPercent);
        const rightMax = right.maxDiscountPercent === null ? Number.POSITIVE_INFINITY : Number(right.maxDiscountPercent);
        if (leftMax !== rightMax) return leftMax - rightMax;
        return Number(left.id) - Number(right.id) || String(left.name).localeCompare(String(right.name));
    })[0];
    if (!chain) throw createApprovalError(`No active approval chain configured for ${calculation.blendedRisk} risk`, 400);
    return chain;
};

export const createApprovalCycle = async (client, { quote, calculation, submittedBy }) => {
    const chain = await resolveApprovalChain(client, calculation);
    if (!chain) return null;

    await client.query(
        `UPDATE quotation_approval_requests
         SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
         WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')`,
        [quote.id]
    );

    const requestResult = await client.query(
        `INSERT INTO quotation_approval_requests (quotation_id, approval_chain_id, submitted_by, status)
         VALUES ($1, $2, $3, 'PENDING') RETURNING id`,
        [quote.id, chain.id, submittedBy || quote.user_id]
    );

    for (const [index, step] of chain.steps.entries()) {
        await client.query(
            `INSERT INTO quotation_approval_steps
             (approval_request_id, approval_chain_step_id, step_order, approver_role, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [requestResult.rows[0].id, step.id, step.stepOrder, step.approverRole, index === 0 ? 'PENDING' : 'WAITING']
        );
    }

    return chain;
};

const lockQuotation = async (client, codeOrId) => {
    const numericId = !isNaN(Number(codeOrId)) && !String(codeOrId).startsWith("Q-");
    const result = await client.query(
        `SELECT q.*, c.company_name AS "customerName" FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE ${numericId ? "q.id = $1" : "q.quote_code = $1"} FOR UPDATE`,
        [codeOrId]
    );
    return result.rows[0] || null;
};

export const getApproval = async (codeOrId) => {
    const quote = await getQuotationByCodeOrId(codeOrId);
    if (!quote) throw createApprovalError("Quotation not found", 404);
    const requestResult = await pool.query(
        `SELECT id, status, approval_chain_id AS "approvalChainId", submitted_by AS "submittedBy", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM quotation_approval_requests WHERE quotation_id = $1 ORDER BY id DESC LIMIT 1`,
        [quote.dbId]
    );
    const request = requestResult.rows[0] || null;
    let steps = [];
    if (request) {
        const stepResult = await pool.query(
            `SELECT s.id, s.step_order AS "stepOrder", s.approver_role AS role, s.approver_role AS "approverRole", s.status,
                    s.approver_id AS "approverId", u.username AS approver,
                    s.acted_at AS "approvedAt", s.comment
             FROM quotation_approval_steps s LEFT JOIN users u ON u.id = s.approver_id
             WHERE s.approval_request_id = $1 ORDER BY s.step_order`,
            [request.id]
        );
        steps = stepResult.rows.map((step) => ({
            ...step,
            role: normalizeApproverRole(step.role),
            approverRole: normalizeApproverRole(step.approverRole)
        }));
    }
    const currentStep = steps.find((step) => step.status === "PENDING") || null;
    return {
        quotationId: quote.quoteCode,
        userId: quote.userId,
        customerName: quote.customerName,
        customerTier: quote.customerTier,
        blendedRisk: quote.blendedRisk,
        status: quote.status,
        approvalStage: quote.approvalStage,
        riskStatus: quote.blendedRisk,
        blendedRiskScore: quote.blendedRisk,
        currentStep,
        request,
        steps,
        workflow: steps,
        auditTrail: quote.auditTrail
    };
};

export const getApprovals = async ({ status = "all", role = "all", ownerId, ownerRole } = {}) => {
    const params = [];
    let baseWhere = "q.status IN ('Pending Approval', 'Approved', 'Rejected', 'Returned')";
    if (role && role !== "all") {
        params.push(role);
        baseWhere += ` AND ((q.status <> 'Pending Approval' AND EXISTS (SELECT 1 FROM quotation_approval_requests ar JOIN quotation_approval_steps ast ON ast.approval_request_id = ar.id WHERE ar.quotation_id = q.id AND LOWER(ast.approver_role) = LOWER($${params.length}))) OR (q.status = 'Pending Approval' AND EXISTS (SELECT 1 FROM quotation_approval_requests ar JOIN quotation_approval_steps ast ON ast.approval_request_id = ar.id WHERE ar.quotation_id = q.id AND ast.status = 'PENDING' AND LOWER(ast.approver_role) = LOWER($${params.length}))))`;
    }
    if (ownerId) {
        params.push(ownerId);
        baseWhere += ` AND q.user_id = $${params.length}`;
    }
    if (ownerRole) {
        params.push(ownerRole);
        baseWhere += ` AND EXISTS (SELECT 1 FROM users owner_user WHERE owner_user.id = q.user_id AND owner_user.role = $${params.length})`;
    }
    const summaryResult = await pool.query(`SELECT q.status, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE q.blended_risk_score = 'HIGH')::int AS "highRiskCount" FROM quotations q WHERE ${baseWhere} GROUP BY q.status`, params);
    const listParams = [...params];
    let where = baseWhere;
    if (status === "pending") where += " AND q.status = 'Pending Approval'";
    if (status === "approved") where += " AND q.status = 'Approved'";
    if (status === "returned") where += " AND q.status = 'Returned'";
    if (status === "rejected") where += " AND q.status = 'Rejected'";
    const result = await pool.query(
        `SELECT q.id AS "dbId", q.quote_code AS "quotationId", c.company_name AS "customerName",
                ct.name AS "customerTier", q.blended_risk_score AS "blendedRisk", q.approval_stage AS stage,
                q.status, q.total_amount AS amount, q.total_discount AS discount, q.created_at AS "createdAt",
                COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS "salesRep",
                ar.created_at AS "submittedAt",
                (SELECT string_agg(acs.approver_role, ' → ' ORDER BY acs.step_order)
                 FROM approval_chain_steps acs WHERE acs.approval_chain_id = ar.approval_chain_id) AS "approvalChain",
                (SELECT ast.approver_role FROM quotation_approval_steps ast
                 WHERE ast.approval_request_id = ar.id AND ast.status = 'PENDING' ORDER BY ast.step_order LIMIT 1) AS "currentStep",
                COALESCE((SELECT string_agg(qi.item_name || ' discount exceeds ' || qi.discount_limit || '%', '; ')
                          FROM quotation_items qi WHERE qi.quotation_id = q.id AND qi.discount_percent > qi.discount_limit),
                         CASE WHEN q.blended_risk_score = 'HIGH' THEN 'High-risk discount requires configured approval chain' ELSE 'Configured approval review required' END) AS "reasonRequired"
         FROM quotations q JOIN customers c ON c.id = q.customer_id
         JOIN users u ON u.id = q.user_id
         LEFT JOIN customer_tiers ct ON ct.id = c.customer_tier_id
         LEFT JOIN LATERAL (SELECT * FROM quotation_approval_requests request WHERE request.quotation_id = q.id ORDER BY request.id DESC LIMIT 1) ar ON TRUE
         WHERE ${where} ORDER BY q.id DESC`,
        listParams
    );
    const summaryCount = (value) => summaryResult.rows.find((row) => row.status === value)?.count || 0;
    const highRiskCount = summaryResult.rows.reduce((total, row) => total + Number(row.highRiskCount || 0), 0);
    return {
        summary: [
            { label: "Pending Approvals", status: "pending", count: summaryCount("Pending Approval") },
            { label: "High Risk Deals", status: "high-risk", count: highRiskCount },
            { label: "Returned for Revision", status: "returned", count: summaryCount("Returned") },
            { label: "Approved Deals", status: "approved", count: summaryCount("Approved") }
        ],
        approvals: result.rows.map((row) => ({ ...row, id: `A-${row.dbId}`, amount: Number(row.amount || 0), discount: Number(row.discount || 0), status: row.status === "Pending Approval" ? "Pending" : row.status }))
    };
};

export const getApprovalDetail = async (codeOrId) => {
    const quote = await getQuotationByCodeOrId(codeOrId);
    if (!quote) throw new Error("Quotation not found");
    const approval = await getApproval(codeOrId);
    return {
        id: `A-${quote.dbId}`,
        quotationId: quote.quoteCode,
        userId: quote.userId,
        customerName: quote.customerName,
        customerTier: quote.customerTier,
        blendedRisk: quote.blendedRisk,
        status: quote.status === "Pending Approval" ? "Pending" : quote.status,
        approvalStage: quote.approvalStage,
        riskLines: quote.products.map((item) => ({
            id: `RL-${item.dbId}`,
            line: `${item.name} (${item.category})`,
            discountGiven: item.discount,
            limitAllowed: item.discountLimit,
            overBy: Math.max(0, item.discount - item.discountLimit),
            status: item.status
        })),
        workflow: approval.steps,
        approval,
        auditTrail: quote.auditTrail
    };
};

export const submitQuotation = async (codeOrId, userId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const user = await getUser(client, userId);
        const quote = await lockQuotation(client, codeOrId);
        if (!quote) throw createApprovalError("Quotation not found", 404);
        if (Number(quote.user_id) !== Number(userId)) {
            const error = new Error("Only the quotation creator can submit it");
            error.statusCode = 403;
            throw error;
        }
        if (!["Draft", "Returned", "Under Negotiation"].includes(quote.status)) throw createApprovalError("Quotation is not in a submittable state", 400);
        const itemResult = await client.query(`SELECT product_id AS "productId", product_variant_id AS "productVariantId", quantity, discount_percent AS "discountPercent" FROM quotation_items WHERE quotation_id = $1 ORDER BY id`, [quote.id]);
        const calculation = await calculateQuotation({ client, customerId: quote.customer_id, priceListId: quote.price_list_id, items: itemResult.rows });
        const chain = await resolveApprovalChain(client, calculation);
        const nextStatus = chain ? "Pending Approval" : "Approved";
        const nextStage = chain ? chain.steps[0].approverRole : "Auto-Approved";
        await client.query(`UPDATE quotations SET status = $1, approval_stage = $2, blended_risk_score = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`, [nextStatus, nextStage, calculation.blendedRisk, quote.id]);
        if (chain) {
            await createApprovalCycle(client, { quote, calculation, submittedBy: userId });
            await addAudit(client, { quotationId: quote.id, userId, user, action: "APPROVAL_STARTED", note: `Approval chain: ${chain.name}`, previousStatus: quote.status, newStatus: nextStatus });
        } else {
            await addAudit(client, { quotationId: quote.id, userId, user, action: "QUOTATION_APPROVED", note: "No approval chain required", previousStatus: quote.status, newStatus: nextStatus });
        }
        await addAudit(client, { quotationId: quote.id, userId, user, action: "QUOTATION_SUBMITTED", note: `Risk: ${calculation.blendedRisk}`, previousStatus: quote.status, newStatus: nextStatus });
        await client.query("COMMIT");
        return getApprovalDetail(quote.quote_code);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

const performAction = async (codeOrId, userId, action, comment) => {
    if ((action === "REJECT" || action === "RETURN") && !comment?.trim()) throw new Error(`${action === "REJECT" ? "Rejection" : "Return"} comment is required`);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const user = await getUser(client, userId);
        const quote = await lockQuotation(client, codeOrId);
        if (!quote) throw createApprovalError("Quotation not found", 404);
        if (quote.status !== "Pending Approval") throw createApprovalError("Quotation is not awaiting approval", 400);
        if (Number(quote.user_id) === Number(userId)) throw createApprovalError("Quotation creator cannot approve their own quotation", 403);
        const stepResult = await client.query(`SELECT s.* FROM quotation_approval_steps s JOIN quotation_approval_requests ar ON ar.id = s.approval_request_id WHERE ar.quotation_id = $1 AND ar.status = 'PENDING' AND s.status = 'PENDING' ORDER BY s.step_order LIMIT 1 FOR UPDATE OF s, ar`, [quote.id]);
        const step = stepResult.rows[0];
        if (!step) throw createApprovalError("No pending approval step", 400);
        const userRole = normalizeRole(user.role);
        if (!allowedRoles(step.approver_role).has(userRole)) throw createApprovalError("User role is not authorized for this approval step", 403);
        const stepStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "RETURNED";
        await client.query(`UPDATE quotation_approval_steps SET status = $1, approver_id = $2, acted_at = CURRENT_TIMESTAMP, comment = $3 WHERE id = $4 AND status = 'PENDING'`, [stepStatus, userId, comment || null, step.id]);
        const next = action === "APPROVE" ? await client.query(`SELECT id, approver_role FROM quotation_approval_steps WHERE approval_request_id = $1 AND step_order > $2 AND status = 'WAITING' ORDER BY step_order LIMIT 1`, [step.approval_request_id, step.step_order]) : { rows: [] };
        let status = action === "APPROVE" && next.rows[0] ? "Pending Approval" : action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Returned";
        let stage = action === "APPROVE" && next.rows[0] ? next.rows[0].approver_role : status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "None";
        if (next.rows[0]) await client.query(`UPDATE quotation_approval_steps SET status = 'PENDING' WHERE id = $1 AND status = 'WAITING'`, [next.rows[0].id]);
        await client.query(`UPDATE quotation_approval_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status === "Pending Approval" ? "PENDING" : status.toUpperCase(), step.approval_request_id]);
        await client.query(`UPDATE quotations SET status = $1, approval_stage = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [status, stage, quote.id]);
        await addAudit(client, { quotationId: quote.id, userId, user, action: action === "APPROVE" ? "APPROVAL_STEP_APPROVED" : action === "REJECT" ? "APPROVAL_STEP_REJECTED" : "APPROVAL_RETURNED", note: comment, previousStatus: quote.status, newStatus: status });
        if (status === "Approved") await addAudit(client, { quotationId: quote.id, userId, user, action: "QUOTATION_APPROVED", note: comment, previousStatus: quote.status, newStatus: status });
        await client.query("COMMIT");
        return getApprovalDetail(quote.quote_code);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const approveQuotation = (codeOrId, userId, comment) => performAction(codeOrId, userId, "APPROVE", comment);
export const rejectQuotation = (codeOrId, userId, comment) => performAction(codeOrId, userId, "REJECT", comment);
export const returnForRevision = (codeOrId, userId, comment) => performAction(codeOrId, userId, "RETURN", comment);
