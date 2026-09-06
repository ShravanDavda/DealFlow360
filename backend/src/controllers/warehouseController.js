import * as warehouseService from "../services/warehouseService.js";

export const listWarehouses = async (req, res, next) => {
    try { res.json({ success: true, data: await warehouseService.getWarehouses() }); } catch (error) { next(error); }
};

export const getWarehouse = async (req, res, next) => {
    try {
        const data = await warehouseService.getWarehouse(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "Warehouse not found" });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

export const createWarehouse = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await warehouseService.createWarehouse(req.body) }); } catch (error) { next(error); }
};

export const updateWarehouse = async (req, res, next) => {
    try { res.json({ success: true, data: await warehouseService.updateWarehouse(req.params.id, req.body) }); } catch (error) { next(error); }
};

export const upsertInventory = async (req, res, next) => {
    try { res.json({ success: true, data: await warehouseService.upsertInventory(req.params.id, req.body) }); } catch (error) { next(error); }
};

export const deactivateWarehouse = async (req, res, next) => {
    try { res.json({ success: true, data: await warehouseService.deactivateWarehouse(req.params.id) }); } catch (error) { next(error); }
};