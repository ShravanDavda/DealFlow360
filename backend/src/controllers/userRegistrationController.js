import * as service from "../services/userRegistrationService.js";

export const list = async (req, res, next) => {
    try {
        res.json({ success: true, data: await service.getPendingRegistrations() });
    } catch (error) {
        next(error);
    }
};

export const count = async (req, res, next) => {
    try {
        res.json({ success: true, data: { count: await service.getPendingRegistrationCount() } });
    } catch (error) {
        next(error);
    }
};

export const createAdmin = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) return res.status(400).json({ success: false, message: "Full name, email and password are required" });
        res.status(201).json({ success: true, message: "Admin user created", data: await service.createAdminUser({ fullName, email, password }) });
    } catch (error) {
        next(error);
    }
};

export const approve = async (req, res, next) => {
    try {
        res.json({ success: true, message: "Registration approved", data: await service.approveRegistration(req.params.id) });
    } catch (error) {
        next(error);
    }
};

export const reject = async (req, res, next) => {
    try {
        res.json({ success: true, message: "Registration rejected", data: await service.rejectRegistration(req.params.id) });
    } catch (error) {
        next(error);
    }
};
