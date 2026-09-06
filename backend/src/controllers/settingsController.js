import * as settingsService from "../services/settingsService.js";

export const getDiscountApprovalSettings = async (req, res, next) => {
    try {
        const settings = await settingsService.getDiscountApprovalSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        next(err);
    }
};

export const updateDiscountApprovalSettings = async (req, res, next) => {
    try {
        const updated = await settingsService.updateDiscountApprovalSettings(req.body);
        res.status(200).json({
            success: true,
            message: "Discount configuration saved successfully",
            data: updated
        });
    } catch (err) {
        next(err);
    }
};
