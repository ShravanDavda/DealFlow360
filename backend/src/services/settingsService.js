import pool from "../config/db.js";

export const getDiscountApprovalSettings = async () => {
    const tierRes = await pool.query(`
        SELECT id, name, default_discount_ceiling AS "maxDiscountPercent"
        FROM customer_tiers
        ORDER BY id ASC
    `);

    const catRes = await pool.query(`
        SELECT id, name, discount_ceiling AS "maxDiscountPercent"
        FROM categories
        ORDER BY id ASC
    `);

    const chainRes = await pool.query(`
        SELECT ac.id, ac.name,
               ac.min_discount_percent AS "minDiscountPercent",
               ac.max_discount_percent AS "maxDiscountPercent",
               ac.min_risk AS "minRisk",
               COALESCE(string_agg(acs.approver_role, ' then ' ORDER BY acs.step_order), 'No approval') AS "approvalChain"
        FROM approval_chains ac
        LEFT JOIN approval_chain_steps acs ON acs.approval_chain_id = ac.id
        WHERE ac.is_active = TRUE
        GROUP BY ac.id
        ORDER BY ac.min_discount_percent, ac.id
    `);

    const approvalRules = chainRes.rows.map((rule) => ({
        id: String(rule.id),
        discountRange: `${rule.minDiscountPercent}% to ${rule.maxDiscountPercent ?? 'above'}${rule.minRisk ? ` (${rule.minRisk} risk)` : ''}`,
        approvalChain: rule.approvalChain
    }));

    return {
        tiers: tierRes.rows.map((r) => ({
            id: String(r.id),
            name: r.name,
            maxDiscountPercent: Number(r.maxDiscountPercent)
        })),
        categories: catRes.rows.map((r) => ({
            id: String(r.id),
            name: r.name,
            maxDiscountPercent: Number(r.maxDiscountPercent)
        })),
        approvalRules
    };
};

export const updateDiscountApprovalSettings = async ({ tiers = [], categories = [] }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const t of tiers) {
            await client.query(
                `
                UPDATE customer_tiers
                SET default_discount_ceiling = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 OR LOWER(name) = LOWER($3)
                `,
                [Number(t.maxDiscountPercent), isNaN(Number(t.id)) ? -1 : Number(t.id), t.name || ""]
            );
        }

        for (const c of categories) {
            await client.query(
                `
                UPDATE categories
                SET discount_ceiling = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 OR LOWER(name) = LOWER($3)
                `,
                [Number(c.maxDiscountPercent), isNaN(Number(c.id)) ? -1 : Number(c.id), c.name || ""]
            );
        }

        await client.query("COMMIT");
        return getDiscountApprovalSettings();
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
