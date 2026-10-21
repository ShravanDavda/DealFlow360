import * as notificationService from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { limit, unreadOnly } = req.query;
        const result = await notificationService.getUserNotifications(userId, {
            limit: limit ? Number(limit) : 20,
            unreadOnly: unreadOnly === "true" || unreadOnly === true
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await notificationService.markAsRead(id, userId);

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await notificationService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (err) {
        next(err);
    }
};
