import * as quotationService from "../services/quotationService.js";
import * as approvalService from "../services/approvalService.js";

export const getQuotations = async (req, res, next) => {
    try {
        const { status } = req.query;
        const ownerId = req.user.role === "sales_rep" ? req.user.userId : undefined;
        const ownerRole = req.user.role === "sales_manager" ? "sales_rep" : undefined;
        const quotes = await quotationService.getAllQuotations({ status, ownerId, ownerRole });
        res.status(200).json({
            success: true,
            data: quotes
        });
    } catch (err) {
        next(err);
    }
};

export const getQuotation = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const quote = await quotationService.getQuotationByCodeOrId(quotationId);

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: `Quotation '${quotationId}' not found`
            });
        }
        if (req.user.role === "sales_rep" && Number(quote.userId) !== Number(req.user.userId)) {
            return res.status(403).json({ success: false, message: "You can only access your own quotations" });
        }

        res.status(200).json({
            success: true,
            data: quote
        });
    } catch (err) {
        next(err);
    }
};

export const createQuotation = async (req, res, next) => {
    try {
        const quote = await quotationService.createQuotation({
            ...req.body,
            userId: req.user.userId
        });
        res.status(201).json({
            success: true,
            message: "Quotation created successfully",
            data: quote
        });
    } catch (err) {
        next(err);
    }
};

export const updateQuotation = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const quote = await quotationService.updateQuotation(quotationId, req.body, req.user.userId);
        res.status(200).json({
            success: true,
            message: "Quotation updated successfully",
            data: quote
        });
    } catch (err) {
        next(err);
    }
};

export const previewQuotation = async (req, res, next) => {
    try {
        const { customerId, priceListId, items } = req.body;
        const calculation = await quotationService.previewQuotation({ customerId, priceListId, items });
        res.status(200).json({ success: true, data: calculation });
    } catch (err) {
        next(err);
    }
};

export const submitQuotation = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const quote = await approvalService.submitQuotation(quotationId, req.user.userId);

        res.status(200).json({
            success: true,
            message: `Quotation submitted. Status: ${quote.status}, Approval Stage: ${quote.approvalStage}`,
            data: quote
        });
    } catch (err) {
        next(err);
    }
};

export const getRecommendations = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const quote = await quotationService.getQuotationByCodeOrId(quotationId);
        if (!quote) return res.status(404).json({ success: false, message: "Quotation not found" });
        if (req.user.role === "sales_rep" && Number(quote.userId) !== Number(req.user.userId)) return res.status(403).json({ success: false, message: "You can only access your own quotation recommendations" });
        const recs = await quotationService.getUpsellRecommendations(quotationId);
        res.status(200).json({
            success: true,
            data: recs
        });
    } catch (err) {
        next(err);
    }
};
