import * as notificationService from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const limit = Number(req.query.limit) || 50;

        const result = await notificationService.getNotifications({
            userId,
            customerId,
            role,
            limit
        });

        res.status(200).json({
            success: true,
            unreadCount: result.unreadCount,
            count: result.count,
            notifications: result.data,
            data: {
                notifications: result.data,
                unreadCount: result.unreadCount
            }
        });
    } catch (err) {
        next(err);
    }
};

export const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || req.user?.id;
        const customerId = req.user?.customerId;
        const role = req.user?.role;

        const updated = await notificationService.markAsRead({
            id: Number(id),
            userId,
            customerId,
            role
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or access denied"
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

export const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const customerId = req.user?.customerId;
        const role = req.user?.role;

        const result = await notificationService.markAllAsRead({
            userId,
            customerId,
            role
        });

        res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            data: result
        });
    } catch (err) {
        next(err);
    }
};
