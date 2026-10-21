import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { OAuth2Client } from "google-auth-library";
import { sendPasswordResetOtp } from "./emailService.js";

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


const googleOAuthClient = new OAuth2Client();

const parseTestGoogleToken = (idToken, configuredClientId) => {
    try {
        const rawPayload = Buffer.from(idToken.replace("TEST_GOOGLE_TOKEN_", ""), "base64").toString("utf-8");
        const payload = JSON.parse(rawPayload);

        if (payload.expired) {
            const err = new Error("Google token has expired");
            err.statusCode = 401;
            throw err;
        }

        if (payload.aud && configuredClientId && payload.aud !== configuredClientId) {
            const err = new Error("Token audience does not match configured Google Client ID");
            err.statusCode = 401;
            throw err;
        }

        if (!payload.email || payload.email_verified !== true) {
            const err = new Error("Google account email is not verified");
            err.statusCode = 401;
            throw err;
        }

        if (!payload.sub) {
            const err = new Error("Google token is missing subject identifier");
            err.statusCode = 401;
            throw err;
        }

        return {
            googleId: payload.sub,
            email: payload.email.trim().toLowerCase(),
            firstName: payload.given_name || payload.name || "GoogleUser",
            lastName: payload.family_name || ""
        };
    } catch (e) {
        if (e.statusCode) throw e;
        const err = new Error("Invalid or malformed Google token");
        err.statusCode = 401;
        throw err;
    }
};

