import * as customerPortalService from "../services/customerPortalService.js";

export const getCustomerQuotes = async (req, res, next) => {
    try {
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const quotes = await customerPortalService.getCustomerQuotes(customerId, role);
        res.status(200).json({
            success: true,
            count: quotes.length,
            data: quotes
        });
    } catch (err) {
        next(err);
    }
};

export const getCustomerQuote = async (req, res, next) => {
    try {
        const { quoteId } = req.params;
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const quote = await customerPortalService.getCustomerQuote(quoteId, customerId, role);

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: `Quotation '${quoteId}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: quote
        });
    } catch (err) {
        next(err);
    }
};

export const getNegotiationHistory = async (req, res, next) => {
    try {
        const { quoteId } = req.params;
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const history = await customerPortalService.getNegotiationHistory(quoteId, customerId, role);

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (err) {
        next(err);
    }
};

export const submitNegotiation = async (req, res, next) => {
    try {
        const { quoteId } = req.params;
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const result = await customerPortalService.submitCustomerNegotiation(
            quoteId,
            customerId,
            role,
            req.body
        );
        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const confirmQuote = async (req, res, next) => {
    try {
        const { quoteId } = req.params;
        const customerId = req.user?.customerId;
        const role = req.user?.role;
        const result = await customerPortalService.confirmCustomerQuote(
            quoteId,
            customerId,
            role
        );
        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (err) {
        next(err);
    }
};
