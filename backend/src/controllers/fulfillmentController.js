import * as fulfillmentService from "../services/fulfillmentService.js";

export const getFulfillmentOrders = async (req, res, next) => {
    try {
        const orders = await fulfillmentService.getAllFulfillmentOrders();
        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (err) {
        next(err);
    }
};

export const getFulfillmentDetail = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const detail = await fulfillmentService.getFulfillmentDetail(orderId);
        res.status(200).json({
            success: true,
            data: detail
        });
    } catch (err) {
        next(err);
    }
};

export const acceptSplit = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const detail = await fulfillmentService.acceptSplit(orderId);
        res.status(200).json({
            success: true,
            message: "Suggested warehouse split accepted",
            data: detail
        });
    } catch (err) {
        next(err);
    }
};

export const manualOverride = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const detail = await fulfillmentService.manualOverride(orderId, req.body);
        res.status(200).json({
            success: true,
            message: "Manual split override saved",
            data: detail
        });
    } catch (err) {
        next(err);
    }
};

export const consolidateBackorder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const detail = await fulfillmentService.consolidateBackorder(orderId);
        res.status(200).json({
            success: true,
            message: "Remaining backorder consolidated into single shipment",
            data: detail
        });
    } catch (err) {
        next(err);
    }
};
