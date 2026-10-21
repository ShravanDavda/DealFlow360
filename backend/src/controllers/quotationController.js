import * as quotationService from "../services/quotationService.js";
import * as approvalService from "../services/approvalService.js";

export const getQuotations = async (req, res, next) => {
    try {
        const { status } = req.query;
        const ownerId = req.user.role === "sales_rep" ? req.user.userId : undefined;
        const ownerRole = req.user.role === "sales_manager" ? "sales_rep" : undefined;
        const customerId = req.user.role === "customer" ? req.user.customerId : undefined;
        const quotes = await quotationService.getAllQuotations({ status, ownerId, ownerRole, customerId });
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
        if (req.user.role === "customer" && Number(quote.customerId) !== Number(req.user.customerId)) {
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
        const quote = await approvalService.submitQuotation(quotationId, req.user.userId, req.body);

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
        if (req.user.role === "customer" && Number(quote.customerId) !== Number(req.user.customerId)) return res.status(403).json({ success: false, message: "You can only access your own quotation recommendations" });
        const recs = await quotationService.getUpsellRecommendations(quotationId);
        res.status(200).json({
            success: true,
            data: recs
        });
    } catch (err) {
        next(err);
    }
};

export const addMessage = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const messageText = req.body?.message || req.body?.comment || req.body?.customerComment;
        const userId = req.user?.userId || req.user?.id;
        const role = req.user?.role;
        const customerId = req.user?.customerId;
        const name = req.user?.name || req.user?.username;

        const messageRecord = await quotationService.addQuotationMessage(
            quotationId,
            { userId, role, name, customerId },
            messageText
        );

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: messageRecord
        });
    } catch (err) {
        next(err);
    }
};

export const getMessages = async (req, res, next) => {
    try {
        const { quotationId } = req.params;
        const userId = req.user?.userId || req.user?.id;
        const role = req.user?.role;
        const customerId = req.user?.customerId;

        const messages = await quotationService.getQuotationMessages(
            quotationId,
            { userId, role, customerId }
        );

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (err) {
        next(err);
    }
};
