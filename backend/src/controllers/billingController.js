import * as billingService from "../services/billingService.js";

export const getSubscriptions = async (req, res, next) => {
    try {
        const subs = await billingService.getAllSubscriptions();
        res.status(200).json({ success: true, data: subs });
    } catch (err) {
        next(err);
    }
};

export const getSubscriptionDetail = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const detail = await billingService.getSubscriptionDetail(subscriptionId);
        if (!detail) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }
        res.status(200).json({ success: true, data: detail });
    } catch (err) {
        next(err);
    }
};

export const modifySubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const updated = await billingService.modifySubscription(subscriptionId, req.body);
        res.status(200).json({ success: true, message: "Subscription modified", data: updated });
    } catch (err) {
        next(err);
    }
};

export const cancelSubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const cancelled = await billingService.cancelSubscription(subscriptionId, req.body);
        res.status(200).json({ success: true, message: "Subscription cancelled", data: cancelled });
    } catch (err) {
        next(err);
    }
};

export const getInvoices = async (req, res, next) => {
    try {
        const invoices = await billingService.getAllInvoices();
        res.status(200).json({ success: true, data: invoices });
    } catch (err) {
        next(err);
    }
};

export const getInvoiceDetail = async (req, res, next) => {
    try {
        const { invoiceId } = req.params;
        const detail = await billingService.getInvoiceDetail(invoiceId);
        if (!detail) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }
        res.status(200).json({ success: true, data: detail });
    } catch (err) {
        next(err);
    }
};

export const recordPayment = async (req, res, next) => {
    try {
        const { invoiceId } = req.params;
        const updated = await billingService.recordPayment(invoiceId, req.body);
        res.status(200).json({
            success: true,
            message: "Payment recorded successfully",
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

export const generateInvoice = async (req, res, next) => {
    try {
        const quotationId = req.body.quotationId || req.body.quoteId;
        if (!quotationId) return res.status(400).json({ success: false, message: "quotationId is required" });
        const generated = await billingService.generateInvoicesForQuotation(quotationId);
        res.status(200).json({ success: true, message: "Billing records generated", data: generated });
    } catch (err) {
        next(err);
    }
};
