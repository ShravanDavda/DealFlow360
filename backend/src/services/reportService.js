import pool from "../config/db.js";

export const getDashboardSummary = async () => {
    const approvalsRes = await pool.query(`SELECT COUNT(*)::int FROM quotations WHERE status = 'Pending Approval'`);
    const openQuotesRes = await pool.query(`SELECT COUNT(*)::int FROM quotations WHERE status IN ('Draft', 'Under Negotiation', 'Pending Approval')`);
    const atRiskRes = await pool.query(`SELECT COUNT(*)::int FROM quotations WHERE blended_risk_score = 'HIGH' OR total_discount > 1000`);

    const auditRes = await pool.query(`
        SELECT q.quote_code, c.company_name, qa.user_name, qa.action, qa.note, to_char(qa.created_at, 'Mon DD') AS date
        FROM quotation_audit_trail qa
        JOIN quotations q ON qa.quotation_id = q.id
        JOIN customers c ON q.customer_id = c.id
        ORDER BY qa.id DESC
        LIMIT 5
    `);

    const activities = auditRes.rows.map(
        (r) => `${r.company_name} quotation (${r.quote_code}): ${r.action} (${r.note || "status updated"})`
    );

    return {
        pendingApprovals: Number(approvalsRes.rows[0]?.count ?? 0),
        openQuotations: Number(openQuotesRes.rows[0]?.count ?? 0),
        atRiskDeals: Number(atRiskRes.rows[0]?.count ?? 0),
        recentActivities: activities
    };
};

