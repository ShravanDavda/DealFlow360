import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from "../config/db.js";

export const generateActivationCode = () => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let randomPart = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        randomPart += chars[bytes[i] % chars.length];
    }
    return `DF360-${randomPart}`;
};

export const hashActivationCode = (code) => {
    return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
};

const getAllCustomers = async () => {
    const result = await pool.query(`
        SELECT
            c.id,
            c.customer_code,
            c.company_name,
            c.contact_name,
            c.email,
            c.phone,
            c.customer_tier_id,
            ct.name AS customer_tier_name,
            c.address_line1,
            c.address_line2,
            c.city,
            c.state,
            c.country,
            c.postal_code,
            c.currency,
            c.is_active,
            c.created_at,
            c.updated_at,
            u.id AS portal_user_id,
            CASE
                WHEN u.id IS NULL THEN 'no_account'
                WHEN u.status = 'active' OR (u.is_active = TRUE AND u.password_hash IS NOT NULL) THEN 'active'
                ELSE 'pending_activation'
            END AS portal_status,
            u.activation_expires_at AS portal_activation_expires_at
        FROM customers c
        INNER JOIN customer_tiers ct
            ON c.customer_tier_id = ct.id
        LEFT JOIN users u
            ON u.customer_id = c.id AND u.role = 'customer'
        ORDER BY c.id DESC
    `);

    return result.rows;
};

