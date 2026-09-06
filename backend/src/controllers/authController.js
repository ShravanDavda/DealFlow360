import pool from "../config/db.js";

import {
    registerUser,
    loginUser,
    activateCustomer
} from "../services/authService.js";

const register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            firstName,
            lastName,
            role
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required"
            });
        }

        const user = await registerUser({
            username,
            email,
            password,
            firstName,
            lastName,
            role
        });

        res.status(201).json({
            success: true,
            message: "Registration submitted for admin approval",
            data: user
        });
    } catch (error) {
        console.error("Register error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await loginUser({
            email,
            password
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: result
        });
    } catch (error) {
        console.error("Login error:", error);

        const status = error.statusCode || 401;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

const activateCustomerAccount = async (req, res) => {
    try {
        const {
            email,
            activationCode,
            password,
            confirmPassword
        } = req.body;

        if (!email || !activationCode || !password) {
            return res.status(400).json({
                success: false,
                message: "Email, activation code, and password are required"
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const result = await activateCustomer({
            email,
            activationCode,
            password,
            confirmPassword
        });

        res.status(200).json({
            success: true,
            message: result.message || "Customer account activated successfully",
            data: result
        });
    } catch (error) {
        console.error("Activate customer error:", error);
        const status = error.statusCode || 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                u.id,
                u.username,
                u.email,
                u.role,
                u.first_name,
                u.last_name,
                u.is_active,
                u.customer_id,
                c.company_name
            FROM users u
            LEFT JOIN customers c ON u.customer_id = c.id
            WHERE u.id = $1
            `,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userRow = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
                ...userRow,
                customerId: userRow.customer_id,
                companyName: userRow.company_name
            }
        });
    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get current user"
        });
    }
};

export {
    register,
    login,
    activateCustomerAccount,
    getCurrentUser
};