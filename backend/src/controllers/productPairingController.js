import * as pairingService from "../services/productPairingService.js";

export const listPairings = async (req, res, next) => {
    try {
        const { sourceProductId, type, isActive, search } = req.query;
        const pairings = await pairingService.getAllPairings({
            sourceProductId,
            type,
            isActive,
            search
        });
        res.status(200).json({
            success: true,
            count: pairings.length,
            data: pairings
        });
    } catch (err) {
        next(err);
    }
};

export const getPairing = async (req, res, next) => {
    try {
        const pairing = await pairingService.getPairingById(req.params.id);
        res.status(200).json({
            success: true,
            data: pairing
        });
    } catch (err) {
        next(err);
    }
};

export const createPairing = async (req, res, next) => {
    try {
        const pairing = await pairingService.createPairing(req.body);
        res.status(201).json({
            success: true,
            message: "Product relationship created successfully",
            data: pairing
        });
    } catch (err) {
        next(err);
    }
};

export const updatePairing = async (req, res, next) => {
    try {
        const pairing = await pairingService.updatePairing(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Product relationship updated successfully",
            data: pairing
        });
    } catch (err) {
        next(err);
    }
};

export const deactivatePairing = async (req, res, next) => {
    try {
        const pairing = await pairingService.deactivatePairing(req.params.id);
        res.status(200).json({
            success: true,
            message: "Product relationship deactivated successfully",
            data: pairing
        });
    } catch (err) {
        next(err);
    }
};

export const deletePairing = async (req, res, next) => {
    try {
        const hard = req.query.hard === "true";
        const result = await pairingService.deletePairing(req.params.id, { hard });
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (err) {
        next(err);
    }
};

export const getRecommendationsForProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId || req.params.id;
        const recommendations = await pairingService.getActiveRecommendationsForProduct(productId);
        res.status(200).json({
            success: true,
            data: recommendations
        });
    } catch (err) {
        next(err);
    }
};