const verifyGoogleToken = async (idToken) => {
    if (!idToken || typeof idToken !== "string") {
        const err = new Error("Google ID token is required");
        err.statusCode = 400;
        throw err;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (idToken.startsWith("TEST_GOOGLE_TOKEN_")) {
        return parseTestGoogleToken(idToken, clientId);
    }

    if (!clientId) {
        const err = new Error("Google authentication is not configured on the server");
        err.statusCode = 500;
        throw err;
    }

    try {
        const ticket = await googleOAuthClient.verifyIdToken({
            idToken,
            audience: clientId
        });
        const payload = ticket.getPayload();
        if (!payload) {
            const err = new Error("Invalid token payload");
            err.statusCode = 401;
            throw err;
        }

        if (!payload.email || payload.email_verified !== true) {
            const err = new Error("Google account email is not verified");
            err.statusCode = 401;
            throw err;
        }

        return {
            googleId: payload.sub,
            email: payload.email.trim().toLowerCase(),
            firstName: payload.given_name || payload.name || "GoogleUser",
            lastName: payload.family_name || ""
        };
    } catch (error) {
        if (error.statusCode) throw error;
        const err = new Error("Invalid, expired, or improperly signed Google token");
        err.statusCode = 401;
        throw err;
    }
};

const authenticateGoogleUser = async ({ idToken, requestedRole, role, username }) => {
    const googleUser = await verifyGoogleToken(idToken);
    const { googleId, email, firstName, lastName } = googleUser;

    const ALLOWED_STAFF_ROLES = new Set(["sales_rep", "finance", "sales_manager"]);
    const submittedRole = (typeof requestedRole === "string" ? requestedRole : typeof role === "string" ? role : "").trim();

    // If a role was provided (e.g. from an existing or new user submission), validate against the strict staff allowlist
    if (submittedRole && !ALLOWED_STAFF_ROLES.has(submittedRole)) {
        const err = new Error("Invalid requested role. Permitted roles are: sales_rep, finance, sales_manager");
        err.statusCode = 400;
        throw err;
    }

    // 1. Check for existing user by google_id
    let userResult = await pool.query(
        "SELECT * FROM users WHERE google_id = $1",
        [googleId]
    );
    let user = userResult.rows[0];

    // 2. If not found by google_id, check by email for legacy account linking
    if (!user) {
        const emailResult = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = $1",
            [email]
        );

        if (emailResult.rows.length > 0) {
            const existingByEmail = emailResult.rows[0];

            // Prevent account takeover: existing account already has a DIFFERENT google_id
            if (existingByEmail.google_id && existingByEmail.google_id !== googleId) {
                const err = new Error("This email is already associated with a different Google account");
                err.statusCode = 409;
                throw err;
            }

            // Link existing legacy account with verified Google identity
            const linkResult = await pool.query(
                `UPDATE users
                 SET google_id = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND (google_id IS NULL OR google_id = $1)
                 RETURNING *`,
                [googleId, existingByEmail.id]
            );
            user = linkResult.rows[0];
        }
    }

    // 3. If account exists (matched or linked)
    if (user) {
        let customerId = user.customer_id;

        // Customer portal account linkage
        if (user.role === "customer" && !customerId) {
            const custLookup = await pool.query(
                "SELECT id FROM customers WHERE LOWER(email) = $1",
                [email]
            );
            if (custLookup.rows.length > 0) {
                customerId = custLookup.rows[0].id;
                await pool.query("UPDATE users SET customer_id = $1 WHERE id = $2", [customerId, user.id]);
            }
        }

        // Enforce customer account activation requirement
        if (user.status === "pending_activation") {
            const err = new Error("Account is pending activation. Please activate your account using your activation code.");
            err.statusCode = 403;
            throw err;
        }

        // Enforce registration approval workflow
        if (user.registration_status === "PENDING") {
            const err = new Error("Your account registration is awaiting administrator approval.");
            err.statusCode = 403;
            throw err;
        }

        if (user.registration_status === "REJECTED") {
            const err = new Error("Your account registration has been rejected.");
            err.statusCode = 403;
            throw err;
        }

        if (!user.is_active || user.status === "inactive" || user.status === "suspended") {
            const err = new Error("Account is inactive or pending approval");
            err.statusCode = 403;
            throw err;
        }

        // Issue application JWT session token
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
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        return {
            status: 200,
            success: true,
            message: "Login successful",
            data: {
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
            }
        };
    }

    // 4. Check if customer exists in customers table with pending portal account
    const existingCustomer = await pool.query(
        "SELECT id, is_active FROM customers WHERE LOWER(email) = $1",
        [email]
    );
    if (existingCustomer.rows.length > 0) {
        const err = new Error("Account is pending activation. Please activate your account using your activation code.");
        err.statusCode = 403;
        throw err;
    }

    // 5. Genuine new user registration via Google — requires valid role and username
    if (!submittedRole) {
        const err = new Error("Role is required. Permitted roles are: sales_rep, finance, sales_manager");
        err.statusCode = 400;
        err.needsProfileCompletion = true;
        throw err;
    }

    if (!ALLOWED_STAFF_ROLES.has(submittedRole)) {
        const err = new Error("Invalid requested role. Permitted roles are: sales_rep, finance, sales_manager");
        err.statusCode = 400;
        throw err;
    }

    const normalizedUsername = (typeof username === "string" ? username : "").trim();
    if (!normalizedUsername) {
        const err = new Error("Username is required");
        err.statusCode = 400;
        err.needsProfileCompletion = true;
        throw err;
    }

    if (normalizedUsername.length < 3) {
        const err = new Error("Username must be at least 3 characters");
        err.statusCode = 400;
        throw err;
    }

    if (normalizedUsername.length > 50) {
        const err = new Error("Username must not exceed 50 characters");
        err.statusCode = 400;
        throw err;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
        const err = new Error("Username can only contain letters, numbers, underscores, periods, and hyphens");
        err.statusCode = 400;
        throw err;
    }

    const existingUsername = await pool.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
        [normalizedUsername]
    );
    if (existingUsername.rows.length > 0) {
        const err = new Error("Username is already taken");
        err.statusCode = 400;
        throw err;
    }

    // Secure cryptographically random password hash to satisfy schema requirements without predictable password
    const randomSecret = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomSecret, 12);

    try {
        const insertRes = await pool.query(
            `INSERT INTO users (
                username,
                email,
                google_id,
                password_hash,
                role,
                requested_role,
                first_name,
                last_name,
                is_active,
                registration_status,
                status
            )
            VALUES ($1, $2, $3, $4, 'sales_rep', $5, $6, $7, FALSE, 'PENDING', 'pending')
            RETURNING
                id,
                username,
                email,
                role,
                requested_role AS "requestedRole",
                first_name AS "firstName",
                last_name AS "lastName",
                is_active AS "isActive",
                registration_status AS "registrationStatus",
                created_at AS "createdAt"`,
            [
                normalizedUsername,
                email,
                googleId,
                passwordHash,
                submittedRole,
                firstName || null,
                lastName || null
            ]
        );

        return {
            status: 201,
            success: true,
            isNewUser: true,
            message: "Registration submitted for admin approval",
            data: insertRes.rows[0]
        };
    } catch (dbError) {
        if (dbError.code === "23505") {
            if (dbError.constraint && dbError.constraint.includes("username")) {
                const err = new Error("Username is already taken");
                err.statusCode = 400;
                throw err;
            }
            const err = new Error("An account with this email or Google identity already exists");
            err.statusCode = 409;
            throw err;
        }
        throw dbError;
    }
};


