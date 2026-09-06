import * as service from "../services/subscriptionPlanService.js";
export const list = async (req, res, next) => { try { res.json({ success: true, data: await service.getPlans() }); } catch (error) { next(error); } };
export const get = async (req, res, next) => { try { const data = await service.getPlan(req.params.id); if (!data) return res.status(404).json({ success: false, message: "Subscription plan not found" }); res.json({ success: true, data }); } catch (error) { next(error); } };
export const create = async (req, res, next) => { try { res.status(201).json({ success: true, data: await service.createPlan(req.body) }); } catch (error) { next(error); } };
export const update = async (req, res, next) => { try { res.json({ success: true, data: await service.updatePlan(req.params.id, req.body) }); } catch (error) { next(error); } };
export const deactivate = async (req, res, next) => { try { res.json({ success: true, data: await service.deactivatePlan(req.params.id) }); } catch (error) { next(error); } };
export const activate = async (req, res, next) => { try { res.json({ success: true, data: await service.activatePlan(req.params.id) }); } catch (error) { next(error); } };
export const remove = async (req, res, next) => { try { res.json({ success: true, data: await service.deletePlan(req.params.id) }); } catch (error) { next(error); } };