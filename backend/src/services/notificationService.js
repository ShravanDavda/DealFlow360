import pool from "../config/db.js";
import { sendWorkflowNotificationEmail } from "./emailService.js";

const normalizeApproverRole = (role) => {
    const normalized = String(role || "").trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_").replace(/^salesmanager$/, "sales_manager");
    if (normalized === "sales_manager") return "sales_manager";
    if (normalized === "finance") return "finance";
    if (normalized === "operations") return "finance";
    return normalized;
};

export const createNotification = async (clientOrPool, { userId, title, message, type, quotationId, link }) => {
    const db = clientOrPool || pool;

    if (!userId || !title || !message || !type) {
        return null;
    }

    // Deduplication safeguard: Do not create duplicate unread notifications for the same event within 10 seconds
    const existing = await db.query(
        `SELECT id, user_id AS "userId", title, message, type, quotation_id AS "quotationId", link, is_read AS "isRead", created_at AS "createdAt"
         FROM notifications
         WHERE user_id = $1 AND type = $2 AND (quotation_id = $3 OR ($3 IS NULL AND quotation_id IS NULL))
           AND message = $4 AND is_read = FALSE
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 seconds'
         ORDER BY id DESC LIMIT 1`,
        [userId, type, quotationId || null, message]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const res = await db.query(
        `INSERT INTO notifications (user_id, title, message, type, quotation_id, link)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id AS "userId", title, message, type, quotation_id AS "quotationId", link, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"`,
        [userId, title, message, type, quotationId || null, link || `/quotations/${quotationId || ""}`]
    );

    const notification = res.rows[0];

    // Optional Brevo email notification dispatched without blocking or failing the transaction
    (async () => {
        try {
            const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
            const userEmail = userRes.rows[0]?.email;
            if (userEmail) {
                await sendWorkflowNotificationEmail({
                    email: userEmail,
                    subject: title,
                    title,
                    message,
                    link
                });
            }
        } catch {
            // Ignore email delivery errors to preserve core business execution
        }
    })();

    return notification;
};

export const notifyStageApprovers = async (clientOrPool, { quotationId, stage, title, message, type, link }) => {
    const db = clientOrPool || pool;
    const targetRole = normalizeApproverRole(stage);

    const approvers = await db.query(
        `SELECT id, email FROM users WHERE role = $1 AND is_active = TRUE`,
        [targetRole]
    );

    const notifications = [];
    for (const approver of approvers.rows) {
        const notif = await createNotification(db, {
            userId: approver.id,
            title,
            message,
            type,
            quotationId,
            link: link || `/approvals/${quotationId}`
        });
        if (notif) notifications.push(notif);
    }

    return notifications;
};

export const getUserNotifications = async (userId, { limit = 20, unreadOnly = false } = {}) => {
    const params = [userId];
    let query = `SELECT id, user_id AS "userId", title, message, type, quotation_id AS "quotationId", link, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
                 FROM notifications
                 WHERE user_id = $1`;

    if (unreadOnly) {
        query += " AND is_read = FALSE";
    }

    query += " ORDER BY created_at DESC LIMIT $2";
    params.push(Math.min(100, Math.max(1, Number(limit) || 20)));

    const [listRes, countRes] = await Promise.all([
        pool.query(query, params),
        pool.query("SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE", [userId])
    ]);

    return {
        notifications: listRes.rows,
        unreadCount: countRes.rows[0]?.count || 0
    };
};

export const markAsRead = async (notificationId, userId) => {
    const check = await pool.query(
        "SELECT id, user_id FROM notifications WHERE id = $1",
        [notificationId]
    );

    if (check.rows.length === 0) {
        const err = new Error("Notification not found");
        err.statusCode = 404;
        throw err;
    }

    if (Number(check.rows[0].user_id) !== Number(userId)) {
        const err = new Error("Unauthorized to access this notification");
        err.statusCode = 403;
        throw err;
    }

    const res = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, user_id AS "userId", title, message, type, quotation_id AS "quotationId", link, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"`,
        [notificationId]
    );

    return res.rows[0];
};

export const markAllAsRead = async (userId) => {
    await pool.query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
    );

    return { success: true };
};