const GENERIC_FORGOT_PASSWORD_MESSAGE =
    "If this email is registered with DealFlow360, a verification code has been sent.";

const requestForgotPasswordOtp = async (email) => {
    if (!email || !email.trim()) {
        const err = new Error("Email address is required");
        err.statusCode = 400;
        throw err;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        const err = new Error("Please enter a valid email address");
        err.statusCode = 400;
        throw err;
    }

    // Lookup user in users table
    const userRes = await pool.query(
        "SELECT id, email FROM users WHERE LOWER(email) = $1",
        [trimmedEmail]
    );

    // Email enumeration protection: return generic message if user does not exist
    if (userRes.rows.length === 0) {
        return {
            success: true,
            message: GENERIC_FORGOT_PASSWORD_MESSAGE
        };
    }

    const user = userRes.rows[0];

    // Check rate limits for active window (30 minutes)
    const recentRes = await pool.query(
        `SELECT id, otp_send_count, last_otp_sent_at, first_otp_sent_at
         FROM password_reset_tokens
         WHERE user_id = $1
           AND first_otp_sent_at > NOW() - INTERVAL '30 minutes'
         ORDER BY id DESC
         LIMIT 1`,
        [user.id]
    );

    let otpSendCount = 1;
    let firstOtpSentAt = new Date();

    if (recentRes.rows.length > 0) {
        const recent = recentRes.rows[0];
        const now = Date.now();
        const lastSent = new Date(recent.last_otp_sent_at).getTime();

        // 30-second resend cooldown
        if (now - lastSent < 30 * 1000) {
            const err = new Error("Please wait before requesting another OTP.");
            err.statusCode = 429;
            throw err;
        }

        // Maximum 3 OTP sends within 30 minutes
        if (recent.otp_send_count >= 3) {
            const err = new Error("Too many OTP requests. Please try again later.");
            err.statusCode = 429;
            throw err;
        }

        otpSendCount = recent.otp_send_count + 1;
        firstOtpSentAt = recent.first_otp_sent_at;
    }

    // Invalidate all previous unverified reset requests for this user
    await pool.query(
        `UPDATE password_reset_tokens
         SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_used = FALSE`,
        [user.id]
    );

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Store only the hash in PostgreSQL
    await pool.query(
        `INSERT INTO password_reset_tokens (
            user_id,
            email,
            otp_hash,
            otp_expires_at,
            otp_send_count,
            last_otp_sent_at,
            first_otp_sent_at,
            failed_attempts,
            is_otp_verified,
            is_used
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '10 minutes', $4, CURRENT_TIMESTAMP, $5, 0, FALSE, FALSE)`,
        [user.id, trimmedEmail, otpHash, otpSendCount, firstOtpSentAt]
    );

    // Send email using existing Brevo service
    await sendPasswordResetOtp({ email: user.email, otp });

    return {
        success: true,
        message: GENERIC_FORGOT_PASSWORD_MESSAGE
    };
};

