import pool from "../config/db.js";

export const createNotification = async ({
    userId = null,
    customerId = null,
    quotationId = null,
    title,
    message,
    link = null,
    client = null
}) => {
    if (!title || !message) {
        throw new Error("Notification title and message are required");
    }

    const db = client || pool;

    // Check duplicate within the last 10 seconds to prevent double notification
    const dupCheck = await db.query(
        `SELECT id FROM notifications
         WHERE (quotation_id = $1 OR (quotation_id IS NULL AND $1 IS NULL))
           AND title = $2
           AND message = $3
           AND (user_id = $4 OR (user_id IS NULL AND $4 IS NULL))
           AND (customer_id = $5 OR (customer_id IS NULL AND $5 IS NULL))
           AND created_at >= NOW() - INTERVAL '10 seconds'
         LIMIT 1`,
        [quotationId, title, message, userId, customerId]
    );

    if (dupCheck.rows.length > 0) {
        return dupCheck.rows[0];
    }

    const { rows } = await db.query(
        `INSERT INTO notifications (user_id, customer_id, quotation_id, title, message, link, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING id, user_id AS "userId", customer_id AS "customerId", quotation_id AS "quotationId",
                   title, message, link, is_read AS "isRead", created_at AS "createdAt"`,
        [userId, customerId, quotationId, title, message, link]
    );

    return rows[0];
};

export const getNotifications = async ({ userId, customerId, role, limit = 50 }) => {
    const isCustomer = role === "customer" || customerId;
    let query;
    let params;

    if (isCustomer) {
        query = `
            SELECT id, user_id AS "userId", customer_id AS "customerId", quotation_id AS "quotationId",
                   title, message, link, is_read AS "isRead", created_at AS "createdAt"
            FROM notifications
            WHERE (customer_id = $1 OR user_id = $2)
            ORDER BY created_at DESC
            LIMIT $3
        `;
        params = [customerId || -1, userId || -1, limit];
    } else {
        query = `
            SELECT id, user_id AS "userId", customer_id AS "customerId", quotation_id AS "quotationId",
                   title, message, link, is_read AS "isRead", created_at AS "createdAt"
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        params = [userId || -1, limit];
    }

    const { rows } = await pool.query(query, params);

    // Count unread
    let countQuery;
    let countParams;
    if (isCustomer) {
        countQuery = `
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE (customer_id = $1 OR user_id = $2) AND is_read = FALSE
        `;
        countParams = [customerId || -1, userId || -1];
    } else {
        countQuery = `
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE user_id = $1 AND is_read = FALSE
        `;
        countParams = [userId || -1];
    }

    const countRes = await pool.query(countQuery, countParams);
    const unreadCount = Number(countRes.rows[0]?.count || 0);

    return {
        unreadCount,
        count: rows.length,
        data: rows
    };
};

export const markAsRead = async ({ id, userId, customerId, role }) => {
    const isCustomer = role === "customer" || customerId;
    let query;
    let params;

    if (isCustomer) {
        query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1 AND (customer_id = $2 OR user_id = $3)
            RETURNING id, is_read AS "isRead"
        `;
        params = [id, customerId || -1, userId || -1];
    } else {
        query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1 AND user_id = $2
            RETURNING id, is_read AS "isRead"
        `;
        params = [id, userId || -1];
    }

    const { rows } = await pool.query(query, params);
    return rows[0] || null;
};

export const markAllAsRead = async ({ userId, customerId, role }) => {
    const isCustomer = role === "customer" || customerId;
    let query;
    let params;

    if (isCustomer) {
        query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE (customer_id = $1 OR user_id = $2) AND is_read = FALSE
            RETURNING id
        `;
        params = [customerId || -1, userId || -1];
    } else {
        query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING id
        `;
        params = [userId || -1];
    }

    const { rows } = await pool.query(query, params);
    return { updatedCount: rows.length };
};