const buildReportConditions = ({ period = "This Month", approvalStatus = "All", product = "All Products" } = {}) => {
    const conditions = [];
    const params = [];

    if (period === "This Month") {
        conditions.push(`q.created_at >= date_trunc('month', CURRENT_TIMESTAMP)`);
    } else if (period === "Last Month") {
        conditions.push(`q.created_at >= date_trunc('month', CURRENT_TIMESTAMP - interval '1 month') AND q.created_at < date_trunc('month', CURRENT_TIMESTAMP)`);
    } else if (period === "This Quarter") {
        conditions.push(`q.created_at >= date_trunc('quarter', CURRENT_TIMESTAMP)`);
    }

    if (approvalStatus && approvalStatus !== "All") {
        params.push(approvalStatus === "Pending" ? "Pending Approval" : approvalStatus);
        conditions.push(`q.status = $${params.length}`);
    }

    if (product && product !== "All Products") {
        params.push(product);
        conditions.push(`EXISTS (
            SELECT 1 FROM quotation_items qi
            JOIN products p ON p.id = qi.product_id
            WHERE qi.quotation_id = q.id AND p.name = $${params.length}
        )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereClause, params };
};

export const getFilteredQuotations = async (filters = {}) => {
    const { whereClause, params } = buildReportConditions(filters);
    const query = `
        SELECT q.id, q.quote_code, c.company_name, q.total_amount, q.status, q.blended_risk_score, q.created_at
        FROM quotations q
        JOIN customers c ON c.id = q.customer_id
        ${whereClause}
        ORDER BY q.id DESC
    `;
    const result = await pool.query(query, params);
    return result.rows.map((r) => ({
        quoteCode: r.quote_code,
        customerName: r.company_name,
        amount: Number(r.total_amount || 0).toFixed(2),
        status: r.status,
        risk: r.blended_risk_score || "LOW"
    }));
};

export const getReportMetrics = async (filters = {}) => {
    const { whereClause, params } = buildReportConditions(filters);

    const quotesRes = await pool.query(`SELECT COUNT(DISTINCT q.id)::int AS count FROM quotations q ${whereClause}`, params);
    const quotesCreated = Number(quotesRes.rows[0]?.count ?? 0);

    const avgTimeRes = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (s.acted_at - r.created_at)) / 3600) AS avg_hours
        FROM quotation_approval_steps s
        JOIN quotation_approval_requests r ON s.approval_request_id = r.id
        WHERE s.acted_at IS NOT NULL AND s.status IN ('APPROVED', 'REJECTED')
    `);
    const rawAvg = avgTimeRes.rows[0]?.avg_hours;
    const avgApprovalTime = rawAvg !== null && rawAvg !== undefined && !isNaN(Number(rawAvg))
        ? `${Number(rawAvg).toFixed(1)} hours`
        : "0.0 hours";

    const topItemRes = await pool.query(`
        SELECT p.name, COUNT(*)::int AS count
        FROM quotation_items qi
        JOIN products p ON p.id = qi.product_id
        WHERE qi.is_recurring = TRUE OR qi.product_id IN (SELECT suggested_product_id FROM product_pairings WHERE is_active = TRUE)
        GROUP BY p.id, p.name
        ORDER BY count DESC, p.name ASC
        LIMIT 1
    `);
    let topUpsellProduct = topItemRes.rows[0]?.name;

    if (!topUpsellProduct) {
        const fallbackPairing = await pool.query(`
            SELECT p.name
            FROM product_pairings pp
            JOIN products p ON p.id = pp.suggested_product_id
            WHERE pp.is_active = TRUE
            ORDER BY pp.priority ASC, pp.margin_delta DESC
            LIMIT 1
        `);
        topUpsellProduct = fallbackPairing.rows[0]?.name || "None";
    }

    const productsRes = await pool.query(`SELECT name FROM products WHERE is_active = TRUE ORDER BY name ASC`);
    const dynamicProducts = ["All Products", ...productsRes.rows.map((r) => r.name)];

    return {
        filters: {
            periods: ["This Month", "Last Month", "This Quarter"],
            salesTeams: ["All Teams", "Enterprise", "SMB"],
            approvalStatuses: ["All", "Pending", "Approved", "Returned"],
            products: dynamicProducts
        },
        metrics: {
            quotesCreated,
            avgApprovalTime,
            topUpsellProduct
        }
    };
};

export const getSalesRepDashboard = async (userId) => {
    const userRes = await pool.query(`SELECT id, COALESCE(NULLIF(CONCAT(first_name, ' ', last_name), ' '), username) AS name FROM users WHERE id = $1 AND is_active = TRUE`, [userId]);
    if (!userRes.rows[0]) throw new Error("Authenticated user not found or inactive");

    const metricsRes = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE status IN ('Draft', 'Pending Approval', 'Under Negotiation'))::int AS "openQuotations",
            COUNT(*) FILTER (WHERE status = 'Pending Approval')::int AS "pendingApprovals",
            COUNT(*) FILTER (WHERE status IN ('Approved', 'Confirmed'))::int AS "approvedQuotations",
            COUNT(*) FILTER (WHERE blended_risk_score = 'HIGH')::int AS "atRiskQuotations",
            COUNT(*)::int AS "quotesCreated",
            COUNT(*) FILTER (WHERE status = 'Under Negotiation')::int AS "quotesInNegotiation"
        FROM quotations WHERE user_id = $1`, [userId]);
    const pipelineRes = await pool.query(`SELECT status, COUNT(*)::int AS count FROM quotations WHERE user_id = $1 GROUP BY status`, [userId]);
    const recentRes = await pool.query(`
        SELECT q.id, q.quote_code AS "quoteCode", c.company_name AS "customerName", q.total_amount AS amount,
               q.status, q.blended_risk_score AS risk, q.updated_at AS "updatedAt"
        FROM quotations q JOIN customers c ON c.id = q.customer_id
        WHERE q.user_id = $1 ORDER BY q.updated_at DESC, q.id DESC LIMIT 8`, [userId]);
    const fulfillmentRes = await pool.query(`
        SELECT q.quote_code AS "quoteCode", c.company_name AS "customerName", q.status AS "quotationStatus",
               COALESCE(fo.status, 'Not started') AS "fulfillmentStatus"
        FROM quotations q JOIN customers c ON c.id = q.customer_id
        LEFT JOIN fulfillment_orders fo ON fo.quotation_id = q.id
        WHERE q.user_id = $1 AND q.status IN ('Approved', 'Confirmed')
        ORDER BY q.updated_at DESC LIMIT 6`, [userId]);
    const upsellRes = await pool.query(`
        SELECT DISTINCT suggested.name AS "productName", pp.tag AS reason, pp.margin_delta AS "marginDelta", pp.priority
        FROM quotations q
        JOIN quotation_items qi ON qi.quotation_id = q.id
        JOIN product_pairings pp ON pp.base_product_id = qi.product_id
        JOIN products suggested ON suggested.id = pp.suggested_product_id
        WHERE q.user_id = $1
        ORDER BY pp.priority ASC NULLS LAST LIMIT 6`, [userId]);
    const values = metricsRes.rows[0];
    const pipeline = { Draft: 0, "Pending Approval": 0, Approved: 0, "Under Negotiation": 0, Confirmed: 0 };
    pipelineRes.rows.forEach((row) => { if (row.status in pipeline) pipeline[row.status] = row.count; });
    return {
        user: userRes.rows[0],
        metrics: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)])),
        pipeline,
        recentQuotations: recentRes.rows.map((row) => ({ ...row, amount: Number(row.amount || 0) })),
        fulfillment: fulfillmentRes.rows,
        upsellOpportunities: upsellRes.rows.map((row) => ({ productName: row.productName, reason: row.reason, marginDelta: Number(row.marginDelta || 0) }))
    };
};

export const getSalesManagerDashboard = async () => {
    const metricsRes = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE q.status = 'Pending Approval')::int AS "pendingApprovals",
            COUNT(*) FILTER (WHERE q.status IN ('Draft', 'Pending Approval', 'Under Negotiation'))::int AS "teamOpenQuotations",
            COUNT(*) FILTER (WHERE q.blended_risk_score = 'HIGH')::int AS "atRiskDeals",
            COUNT(*) FILTER (WHERE q.status IN ('Approved', 'Confirmed'))::int AS "teamApprovedQuotations",
            COUNT(*)::int AS "quotesCreated",
            COUNT(*) FILTER (WHERE q.status = 'Under Negotiation')::int AS "quotesInNegotiation"
        FROM quotations q JOIN users u ON u.id = q.user_id WHERE u.role = 'sales_rep'`);
    const pipelineRes = await pool.query(`SELECT q.status, COUNT(*)::int AS count FROM quotations q JOIN users u ON u.id = q.user_id WHERE u.role = 'sales_rep' GROUP BY q.status`);
    const approvalActivityRes = await pool.query(`SELECT q.status, COUNT(*)::int AS count FROM quotations q JOIN users u ON u.id = q.user_id WHERE u.role = 'sales_rep' AND q.status IN ('Pending Approval', 'Approved', 'Returned') GROUP BY q.status`);
    const recentRes = await pool.query(`
        SELECT q.id, q.quote_code AS "quoteCode",
               COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS "salesRep",
               c.company_name AS "customerName", q.total_amount AS amount, q.status,
               q.blended_risk_score AS risk, q.updated_at AS "updatedAt"
        FROM quotations q
        JOIN customers c ON c.id = q.customer_id
        JOIN users u ON u.id = q.user_id
        WHERE u.role = 'sales_rep' ORDER BY q.updated_at DESC, q.id DESC LIMIT 8`);
    const topRepRes = await pool.query(`
        SELECT COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS name, COUNT(*)::int AS count
        FROM quotations q JOIN users u ON u.id = q.user_id
        WHERE u.role = 'sales_rep'
        GROUP BY u.id, u.first_name, u.last_name, u.username
        ORDER BY count DESC, name LIMIT 1`);
    const values = metricsRes.rows[0];
    const pipeline = { Draft: 0, "Pending Approval": 0, Approved: 0, "Under Negotiation": 0, Confirmed: 0 };
    pipelineRes.rows.forEach((row) => { if (row.status in pipeline) pipeline[row.status] = row.count; });
    const activity = { pending: 0, approved: 0, returned: 0 };
    approvalActivityRes.rows.forEach((row) => { activity[row.status === 'Pending Approval' ? 'pending' : row.status.toLowerCase()] = row.count; });
    return {
        metrics: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)])),
        pipeline,
        approvalActivity: activity,
        recentQuotations: recentRes.rows.map((row) => ({ ...row, amount: Number(row.amount || 0) })),
        teamActivity: { quotesCreated: Number(values.quotesCreated || 0), quotesApproved: Number(values.teamApprovedQuotations || 0), quotesInNegotiation: Number(values.quotesInNegotiation || 0), topSalesRep: topRepRes.rows[0]?.name || '--' }
    };
};
