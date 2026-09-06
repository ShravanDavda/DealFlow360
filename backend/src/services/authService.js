import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const registerUser = async ({
    username,
    email,
    password,
    firstName,
    lastName,
    role
}) => {
    const allowedRequestedRoles = new Set(["sales_rep", "sales_manager", "finance", "operations"]);
    if (!allowedRequestedRoles.has(role)) {
        throw new Error("A valid non-admin role is required");
    }

    const existingUser = await pool.query(
        `
        SELECT id
        FROM users
        WHERE username = $1 OR email = $2
        `,
        [username, email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("Username or email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `
        INSERT INTO users (
            username,
            email,
            password_hash,
            role,
            requested_role,
            first_name,
            last_name,
            is_active,
            registration_status,
            status
        )
        VALUES ($1, $2, $3, 'sales_rep', $4, $5, $6, FALSE, 'PENDING', 'pending')
        RETURNING
            id,
            username,
            email,
            role,
            requested_role,
            first_name,
            last_name,
            is_active,
            created_at
        `,
        [
            username,
            email,
            passwordHash,
            role,
            firstName || null,
            lastName || null
        ]
    );

    return { ...result.rows[0], message: "Registration submitted for admin approval" };
};

const activateCustomer = async ({ email, activationCode, password, confirmPassword }) => {
    if (!email || !activationCode || !password) {
        const err = new Error("Email, activation code, and password are required");
        err.statusCode = 400;
        throw err;
    }

    if (confirmPassword && password !== confirmPassword) {
        const err = new Error("Passwords do not match");
        err.statusCode = 400;
        throw err;
    }

    if (password.length < 6) {
        const err = new Error("Password must be at least 6 characters");
        err.statusCode = 400;
        throw err;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = activationCode.trim().toUpperCase();

    const userRes = await pool.query(
        `SELECT u.*, c.id AS cust_id, c.is_active AS cust_is_active
         FROM users u
         LEFT JOIN customers c ON u.customer_id = c.id
         WHERE LOWER(u.email) = $1`,
        [trimmedEmail]
    );

    if (userRes.rows.length === 0) {
        const err = new Error("Invalid email or activation code");
        err.statusCode = 400;
        throw err;
    }

    const user = userRes.rows[0];

    if (user.role !== "customer") {
        const err = new Error("Only customer portal accounts can be activated through this portal");
        err.statusCode = 400;
        throw err;
    }

    if (user.status === "active" && user.password_hash) {
        const err = new Error("Account has already been activated. Please log in directly.");
        err.statusCode = 400;
        throw err;
    }

    if (!user.activation_code_hash) {
        const err = new Error("Activation code has already been used or is invalid. Please contact support.");
        err.statusCode = 400;
        throw err;
    }

    const codeHash = crypto.createHash("sha256").update(trimmedCode).digest("hex");
    if (codeHash !== user.activation_code_hash) {
        const err = new Error("Invalid activation code. Please verify the code and try again.");
        err.statusCode = 400;
        throw err;
    }

    if (user.activation_expires_at && new Date() > new Date(user.activation_expires_at)) {
        const err = new Error("Activation code has expired. Please contact your administrator for a new code.");
        err.statusCode = 400;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let targetCustomerId = user.customer_id;
    if (!targetCustomerId) {
        const custLookup = await pool.query(
            "SELECT id FROM customers WHERE LOWER(email) = $1",
            [trimmedEmail]
        );
        if (custLookup.rows.length > 0) {
            targetCustomerId = custLookup.rows[0].id;
        }
    }

    const updateRes = await pool.query(
        `UPDATE users
         SET password_hash = $1,
             status = 'active',
             is_active = TRUE,
             registration_status = 'APPROVED',
             activated_at = CURRENT_TIMESTAMP,
             activation_code_hash = NULL,
             activation_expires_at = NULL,
             customer_id = COALESCE(customer_id, $2)
         WHERE id = $3
         RETURNING id, username, email, role, customer_id, status`,
        [passwordHash, targetCustomerId, user.id]
    );

    if (targetCustomerId) {
        await pool.query(
            "UPDATE customers SET password_hash = $1 WHERE id = $2",
            [passwordHash, targetCustomerId]
        );
    }

    return {
        success: true,
        message: "Customer account activated successfully! You may now log in.",
        user: {
            id: updateRes.rows[0].id,
            email: updateRes.rows[0].email,
            status: "active"
        }
    };
};

const loginUser = async ({ email, password }) => {
    const trimmedEmail = email.trim().toLowerCase();

    let result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE LOWER(email) = $1
        `,
        [trimmedEmail]
    );

    let user = result.rows[0];
    let customerId = user?.customer_id;

    if (user) {
        if (user.status === "pending_activation") {
            const err = new Error("Account is pending activation. Please activate your account using your activation code.");
            err.statusCode = 403;
            throw err;
        }

        if (!user.is_active || user.registration_status !== "APPROVED") {
            const err = new Error("Account is inactive or pending approval");
            err.statusCode = 401;
            throw err;
        }

        if (!user.password_hash) {
            const err = new Error("Account has not set a password. Please activate your account first.");
            err.statusCode = 403;
            throw err;
        }
    }

    if (!user) {
        const custResult = await pool.query(
            `
            SELECT *
            FROM customers
            WHERE LOWER(email) = $1
            AND is_active = TRUE
            `,
            [trimmedEmail]
        );

        if (custResult.rows.length > 0) {
            const customer = custResult.rows[0];
            if (customer.password_hash) {
                const passwordMatch = await bcrypt.compare(password, customer.password_hash);
                if (passwordMatch) {
                    const userUpsert = await pool.query(
                        `
                        INSERT INTO users (username, email, password_hash, role, requested_role, first_name, last_name, is_active, registration_status, customer_id, status)
                        VALUES ($1, $2, $3, 'customer', 'customer', $4, $5, TRUE, 'APPROVED', $6, 'active')
                        ON CONFLICT (email) DO UPDATE
                        SET customer_id = EXCLUDED.customer_id, role = 'customer', status = 'active'
                        RETURNING *
                        `,
                        [
                            customer.customer_code.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                            customer.email,
                            customer.password_hash,
                            customer.contact_name || 'Customer',
                            customer.company_name,
                            customer.id
                        ]
                    );
                    user = userUpsert.rows[0];
                    customerId = customer.id;
                }
            }
        }
    }

    if (!user) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    if (user.role === 'customer' && !customerId) {
        const cRes = await pool.query("SELECT id FROM customers WHERE LOWER(email) = $1", [user.email.toLowerCase()]);
        if (cRes.rows[0]) {
            customerId = cRes.rows[0].id;
            await pool.query("UPDATE users SET customer_id = $1 WHERE id = $2", [customerId, user.id]);
        }
    }

    const tokenPayload = {
        userId: user.id,
        role: user.role
    };
    if (customerId) {
        tokenPayload.customerId = customerId;
    }

    const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );

    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            customerId: customerId || undefined,
            firstName: user.first_name,
            lastName: user.last_name
        }
    };
};

export {
    registerUser,
    loginUser,
    activateCustomer
};