import * as dealHealthService from "../services/dealHealthService.js";

export const getDealHealth = async (req, res, next) => {
    try {
        const data = await dealHealthService.getDealHealthData();
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const escalate = async (req, res, next) => {
    try {
        const { dealId } = req.params;
        const result = await dealHealthService.escalateDeal(dealId, req.body);
        res.status(200).json({
            success: true,
            message: "Deal escalation initiated",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const nudge = async (req, res, next) => {
    try {
        const { dealId } = req.params;
        const result = await dealHealthService.nudgeRep(dealId, req.body);
        res.status(200).json({
            success: true,
            message: "Rep nudge sent",
            data: result
        });
    } catch (err) {
        next(err);
    }
};
