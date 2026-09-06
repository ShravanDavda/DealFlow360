import pool from "../config/db.js";
import bcrypt from "bcrypt";

const pendingSelect = `
    SELECT id, username, email, first_name AS "firstName", last_name AS "lastName",
           requested_role AS "requestedRole", registration_status AS "registrationStatus", created_at AS "createdAt"
    FROM users
    WHERE registration_status = 'PENDING'
    ORDER BY created_at ASC, id ASC
`;

export const getPendingRegistrations = async () => (await pool.query(pendingSelect)).rows;
export const getPendingRegistrationCount = async () => (await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE registration_status = 'PENDING'")).rows[0].count;

export const createAdminUser = async ({ fullName, email, password }) => {
    const normalizedName = String(fullName || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedName) throw new Error("Full name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("A valid email is required");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
        const error = new Error("Email already exists");
        error.statusCode = 409;
        throw error;
    }

    const nameParts = normalizedName.split(/\s+/);
    const firstName = nameParts.shift();
    const lastName = nameParts.join(" ") || null;
    const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 44) || "admin";
    let username = baseUsername;
    let suffix = 1;
    while ((await pool.query("SELECT 1 FROM users WHERE username = $1", [username])).rows.length > 0) {
        username = `${baseUsername.slice(0, 44 - String(suffix).length)}${suffix}`;
        suffix += 1;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, requested_role, first_name, last_name, is_active, registration_status)
         VALUES ($1, $2, $3, 'admin', 'admin', $4, $5, TRUE, 'APPROVED')
         RETURNING id, username, email, role, first_name AS "firstName", last_name AS "lastName", is_active AS "isActive", registration_status AS "registrationStatus"`,
        [username, normalizedEmail, passwordHash, firstName, lastName]
    );
    return result.rows[0];
};

const updateRegistration = async (id, action) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `SELECT id, requested_role AS "requestedRole", registration_status AS "registrationStatus"
             FROM users WHERE id = $1 FOR UPDATE`,
            [id]
        );
        const registration = result.rows[0];
        if (!registration) throw new Error("Registration request not found");
        if (registration.registrationStatus !== "PENDING") throw new Error("Registration request has already been reviewed");

        const approved = action === "APPROVE";
        const updated = await client.query(
            `UPDATE users
             SET role = CASE WHEN $1 THEN requested_role ELSE role END,
                 is_active = $1,
                 registration_status = CASE WHEN $1 THEN 'APPROVED' ELSE 'REJECTED' END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, username, email, role, requested_role AS "requestedRole", is_active AS "isActive", registration_status AS "registrationStatus"`,
            [approved, id]
        );
        await client.query("COMMIT");
        return updated.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const approveRegistration = (id) => updateRegistration(id, "APPROVE");
export const rejectRegistration = (id) => updateRegistration(id, "REJECT");