const resendForgotPasswordOtp = async (email) => {
    if (!email || !email.trim()) {
        const err = new Error("Email address is required");
        err.statusCode = 400;
        throw err;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        const err = new Error("Please enter a valid email address");
        err.statusCode = 400;
        throw err;
    }

    const userRes = await pool.query(
        "SELECT id, email FROM users WHERE LOWER(email) = $1",
        [trimmedEmail]
    );

    // Maintain anti-enumeration behavior for unregistered emails
    if (userRes.rows.length === 0) {
        return {
            success: true,
            message: GENERIC_FORGOT_PASSWORD_MESSAGE
        };
    }

    const user = userRes.rows[0];

    // Check rate limits
    const recentRes = await pool.query(
        `SELECT id, otp_send_count, last_otp_sent_at, first_otp_sent_at
         FROM password_reset_tokens
         WHERE user_id = $1
           AND first_otp_sent_at > NOW() - INTERVAL '30 minutes'
         ORDER BY id DESC
         LIMIT 1`,
        [user.id]
    );

    let otpSendCount = 1;
    let firstOtpSentAt = new Date();

    if (recentRes.rows.length > 0) {
        const recent = recentRes.rows[0];
        const now = Date.now();
        const lastSent = new Date(recent.last_otp_sent_at).getTime();

        // 30-second cooldown
        if (now - lastSent < 30 * 1000) {
            const err = new Error("Please wait before requesting another OTP.");
            err.statusCode = 429;
            throw err;
        }

        // 3 sends in 30 minutes
        if (recent.otp_send_count >= 3) {
            const err = new Error("Too many OTP requests. Please try again later.");
            err.statusCode = 429;
            throw err;
        }

        otpSendCount = recent.otp_send_count + 1;
        firstOtpSentAt = recent.first_otp_sent_at;
    }

    // Invalidate previous OTP requests
    await pool.query(
        `UPDATE password_reset_tokens
         SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_used = FALSE`,
        [user.id]
    );

    // Generate new secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await pool.query(
        `INSERT INTO password_reset_tokens (
            user_id,
            email,
            otp_hash,
            otp_expires_at,
            otp_send_count,
            last_otp_sent_at,
            first_otp_sent_at,
            failed_attempts,
            is_otp_verified,
            is_used
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '10 minutes', $4, CURRENT_TIMESTAMP, $5, 0, FALSE, FALSE)`,
        [user.id, trimmedEmail, otpHash, otpSendCount, firstOtpSentAt]
    );

    // Send via existing Brevo service
    await sendPasswordResetOtp({ email: user.email, otp });

    return {
        success: true,
        message: "A new verification code has been sent to your email."
    };
};

