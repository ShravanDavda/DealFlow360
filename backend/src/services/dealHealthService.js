import pool from "../config/db.js";

export const getDealHealthData = async () => {
    const stalledRes = await pool.query(`
        SELECT COUNT(*) 
        FROM quotations 
        WHERE status IN ('Draft', 'Under Negotiation', 'Pending Approval')
    `);

    const anomaliesRes = await pool.query(`
        SELECT COUNT(*) 
        FROM quotations 
        WHERE total_discount > 1000 OR blended_risk_score = 'HIGH'
    `);

    const slippageRes = await pool.query(`
        SELECT COUNT(*)
        FROM fulfillment_orders
        WHERE status != 'Fulfilled'
    `);

    const listRes = await pool.query(`
        SELECT 
            dha.id,
            dha.quotation_id AS "quotationId",
            q.quote_code AS "dealId",
            dha.customer_name AS "deal",
            dha.issue_description AS "issue",
            to_char(dha.flagged_date, 'Mon DD') AS "flaggedDate",
            dha.action_note AS "action",
            dha.status
        FROM deal_health_anomalies dha
        LEFT JOIN quotations q ON dha.quotation_id = q.id
        ORDER BY dha.id DESC
    `);

    const summary = {
        stalledDeals: Number(stalledRes.rows[0]?.count ?? 0),
        discountAnomalies: Number(anomaliesRes.rows[0]?.count ?? 0),
        deliverySlippage: Number(slippageRes.rows[0]?.count ?? 0)
    };

    const anomalies = listRes.rows.map((r) => ({
        id: `DH-00${r.id}`,
        dbId: r.id,
        dealId: r.dealId || `Q-${r.quotationId}`,
        deal: r.deal,
        issue: r.issue,
        flaggedDate: r.flaggedDate,
        action: r.action
    }));

    return {
        summary,
        anomalies
    };
};

export const escalateDeal = async (dealId, { reason = "Escalated to Sales Manager for margin justification" } = {}) => {
    const res = await pool.query(
        `
        UPDATE deal_health_anomalies
        SET status = 'ESCALATED', action_note = $1, updated_at = CURRENT_TIMESTAMP
        WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = $2)
           OR id = CASE WHEN $2 ~ '^[0-9]+$' THEN $2::int ELSE NULL END
        RETURNING *
        `,
        [reason, dealId]
    );

    return {
        dealId,
        status: "ESCALATED",
        actionNote: reason
    };
};

export const nudgeRep = async (dealId, { message = "Automated reminder sent to assigned Sales Rep" } = {}) => {
    const res = await pool.query(
        `
        UPDATE deal_health_anomalies
        SET status = 'NUDGED', action_note = $1, updated_at = CURRENT_TIMESTAMP
        WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = $2)
           OR id = CASE WHEN $2 ~ '^[0-9]+$' THEN $2::int ELSE NULL END
        RETURNING *
        `,
        [message, dealId]
    );

    return {
        dealId,
        status: "NUDGED",
        actionNote: message
    };
};
