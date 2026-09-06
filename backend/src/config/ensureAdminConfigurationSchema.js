import pool from "./db.js";

const ensureAdminConfigurationSchema = async () => {
    await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(30);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
    UPDATE users SET requested_role = role WHERE requested_role IS NULL;
    UPDATE users SET registration_status = 'APPROVED' WHERE registration_status IS NULL;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_requested_role_check;
    ALTER TABLE users ADD CONSTRAINT users_requested_role_check CHECK (requested_role IN ('sales_rep', 'sales_manager', 'finance', 'operations', 'admin', 'customer'));
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_registration_status_check;
    ALTER TABLE users ADD CONSTRAINT users_registration_status_check CHECK (registration_status IN ('PENDING', 'APPROVED', 'REJECTED'));
    ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
    ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Under Negotiation', 'Confirmed', 'Rejected', 'Returned'));

    ALTER TABLE quotation_audit_trail ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
    ALTER TABLE quotation_audit_trail ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
    ALTER TABLE quotation_audit_trail ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50);
    ALTER TABLE quotation_audit_trail ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
    ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS cgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
    ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS sgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
    UPDATE products SET cgst_percent = tax_percent / 2, sgst_percent = tax_percent / 2 WHERE cgst_percent = 0 AND sgst_percent = 0 AND tax_percent <> 0;
    UPDATE quotation_items SET cgst_percent = tax_percent / 2, sgst_percent = tax_percent / 2 WHERE cgst_percent = 0 AND sgst_percent = 0 AND tax_percent <> 0;
    CREATE SEQUENCE IF NOT EXISTS product_sku_seq;
    DO $$
    DECLARE max_sku BIGINT; current_sku BIGINT;
    BEGIN
        SELECT MAX(CASE WHEN sku ~ '^[0-9]+$' THEN sku::BIGINT WHEN sku ~ '^PROD-[0-9]+$' THEN SUBSTRING(sku FROM 6)::BIGINT END) INTO max_sku FROM products;
        SELECT last_value INTO current_sku FROM product_sku_seq;
        IF max_sku IS NULL AND current_sku <= 1 THEN
            PERFORM setval('product_sku_seq', 1, FALSE);
        ELSIF max_sku IS NOT NULL AND current_sku < max_sku THEN
            PERFORM setval('product_sku_seq', max_sku, TRUE);
        END IF;
    END $$;

        CREATE TABLE IF NOT EXISTS approval_chains (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            min_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
            max_discount_percent NUMERIC(5, 2),
            min_risk VARCHAR(20),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS approval_chain_steps (
            id SERIAL PRIMARY KEY,
            approval_chain_id INTEGER NOT NULL REFERENCES approval_chains(id) ON UPDATE CASCADE ON DELETE CASCADE,
            step_order INTEGER NOT NULL CHECK (step_order > 0),
            approver_role VARCHAR(50) NOT NULL,
            UNIQUE (approval_chain_id, step_order)
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            billing_interval VARCHAR(20) NOT NULL DEFAULT 'Monthly' CHECK (billing_interval IN ('Monthly', 'Quarterly', 'Yearly')),
            recurring_price NUMERIC(12, 2),
            proration_rule TEXT,
            cancellation_rule TEXT,
            partial_refund_rule TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subscription_plan_products (
            id SERIAL PRIMARY KEY,
            subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON UPDATE CASCADE ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
            UNIQUE (subscription_plan_id, product_id)
        );

        ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS recurring_price NUMERIC(12, 2);

        CREATE TABLE IF NOT EXISTS quotation_approval_requests (
            id SERIAL PRIMARY KEY,
            quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
            approval_chain_id INTEGER REFERENCES approval_chains(id) ON UPDATE CASCADE ON DELETE SET NULL,
            submitted_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_request_open
            ON quotation_approval_requests (quotation_id)
            WHERE status IN ('PENDING', 'RETURNED');

        CREATE TABLE IF NOT EXISTS quotation_approval_steps (
            id SERIAL PRIMARY KEY,
            approval_request_id INTEGER NOT NULL REFERENCES quotation_approval_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
            approval_chain_step_id INTEGER REFERENCES approval_chain_steps(id) ON UPDATE CASCADE ON DELETE SET NULL,
            step_order INTEGER NOT NULL CHECK (step_order > 0),
            approver_role VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('PENDING', 'WAITING', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED')),
            approver_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
            acted_at TIMESTAMPTZ,
            comment TEXT,
            UNIQUE (approval_request_id, step_order)
        );

        CREATE INDEX IF NOT EXISTS idx_approval_requests_quotation ON quotation_approval_requests (quotation_id);
        CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON quotation_approval_requests (status);
        CREATE INDEX IF NOT EXISTS idx_approval_steps_request_status ON quotation_approval_steps (approval_request_id, status);
        CREATE INDEX IF NOT EXISTS idx_approval_steps_role ON quotation_approval_steps (approver_role);

                -- Migrate legacy approval configuration only; historical quotation steps remain immutable.
                DELETE FROM approval_chain_steps legacy
                USING approval_chain_steps finance_step
                WHERE legacy.approval_chain_id = finance_step.approval_chain_id
                    AND legacy.step_order = finance_step.step_order
                    AND LOWER(legacy.approver_role) = 'operations'
                    AND LOWER(finance_step.approver_role) = 'finance';
                UPDATE approval_chain_steps legacy
                SET approver_role = 'Finance'
                WHERE LOWER(legacy.approver_role) = 'operations'
                    AND legacy.step_order > 1
                    AND EXISTS (
                            SELECT 1 FROM approval_chain_steps manager_step
                            WHERE manager_step.approval_chain_id = legacy.approval_chain_id
                                AND manager_step.step_order = 1
                                AND LOWER(manager_step.approver_role) = 'sales manager'
                    );

        -- Product Pairings (Upsell & Cross-sell) Enhancements
        ALTER TABLE product_pairings ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(20) NOT NULL DEFAULT 'CROSS_SELL';
        ALTER TABLE product_pairings DROP CONSTRAINT IF EXISTS product_pairings_relationship_type_check;
        ALTER TABLE product_pairings ADD CONSTRAINT product_pairings_relationship_type_check CHECK (relationship_type IN ('UPSELL', 'CROSS_SELL'));

        ALTER TABLE product_pairings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE product_pairings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE product_pairings DROP CONSTRAINT IF EXISTS chk_product_pairings_no_self;
        ALTER TABLE product_pairings ADD CONSTRAINT chk_product_pairings_no_self CHECK (base_product_id <> suggested_product_id);

        CREATE UNIQUE INDEX IF NOT EXISTS uq_product_pairings_active
            ON product_pairings (base_product_id, suggested_product_id, relationship_type)
            WHERE is_active = TRUE;

        -- Ensure sample product "Laptop Pro 16" exists if not already present
        INSERT INTO products (category_id, sku, name, description, base_cost, unit, tax_percent, cgst_percent, sgst_percent, is_active)
        SELECT 1, 'PROD-016', 'Laptop Pro 16', 'High-performance 16-inch workstation laptop', 1450.00, 'Each', 18.00, 9.00, 9.00, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name ILIKE '%Laptop Pro 16%' OR sku = 'PROD-016');

        -- Customer Role & Customer Account Linking
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'sales_rep', 'sales_manager', 'finance', 'operations', 'customer'));

        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_requested_role_check;
        ALTER TABLE users ADD CONSTRAINT users_requested_role_check CHECK (requested_role IN ('admin', 'sales_rep', 'sales_manager', 'finance', 'operations', 'customer'));

        ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL;

        -- Ensure quotation_items has tax_percent column for billing calculations
        ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5, 2) DEFAULT 0;

        -- Set password_hash for existing customers if missing
        UPDATE customers
        SET password_hash = '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa'
        WHERE password_hash IS NULL;

        -- Ensure each customer has a corresponding user record with role 'customer'
        INSERT INTO users (username, email, password_hash, role, requested_role, first_name, last_name, is_active, registration_status, customer_id)
        SELECT 
            LOWER(REPLACE(c.customer_code, '-', '_')),
            c.email,
            COALESCE(c.password_hash, '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa'),
            'customer',
            'customer',
            COALESCE(c.contact_name, 'Customer'),
            c.company_name,
            TRUE,
            'APPROVED',
            c.id
        FROM customers c
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = c.email);

        -- Ensure all customer users have customer_id set
        UPDATE users u
        SET customer_id = c.id
        FROM customers c
        WHERE u.email = c.email AND u.customer_id IS NULL;

        -- Customer Portal Account Activation Fields
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_code_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
        UPDATE users SET status = 'active' WHERE status IS NULL;

        -- Fulfillment & Invoicing Upgrades
        ALTER TABLE fulfillment_orders DROP CONSTRAINT IF EXISTS fulfillment_orders_status_check;
        ALTER TABLE fulfillment_orders ADD CONSTRAINT fulfillment_orders_status_check CHECK (status IN ('Pending Split', 'Split Accepted', 'Partially Shipped', 'Fulfilled', 'Backordered'));

        CREATE TABLE IF NOT EXISTS invoice_items (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE CASCADE,
            quotation_item_id INTEGER REFERENCES quotation_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
            item_name VARCHAR(255) NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC(12, 2) NOT NULL,
            discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
            tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
            cgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
            sgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            line_total NUMERIC(12, 2) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            total NUMERIC(12, 2) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL;

        ALTER TABLE fulfillment_splits ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL;

        CREATE TABLE IF NOT EXISTS backorder_records (
            id SERIAL PRIMARY KEY,
            fulfillment_order_id INTEGER NOT NULL REFERENCES fulfillment_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
            quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
            quotation_item_id INTEGER REFERENCES quotation_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            product_name VARCHAR(255) NOT NULL,
            backordered_quantity INTEGER NOT NULL,
            fulfilled_quantity INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_backorder_records_order ON backorder_records(fulfillment_order_id);
        CREATE INDEX IF NOT EXISTS idx_backorder_records_quote ON backorder_records(quotation_id);
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
    `);
};

export default ensureAdminConfigurationSchema;