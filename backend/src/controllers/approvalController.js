import * as approvalService from "../services/approvalService.js";

const cleanApprovalId = (value) => value.replace(/^A-/, "");

export const getApprovals = async (req, res, next) => {
    try {
        const { role, status } = req.query;
        const ownerId = req.user.role === "sales_rep" ? req.user.userId : undefined;
        const approvalRole = req.user.role === "sales_manager" ? "Sales Manager" : req.user.role === "finance" ? "Finance" : req.user.role === "operations" ? "Operations" : role;
        const ownerRole = req.user.role === "sales_manager" ? "sales_rep" : undefined;
        const result = await approvalService.getApprovals({ role: approvalRole, status, ownerId, ownerRole });
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const getApprovalDetail = async (req, res, next) => {
    try {
        const { approvalId } = req.params;
        const result = await approvalService.getApprovalDetail(cleanApprovalId(approvalId));
        if (req.user.role === "sales_rep" && Number(result?.userId) !== Number(req.user.userId)) {
            return res.status(403).json({ success: false, message: "You can only access your own approvals" });
        }
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const approve = async (req, res, next) => {
    try {
        if (req.user.role === "sales_rep") return res.status(403).json({ success: false, message: "This role cannot approve quotations" });
        const { approvalId } = req.params;
        const result = await approvalService.approveQuotation(cleanApprovalId(approvalId), req.user.userId, req.body.comment || req.body.note);

        res.status(200).json({
            success: true,
            message: "Quotation approved successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const reject = async (req, res, next) => {
    try {
        if (req.user.role === "sales_rep") return res.status(403).json({ success: false, message: "This role cannot reject quotations" });
        const { approvalId } = req.params;
        const result = await approvalService.rejectQuotation(cleanApprovalId(approvalId), req.user.userId, req.body.comment || req.body.reason);

        res.status(200).json({
            success: true,
            message: "Quotation rejected",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const returnForRevision = async (req, res, next) => {
    try {
        if (req.user.role === "sales_rep") return res.status(403).json({ success: false, message: "This role cannot return quotations for revision" });
        const { approvalId } = req.params;
        const result = await approvalService.returnForRevision(cleanApprovalId(approvalId), req.user.userId, req.body.comment || req.body.note);

        res.status(200).json({
            success: true,
            message: "Quotation returned for revision",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const getApproval = async (req, res, next) => {
    try {
        const result = await approvalService.getApproval(req.params.quotationId);
        if (req.user.role === "sales_rep" && Number(result?.userId) !== Number(req.user.userId)) {
            return res.status(403).json({ success: false, message: "You can only access your own approvals" });
        }
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

export const submit = async (req, res, next) => {
    try {
        const result = await approvalService.submitQuotation(req.params.quotationId, req.user.userId);
        res.status(200).json({ success: true, message: "Quotation submitted", data: result });
    } catch (err) { next(err); }
};