const getCustomerById = async (id) => {
    const result = await pool.query(
        `
        SELECT
            c.id,
            c.customer_code,
            c.company_name,
            c.contact_name,
            c.email,
            c.phone,
            c.customer_tier_id,
            ct.name AS customer_tier_name,
            c.address_line1,
            c.address_line2,
            c.city,
            c.state,
            c.country,
            c.postal_code,
            c.currency,
            c.is_active,
            c.created_at,
            c.updated_at,
            u.id AS portal_user_id,
            CASE
                WHEN u.id IS NULL THEN 'no_account'
                WHEN u.status = 'active' OR (u.is_active = TRUE AND u.password_hash IS NOT NULL) THEN 'active'
                ELSE 'pending_activation'
            END AS portal_status,
            u.activation_expires_at AS portal_activation_expires_at
        FROM customers c
        INNER JOIN customer_tiers ct
            ON c.customer_tier_id = ct.id
        LEFT JOIN users u
            ON u.customer_id = c.id AND u.role = 'customer'
        WHERE c.id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createCustomer = async ({
    customerCode,
    companyName,
    contactName,
    email,
    phone,
    customerTierId,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    postalCode,
    currency
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const existingCustomer = await client.query(
            `
            SELECT id
            FROM customers
            WHERE customer_code = $1
               OR email = $2
            `,
            [customerCode, email]
        );

        if (existingCustomer.rows.length > 0) {
            const error = new Error("Customer code or email already exists");
            error.statusCode = 409;
            throw error;
        }

        const tier = await client.query(
            `
            SELECT id
            FROM customer_tiers
            WHERE id = $1
            AND is_active = TRUE
            `,
            [customerTierId]
        );

        if (tier.rows.length === 0) {
            throw new Error("Customer tier not found or inactive");
        }

        const custResult = await client.query(
            `
            INSERT INTO customers (
                customer_code,
                company_name,
                contact_name,
                email,
                phone,
                password_hash,
                customer_tier_id,
                address_line1,
                address_line2,
                city,
                state,
                country,
                postal_code,
                currency
            )
            VALUES (
                $1, $2, $3, $4, $5, NULL, $6,
                $7, $8, $9, $10, $11, $12, $13
            )
            RETURNING id
            `,
            [
                customerCode,
                companyName,
                contactName || null,
                email,
                phone || null,
                customerTierId,
                addressLine1 || null,
                addressLine2 || null,
                city || null,
                state || null,
                country || "India",
                postalCode || null,
                currency || "INR"
            ]
        );

        const newCustomerId = custResult.rows[0].id;

        const rawActivationCode = generateActivationCode();
        const activationCodeHash = hashActivationCode(rawActivationCode);
        const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const userResult = await client.query(
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
                customer_id,
                status,
                activation_code_hash,
                activation_expires_at
            )
            VALUES (
                $1, $2, NULL, 'customer', 'customer', $3, $4, FALSE, 'APPROVED', $5,
                'pending_activation', $6, $7
            )
            ON CONFLICT (email) DO UPDATE
            SET customer_id = EXCLUDED.customer_id,
                role = 'customer',
                status = 'pending_activation',
                is_active = FALSE,
                activation_code_hash = EXCLUDED.activation_code_hash,
                activation_expires_at = EXCLUDED.activation_expires_at
            RETURNING id, email, status
            `,
            [
                customerCode.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                email,
                contactName || 'Customer',
                companyName,
                newCustomerId,
                activationCodeHash,
                activationExpiresAt
            ]
        );

        await client.query("COMMIT");

        const customerRecord = await getCustomerById(newCustomerId);
        const userRow = userResult.rows[0];

        return {
            ...customerRecord,
            portalAccount: {
                userId: userRow.id,
                email: userRow.email,
                status: "pending_activation",
                activationCode: rawActivationCode,
                activationExpiresAt: activationExpiresAt.toISOString()
            }
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const reissueActivation = async (customerId) => {
    const customer = await getCustomerById(customerId);
    if (!customer) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
    }

    const userRes = await pool.query(
        `SELECT id, email, status, password_hash, is_active FROM users WHERE customer_id = $1 AND role = 'customer'`,
        [customerId]
    );

    let user = userRes.rows[0];

    if (user && user.status === "active" && user.password_hash) {
        const error = new Error("Customer portal account is already active.");
        error.statusCode = 400;
        throw error;
    }

    const newRawCode = generateActivationCode();
    const newHash = hashActivationCode(newRawCode);
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (user) {
        await pool.query(
            `
            UPDATE users
            SET activation_code_hash = $1,
                activation_expires_at = $2,
                status = 'pending_activation',
                is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            `,
            [newHash, newExpiry, user.id]
        );
    } else {
        const insertUser = await pool.query(
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
                customer_id,
                status,
                activation_code_hash,
                activation_expires_at
            )
            VALUES (
                $1, $2, NULL, 'customer', 'customer', $3, $4, FALSE, 'APPROVED', $5,
                'pending_activation', $6, $7
            )
            RETURNING id
            `,
            [
                customer.customer_code.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                customer.email,
                customer.contact_name || 'Customer',
                customer.company_name,
                customer.id,
                newHash,
                newExpiry
            ]
        );
        user = insertUser.rows[0];
    }

    return {
        customerId: customer.id,
        companyName: customer.company_name,
        email: customer.email,
        activationCode: newRawCode,
        activationExpiresAt: newExpiry.toISOString(),
        status: "pending_activation"
    };
};

const updateCustomer = async (
    id,
    {
        customerCode,
        companyName,
        contactName,
        email,
        phone,
        customerTierId,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        postalCode,
        currency,
        isActive
    }
) => {
    const existingCustomer =
        await getCustomerById(id);

    if (!existingCustomer) {
        throw new Error("Customer not found");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required");
    const duplicate = await pool.query("SELECT id FROM customers WHERE (customer_code = $1 OR email = $2) AND id <> $3", [customerCode ?? existingCustomer.customer_code, email ?? existingCustomer.email, id]);
    if (duplicate.rows.length > 0) {
        const error = new Error("Customer code or email already exists");
        error.statusCode = 409;
        throw error;
    }

    if (customerTierId !== undefined) {
        const tier = await pool.query(
            `
            SELECT id
            FROM customer_tiers
            WHERE id = $1
            AND is_active = TRUE
            `,
            [customerTierId]
        );

        if (tier.rows.length === 0) {
            throw new Error(
                "Customer tier not found or inactive"
            );
        }
    }

    const result = await pool.query(
        `
        UPDATE customers
        SET
            customer_code = $1,
            company_name = $2,
            contact_name = $3,
            email = $4,
            phone = $5,
            customer_tier_id = $6,
            address_line1 = $7,
            address_line2 = $8,
            city = $9,
            state = $10,
            country = $11,
            postal_code = $12,
            currency = $13,
            is_active = $14,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING
            id,
            customer_code,
            company_name,
            contact_name,
            email,
            phone,
            customer_tier_id,
            address_line1,
            address_line2,
            city,
            state,
            country,
            postal_code,
            currency,
            is_active,
            created_at,
            updated_at
        `,
        [
            customerCode ?? existingCustomer.customer_code,
            companyName ?? existingCustomer.company_name,
            contactName ?? existingCustomer.contact_name,
            email ?? existingCustomer.email,
            phone ?? existingCustomer.phone,
            customerTierId ??
                existingCustomer.customer_tier_id,
            addressLine1 ??
                existingCustomer.address_line1,
            addressLine2 ??
                existingCustomer.address_line2,
            city ?? existingCustomer.city,
            state ?? existingCustomer.state,
            country ?? existingCustomer.country,
            postalCode ?? existingCustomer.postal_code,
            currency ?? existingCustomer.currency,
            isActive ?? existingCustomer.is_active,
            id
        ]
    );

    return getCustomerById(result.rows[0].id);
};

const deactivateCustomer = async (id) => {
    const existingCustomer =
        await getCustomerById(id);

    if (!existingCustomer) {
        throw new Error("Customer not found");
    }

    const result = await pool.query(
        `
        UPDATE customers
        SET
            is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            customer_code,
            company_name,
            is_active
        `,
        [id]
    );

    return result.rows[0];
};

export {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    reissueActivation
};