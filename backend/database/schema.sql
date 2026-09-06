

CREATE TABLE IF NOT EXISTS customer_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    default_discount_ceiling NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (default_discount_ceiling >= 0 AND default_discount_ceiling <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS discount_ceiling NUMERIC(5, 2) NOT NULL DEFAULT 10.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Each';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recurring_cycle VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD';

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'sales_rep' CHECK (role IN ('admin', 'sales_rep', 'sales_manager', 'finance', 'operations')),
    requested_role VARCHAR(30) CHECK (requested_role IN ('admin', 'sales_rep', 'sales_manager', 'finance', 'operations')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    registration_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (registration_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash TEXT,
    customer_tier_id INTEGER NOT NULL REFERENCES customer_tiers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    discount_ceiling NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (discount_ceiling >= 0 AND discount_ceiling <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    base_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'Each',
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    is_subscription BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_cycle VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    attributes JSONB NOT NULL DEFAULT '{}',
    additional_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE CASCADE,
    unit_price NUMERIC(12, 2) NOT NULL,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    max_quantity INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(255),
    shipping_cost_weight NUMERIC(8, 2) NOT NULL DEFAULT 20.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_product UNIQUE (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quote_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    price_list_id INTEGER REFERENCES price_lists(id) ON UPDATE CASCADE ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Under Negotiation', 'Confirmed', 'Rejected', 'Returned')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    overall_margin NUMERIC(5, 2) NOT NULL DEFAULT 0,
    blended_risk_score VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (blended_risk_score IN ('LOW', 'MEDIUM', 'HIGH')),
    approval_stage VARCHAR(50) NOT NULL DEFAULT 'None' CHECK (approval_stage IN ('None', 'Sales Manager', 'Finance', 'Auto-Approved', 'Approved', 'Rejected')),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    requested_delivery_date DATE,
    customer_notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_variant_id INTEGER REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    base_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_limit NUMERIC(5, 2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL,
    margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    risk_status VARCHAR(50) NOT NULL DEFAULT 'OK',
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_cycle VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_audit_trail (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    note TEXT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_negotiation_lines (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quotation_item_id INTEGER REFERENCES quotation_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    customer_comment TEXT,
    requested_discount NUMERIC(5, 2),
    status VARCHAR(50) DEFAULT 'Under Review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fulfillment_orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Split' CHECK (status IN ('Pending Split', 'Split Accepted', 'Partially Shipped', 'Fulfilled', 'Backordered')),
    total_shipments INTEGER NOT NULL DEFAULT 1,
    estimated_shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    backorder_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fulfillment_splits (
    id SERIAL PRIMARY KEY,
    fulfillment_order_id INTEGER NOT NULL REFERENCES fulfillment_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    warehouse_name VARCHAR(100) NOT NULL,
    product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
    quantity_fulfilled INTEGER NOT NULL,
    estimated_shipments INTEGER NOT NULL DEFAULT 1,
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backorder_records (
    id SERIAL PRIMARY KEY,
    fulfillment_order_id INTEGER NOT NULL REFERENCES fulfillment_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quotation_item_id INTEGER REFERENCES quotation_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
    product_name VARCHAR(255),
    backordered_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fulfilled_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_code VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    plan_name VARCHAR(255) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Yearly')),
    recurring_amount NUMERIC(12, 2) NOT NULL,
    next_bill_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Modified', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_schedules (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    billing_date DATE NOT NULL,
    cycle_label VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Invoiced', 'Paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_code VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'One-Time' CHECK (invoice_type IN ('One-Time', 'Recurring')),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid', 'Overdue', 'Cancelled')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quotation_item_id INTEGER REFERENCES quotation_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
    description TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Credit Card',
    reference_code VARCHAR(100),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deal_health_anomalies (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    deal_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('STALLED', 'DISCOUNT_ANOMALY', 'SLIPPAGE')),
    issue_description VARCHAR(255) NOT NULL,
    flagged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'FLAGGED' CHECK (status IN ('FLAGGED', 'NUDGED', 'ESCALATED', 'RESOLVED')),
    action_note VARCHAR(255) DEFAULT 'Action pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_pairings (
    id SERIAL PRIMARY KEY,
    base_product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    suggested_product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tag VARCHAR(100) DEFAULT 'Frequently Bought Together',
    margin_delta NUMERIC(12, 2) DEFAULT 25.00,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS quotation_approval_requests (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    approval_chain_id INTEGER REFERENCES approval_chains(id) ON UPDATE CASCADE ON DELETE SET NULL,
    submitted_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_request_open ON quotation_approval_requests (quotation_id) WHERE status IN ('PENDING', 'RETURNED');
CREATE INDEX IF NOT EXISTS idx_approval_requests_quotation ON quotation_approval_requests (quotation_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON quotation_approval_requests (status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request_status ON quotation_approval_steps (approval_request_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_role ON quotation_approval_steps (approver_role);

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

CREATE INDEX IF NOT EXISTS idx_quotations_code ON quotations(quote_code);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(invoice_code);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_code ON subscriptions(subscription_code);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON warehouse_inventory(warehouse_id);