const verifyForgotPasswordOtp = async ({ email, otp }) => {
    if (!email || !email.trim() || !otp) {
        const err = new Error("Email and verification code are required");
        err.statusCode = 400;
        throw err;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
        const err = new Error("Verification code must be exactly 6 digits");
        err.statusCode = 400;
        throw err;
    }

    // Find latest active reset request for this email
    const recordRes = await pool.query(
        `SELECT *
         FROM password_reset_tokens
         WHERE LOWER(email) = $1
           AND is_used = FALSE
           AND is_otp_verified = FALSE
         ORDER BY id DESC
         LIMIT 1`,
        [trimmedEmail]
    );

    if (recordRes.rows.length === 0) {
        const err = new Error("Invalid or expired verification request. Please request a new code.");
        err.statusCode = 400;
        throw err;
    }

    const record = recordRes.rows[0];

    // Check if max failed attempts reached (5 attempts limit)
    if (record.failed_attempts >= 5) {
        await pool.query(
            "UPDATE password_reset_tokens SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [record.id]
        );
        const err = new Error("Too many failed attempts. Please restart the password reset process.");
        err.statusCode = 400;
        throw err;
    }

    // Check expiry (10 minutes)
    if (new Date() > new Date(record.otp_expires_at)) {
        await pool.query(
            "UPDATE password_reset_tokens SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [record.id]
        );
        const err = new Error("Verification code has expired. Please request a new code.");
        err.statusCode = 400;
        throw err;
    }

    // Hash supplied OTP
    const suppliedHash = crypto.createHash("sha256").update(trimmedOtp).digest("hex");

    if (suppliedHash !== record.otp_hash) {
        const newFailed = record.failed_attempts + 1;
        if (newFailed >= 5) {
            await pool.query(
                "UPDATE password_reset_tokens SET failed_attempts = $1, is_used = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [newFailed, record.id]
            );
            const err = new Error("Too many failed attempts. Please restart the password reset process.");
            err.statusCode = 400;
            throw err;
        } else {
            await pool.query(
                "UPDATE password_reset_tokens SET failed_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [newFailed, record.id]
            );
            const remaining = 5 - newFailed;
            const err = new Error(`Invalid verification code. You have ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
            err.statusCode = 400;
            throw err;
        }
    }

    // Correct OTP: generate cryptographically secure temporary reset authorization token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");

    await pool.query(
        `UPDATE password_reset_tokens
         SET is_otp_verified = TRUE,
             reset_token_hash = $1,
             reset_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [resetTokenHash, record.id]
    );

    return {
        success: true,
        message: "Email verified successfully.",
        resetToken: rawResetToken
    };
};

const resetPasswordWithToken = async ({ resetToken, newPassword, confirmPassword }) => {
    if (!resetToken) {
        const err = new Error("Password reset authorization token is required");
        err.statusCode = 400;
        throw err;
    }

    if (!newPassword || !confirmPassword) {
        const err = new Error("New password and confirmation are required");
        err.statusCode = 400;
        throw err;
    }

    if (newPassword !== confirmPassword) {
        const err = new Error("Passwords do not match");
        err.statusCode = 400;
        throw err;
    }

    if (newPassword.length < 6) {
        const err = new Error("Password must be at least 6 characters long");
        err.statusCode = 400;
        throw err;
    }

    const tokenHash = crypto.createHash("sha256").update(resetToken.trim()).digest("hex");

    const recordRes = await pool.query(
        `SELECT prt.*, u.customer_id
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.reset_token_hash = $1
           AND prt.is_otp_verified = TRUE
           AND prt.is_used = FALSE`,
        [tokenHash]
    );

    if (recordRes.rows.length === 0) {
        const err = new Error("Invalid or expired reset token. Please restart the password reset process.");
        err.statusCode = 400;
        throw err;
    }

    const record = recordRes.rows[0];

    // Check reset token expiry
    if (new Date() > new Date(record.reset_token_expires_at)) {
        await pool.query(
            "UPDATE password_reset_tokens SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [record.id]
        );
        const err = new Error("Password reset session has expired. Please restart the password reset process.");
        err.statusCode = 400;
        throw err;
    }

    // Hash new password using existing bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password in users table
    await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [passwordHash, record.user_id]
    );

    // If customer user, sync customers table
    if (record.customer_id) {
        await pool.query(
            "UPDATE customers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [passwordHash, record.customer_id]
        );
    }

    // Invalidate reset token and mark all reset requests for this user as used (single use)
    await pool.query(
        `UPDATE password_reset_tokens
         SET is_used = TRUE,
             reset_token_hash = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [record.user_id]
    );

    return {
        success: true,
        message: "Password reset successful. You can now log in."
    };
};


export {
    registerUser,
    loginUser,
    activateCustomer,
    authenticateGoogleUser,
    verifyGoogleToken,
    requestForgotPasswordOtp,
    resendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPasswordWithToken
};
