

INSERT INTO customer_tiers (name, description, default_discount_ceiling)
VALUES
    ('Bronze', 'Standard customer tier (up to 5% discount ceiling)', 5.00),
    ('Silver', 'Mid-level customer tier (up to 10% discount ceiling)', 10.00),
    ('Gold', 'Premium customer tier (up to 15% discount ceiling)', 15.00),
    ('Platinum Enterprise', 'Strategic enterprise tier (up to 20% discount ceiling)', 20.00)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description,
    default_discount_ceiling = EXCLUDED.default_discount_ceiling;

SELECT setval('customer_tiers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customer_tiers));

INSERT INTO categories (name, description, discount_ceiling)
VALUES
    ('Hardware', 'Physical workstations, laptops, and compute devices (up to 15% discount)', 15.00),
    ('Services', 'Consulting, deployment and onsite engineering (thin margin, strictly up to 10% discount)', 10.00),
    ('Subscription', 'Recurring maintenance contracts and cloud services (governed up to 5% discount)', 5.00),
    ('Peripherals & Accessories', 'Keyboards, docks, webcams and display peripherals (up to 15% discount)', 15.00),
    ('Enterprise Infrastructure', 'Rackmount servers, storage units, and core networking (up to 12% discount)', 12.00)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description,
    discount_ceiling = EXCLUDED.discount_ceiling;

SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));

INSERT INTO customers (customer_code, company_name, contact_name, email, phone, customer_tier_id, address_line1, city, state, country, currency)
VALUES
    ('CUST-001', 'Acme Corp', 'John Doe', 'john@acme.com', '+1-555-0101', (SELECT id FROM customer_tiers WHERE name = 'Gold'), '100 Silicon Way', 'Austin', 'TX', 'USA', 'USD'),
    ('CUST-002', 'Beta Industries', 'Sarah Connor', 'sarah@betaind.com', '+1-555-0102', (SELECT id FROM customer_tiers WHERE name = 'Silver'), '450 Industrial Blvd', 'Chicago', 'IL', 'USA', 'USD'),
    ('CUST-003', 'Nova Retail', 'Alex Rivera', 'alex@novaretail.com', '+1-555-0103', (SELECT id FROM customer_tiers WHERE name = 'Bronze'), '789 Commerce St', 'New York', 'NY', 'USA', 'USD'),
    ('CUST-004', 'Zenith Co', 'Michael Chen', 'mchen@zenith.com', '+1-555-0104', (SELECT id FROM customer_tiers WHERE name = 'Silver'), '321 Tech Plaza', 'San Jose', 'CA', 'USA', 'USD'),
    ('CUST-005', 'Delta LLC', 'Emily Watson', 'emily@deltallc.com', '+1-555-0105', (SELECT id FROM customer_tiers WHERE name = 'Bronze'), '654 Logistics Way', 'Seattle', 'WA', 'USA', 'USD'),
    ('CUST-006', 'Orion Ltd', 'David Kim', 'dkim@orion.com', '+1-555-0106', (SELECT id FROM customer_tiers WHERE name = 'Gold'), '987 Enterprise Ave', 'Dallas', 'TX', 'USA', 'USD'),
    ('CUST-007', 'Apex Global Technologies', 'Claire Beauchamp', 'claire@apexglobal.com', '+1-555-0107', (SELECT id FROM customer_tiers WHERE name = 'Gold'), '200 Technology Square', 'Boston', 'MA', 'USA', 'USD'),
    ('CUST-008', 'Vortex Systems', 'Brian Foster', 'brian@vortextech.com', '+1-555-0108', (SELECT id FROM customer_tiers WHERE name = 'Silver'), '550 Rocky Mountain Way', 'Denver', 'CO', 'USA', 'USD'),
    ('CUST-009', 'Summit Healthcare Solutions', 'Karen Davis', 'karen@summithealth.com', '+1-555-0109', (SELECT id FROM customer_tiers WHERE name = 'Platinum Enterprise'), '800 Medical Center Dr', 'Minneapolis', 'MN', 'USA', 'USD'),
    ('CUST-010', 'Quantum Logistics Group', 'Marcus Reed', 'marcus@quantumlogistics.com', '+1-555-0110', (SELECT id FROM customer_tiers WHERE name = 'Bronze'), '1200 Freightliner Rd', 'Atlanta', 'GA', 'USA', 'USD'),
    ('CUST-011', 'Horizon Financial Partners', 'Laura Sterling', 'laura@horizonfin.com', '+1-555-0111', (SELECT id FROM customer_tiers WHERE name = 'Gold'), '400 Tryon St', 'Charlotte', 'NC', 'USA', 'USD'),
    ('CUST-012', 'Pacific Edge Media', 'Derek Tanaka', 'derek@pacificedge.com', '+1-555-0112', (SELECT id FROM customer_tiers WHERE name = 'Silver'), '750 Embarcadero St', 'San Francisco', 'CA', 'USA', 'USD')
ON CONFLICT (customer_code) DO UPDATE 
SET company_name = EXCLUDED.company_name,
    contact_name = EXCLUDED.contact_name,
    email = EXCLUDED.email,
    customer_tier_id = EXCLUDED.customer_tier_id,
    address_line1 = EXCLUDED.address_line1,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    currency = EXCLUDED.currency;

SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));

INSERT INTO users (username, email, password_hash, role, requested_role, first_name, last_name, is_active, registration_status, customer_id, status)
VALUES
    
    ('salesrep1', 'salesrep1@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'sales_rep', 'sales_rep', 'Maanas', 'Shah', TRUE, 'APPROVED', NULL, 'active'),
    ('manager1', 'manager@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'sales_manager', 'sales_manager', 'M.', 'Shah', TRUE, 'APPROVED', NULL, 'active'),
    ('finance1', 'finance@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'finance', 'finance', 'R.', 'Iyer', TRUE, 'APPROVED', NULL, 'active'),
    ('admin', 'admin@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'admin', 'admin', 'System', 'Administrator', TRUE, 'APPROVED', NULL, 'active'),
    ('salesrep2', 'salesrep2@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'sales_rep', 'sales_rep', 'Sarah', 'Jenkins', TRUE, 'APPROVED', NULL, 'active'),
    ('operations1', 'operations@dealflow360.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'operations', 'operations', 'David', 'Miller', TRUE, 'APPROVED', NULL, 'active'),
    
    ('cust_001', 'john@acme.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'John', 'Doe', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'active'),
    ('cust_002', 'sarah@betaind.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Sarah', 'Connor', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-002'), 'active'),
    ('cust_003', 'alex@novaretail.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Alex', 'Rivera', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-003'), 'active'),
    ('cust_004', 'mchen@zenith.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Michael', 'Chen', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-004'), 'active'),
    ('cust_005', 'emily@deltallc.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Emily', 'Watson', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-005'), 'active'),
    ('cust_006', 'dkim@orion.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'David', 'Kim', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-006'), 'active'),
    ('cust_apex', 'claire@apexglobal.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Claire', 'Beauchamp', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-007'), 'active'),
    ('cust_vortex', 'brian@vortextech.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Brian', 'Foster', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-008'), 'active'),
    ('cust_summit', 'karen@summithealth.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Karen', 'Davis', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-009'), 'active'),
    ('cust_quantum', 'marcus@quantumlogistics.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Marcus', 'Reed', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-010'), 'active'),
    ('cust_horizon', 'laura@horizonfin.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Laura', 'Sterling', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-011'), 'active'),
    ('cust_pacific', 'derek@pacificedge.com', '$2b$10$et8ub/aijMU.5LdWLTj3ueW21B.Dt9RjEOKoimZgzsuOLeuwefhfa', 'customer', 'customer', 'Derek', 'Tanaka', TRUE, 'APPROVED', (SELECT id FROM customers WHERE customer_code = 'CUST-012'), 'active')
ON CONFLICT (email) DO UPDATE 
SET username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    requested_role = EXCLUDED.requested_role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    customer_id = EXCLUDED.customer_id,
    is_active = TRUE,
    registration_status = 'APPROVED',
    status = 'active';

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

INSERT INTO products (category_id, name, sku, description, base_cost, unit, tax_percent, is_subscription, recurring_cycle)
VALUES
    ((SELECT id FROM categories WHERE name = 'Hardware'), 'Laptop Pro 14', 'PROD-001', 'High-performance business laptop, 14-inch retina display, lightweight aluminum chassis', 850.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Services'), 'Onsite Setup Service', 'PROD-002', 'Expert on-premises deployment, network integration, and initial workstation rollout', 200.00, 'Each', 10.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Peripherals & Accessories'), 'Docking Station', 'PROD-003', 'Universal USB-C dual 4K display dock with 100W Power Delivery and Ethernet', 90.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Subscription'), 'Care Plan 2yr', 'PROD-004', 'Extended warranty and 24/7 priority support with 4-hour SLA response', 15.00, 'Recurring', 0.00, TRUE, 'Monthly'),
    ((SELECT id FROM categories WHERE name = 'Subscription'), 'Support SLA', 'PROD-005', 'Enterprise tier Dedicated Technical Account Manager and quarterly health checks', 120.00, 'Recurring', 0.00, TRUE, 'Quarterly'),
    ((SELECT id FROM categories WHERE name = 'Peripherals & Accessories'), 'Wireless Mouse', 'PROD-006', 'Ergonomic multi-device Bluetooth mouse with precision optical sensor', 12.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Peripherals & Accessories'), 'Ergonomic Keyboard', 'PROD-007', 'Split ergonomic mechanical keyboard with low-profile tactile switches', 45.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Hardware'), 'Laptop Pro 16', 'PROD-016', 'Heavy-duty 16-inch mobile workstation with dedicated GPU and cooling chamber', 1450.00, 'Each', 18.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Hardware'), 'UltraWide 34-inch Monitor', 'PROD-009', 'Curved 3440x1440p IPS productivity display with integrated USB-C KVM hub', 380.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Subscription'), 'Cloud Backup 1TB', 'PROD-010', 'Encrypted continuous automated enterprise backup and ransomware recovery', 25.00, 'Recurring', 0.00, TRUE, 'Monthly'),
    ((SELECT id FROM categories WHERE name = 'Services'), 'Network Security Audit', 'PROD-011', 'Comprehensive penetration testing, firewall audit, and compliance report', 800.00, 'Each', 10.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Peripherals & Accessories'), '4K Conference Webcam', 'PROD-012', 'Ultra-HD conference room camera with auto-framing and dual stereo microphones', 65.00, 'Each', 15.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Enterprise Infrastructure'), 'Rackmount Server 2U', 'PROD-013', 'Dual Intel Xeon enterprise rack server with 64GB ECC RAM and redundant PSUs', 2200.00, 'Each', 18.00, FALSE, NULL),
    ((SELECT id FROM categories WHERE name = 'Subscription'), 'Annual Enterprise SLA', 'PROD-014', 'Dedicated 24/7 mission-critical response contract with guaranteed 1-hour onsite SLA', 600.00, 'Recurring', 0.00, TRUE, 'Yearly')
ON CONFLICT (sku) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_cost = EXCLUDED.base_cost,
    category_id = EXCLUDED.category_id,
    tax_percent = EXCLUDED.tax_percent,
    is_subscription = EXCLUDED.is_subscription,
    recurring_cycle = EXCLUDED.recurring_cycle;

SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));

INSERT INTO product_variants (product_id, variant_name, sku, attributes, additional_cost)
VALUES
    ((SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14 - Space Gray 16GB', 'PROD-001-SG16', '{"color": "Space Gray", "ram": "16GB", "ssd": "512GB"}', 0.00),
    ((SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14 - Midnight Black 32GB', 'PROD-001-MB32', '{"color": "Midnight Black", "ram": "32GB", "ssd": "1TB"}', 180.00),
    ((SELECT id FROM products WHERE sku = 'PROD-003'), 'Docking Station - Dual Display HDMI/DP', 'PROD-003-DUAL', '{"ports": "2x HDMI, 2x DP, 1GbE"}', 0.00),
    ((SELECT id FROM products WHERE sku = 'PROD-003'), 'Docking Station - Triple Display TB4', 'PROD-003-TRIPLE', '{"ports": "3x TB4, 2x DP, 2.5GbE"}', 60.00),
    ((SELECT id FROM products WHERE sku = 'PROD-016'), 'Laptop Pro 16 - 32GB / 1TB RTX 4070', 'PROD-016-32G', '{"ram": "32GB", "gpu": "RTX 4070", "ssd": "1TB"}', 0.00),
    ((SELECT id FROM products WHERE sku = 'PROD-016'), 'Laptop Pro 16 - 64GB / 2TB RTX 4090', 'PROD-016-64G', '{"ram": "64GB", "gpu": "RTX 4090", "ssd": "2TB"}', 450.00),
    ((SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch - Curved IPS', 'PROD-009-IPS', '{"panel": "IPS", "curvature": "1900R", "refresh": "120Hz"}', 0.00)
ON CONFLICT (sku) DO UPDATE
SET variant_name = EXCLUDED.variant_name,
    attributes = EXCLUDED.attributes,
    additional_cost = EXCLUDED.additional_cost;

SELECT setval('product_variants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_variants));

INSERT INTO price_lists (name, description, currency, is_default)
VALUES
    ('Standard Price List', 'Standard commercial catalog list prices in USD', 'USD', TRUE),
    ('Gold Partner Price List', 'Pre-negotiated partner tier volume discounts (approx 10% off list)', 'USD', FALSE),
    ('Platinum Enterprise Price List', 'Strategic volume tier pricing (approx 18% off list)', 'USD', FALSE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_default = EXCLUDED.is_default;

SELECT setval('price_lists_id_seq', (SELECT COALESCE(MAX(id), 1) FROM price_lists));

DELETE FROM price_list_items WHERE price_list_id IN (
    SELECT id FROM price_lists WHERE name IN ('Standard Price List', 'Gold Partner Price List', 'Platinum Enterprise Price List')
);
INSERT INTO price_list_items (price_list_id, product_id, unit_price, min_quantity)
VALUES
    
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-001'), 1200.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-002'), 450.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-003'), 180.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-004'), 46.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-005'), 300.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-006'), 35.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-007'), 120.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-016'), 2100.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-009'), 650.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-010'), 60.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-011'), 1800.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-012'), 160.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-013'), 3400.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Standard Price List'), (SELECT id FROM products WHERE sku = 'PROD-014'), 1200.00, 1),
    
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-001'), 1080.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-002'), 400.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-003'), 160.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-004'), 40.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-005'), 260.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-006'), 30.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-016'), 1890.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-009'), 580.00, 1),
    ((SELECT id FROM price_lists WHERE name = 'Gold Partner Price List'), (SELECT id FROM products WHERE sku = 'PROD-013'), 3050.00, 1),
    
    ((SELECT id FROM price_lists WHERE name = 'Platinum Enterprise Price List'), (SELECT id FROM products WHERE sku = 'PROD-001'), 980.00, 5),
    ((SELECT id FROM price_lists WHERE name = 'Platinum Enterprise Price List'), (SELECT id FROM products WHERE sku = 'PROD-016'), 1750.00, 5),
    ((SELECT id FROM price_lists WHERE name = 'Platinum Enterprise Price List'), (SELECT id FROM products WHERE sku = 'PROD-009'), 520.00, 5),
    ((SELECT id FROM price_lists WHERE name = 'Platinum Enterprise Price List'), (SELECT id FROM products WHERE sku = 'PROD-013'), 2800.00, 2);

SELECT setval('price_list_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM price_list_items));

DELETE FROM discount_rules WHERE name IN (
    'Bronze Catalog Standard', 'Silver Preferred Tier', 'Gold Volume Preferred',
    'Platinum Enterprise Contract', 'Manager Discretionary Tier', 'Executive Finance Approval'
);
INSERT INTO discount_rules (name, customer_tier_id, product_id, min_quantity, max_quantity, discount_percentage, approval_required, approval_level, is_active)
VALUES
    ('Bronze Catalog Standard', (SELECT id FROM customer_tiers WHERE name = 'Bronze'), NULL, 1, 50, 5.00, FALSE, 0, TRUE),
    ('Silver Preferred Tier', (SELECT id FROM customer_tiers WHERE name = 'Silver'), NULL, 1, 100, 10.00, FALSE, 0, TRUE),
    ('Gold Volume Preferred', (SELECT id FROM customer_tiers WHERE name = 'Gold'), NULL, 1, 250, 15.00, FALSE, 0, TRUE),
    ('Platinum Enterprise Contract', (SELECT id FROM customer_tiers WHERE name = 'Platinum Enterprise'), NULL, 1, 500, 20.00, FALSE, 0, TRUE),
    ('Manager Discretionary Tier', NULL, NULL, 1, NULL, 25.00, TRUE, 1, TRUE),
    ('Executive Finance Approval', NULL, NULL, 1, NULL, 40.00, TRUE, 2, TRUE);

SELECT setval('discount_rules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM discount_rules));

INSERT INTO approval_chains (name, min_discount_percent, max_discount_percent, min_risk, is_active)
VALUES
    ('Standard Manager Approval', 0.00, NULL, 'MEDIUM', TRUE),
    ('High Risk Manager Finance Approval', 0.00, NULL, 'HIGH', TRUE)
ON CONFLICT (name) DO UPDATE
SET min_discount_percent = EXCLUDED.min_discount_percent,
    max_discount_percent = EXCLUDED.max_discount_percent,
    min_risk = EXCLUDED.min_risk,
    is_active = EXCLUDED.is_active;

SELECT setval('approval_chains_id_seq', (SELECT COALESCE(MAX(id), 1) FROM approval_chains));

UPDATE approval_chains
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE name IN ('Standard Management Chain', 'High Discount Executive Chain', 'Strategic Deal Exception Chain');

DELETE FROM approval_chain_steps WHERE approval_chain_id IN (
    SELECT id FROM approval_chains WHERE name IN ('Standard Manager Approval', 'High Risk Manager Finance Approval')
);
INSERT INTO approval_chain_steps (approval_chain_id, step_order, approver_role)
VALUES
    ((SELECT id FROM approval_chains WHERE name = 'Standard Manager Approval'), 1, 'Sales Manager'),
    ((SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval'), 1, 'Sales Manager'),
    ((SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval'), 2, 'Finance');

SELECT setval('approval_chain_steps_id_seq', (SELECT COALESCE(MAX(id), 1) FROM approval_chain_steps));

INSERT INTO subscription_plans (name, description, billing_interval, recurring_price, proration_rule, cancellation_rule, partial_refund_rule, is_active)
VALUES
    ('Care Plan Pro SLA', 'Extended 24/7 technical assistance with monthly recurring billing', 'Monthly', 46.00, 'Calendar Month / Immediate (Prorate first cycle)', 'End of Billing Cycle', 'Prorated within 14 days', TRUE),
    ('Enterprise Cloud & Support SLA', 'Quarterly enterprise maintenance and remote engineer coverage', 'Quarterly', 300.00, 'Quarterly Block', 'End of Quarter', 'No refund after 30 days', TRUE),
    ('Annual Mission-Critical SLA', 'Yearly mission-critical uptime guarantee with dedicated TAM', 'Yearly', 1200.00, 'Annual Pre-paid', 'Annual Anniversary', 'Strictly Non-refundable', TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    recurring_price = EXCLUDED.recurring_price,
    billing_interval = EXCLUDED.billing_interval,
    is_active = EXCLUDED.is_active;

SELECT setval('subscription_plans_id_seq', (SELECT COALESCE(MAX(id), 1) FROM subscription_plans));

DELETE FROM subscription_plan_products WHERE subscription_plan_id IN (
    SELECT id FROM subscription_plans WHERE name IN ('Care Plan Pro SLA', 'Enterprise Cloud & Support SLA', 'Annual Mission-Critical SLA')
);
INSERT INTO subscription_plan_products (subscription_plan_id, product_id)
VALUES
    ((SELECT id FROM subscription_plans WHERE name = 'Care Plan Pro SLA'), (SELECT id FROM products WHERE sku = 'PROD-004')),
    ((SELECT id FROM subscription_plans WHERE name = 'Enterprise Cloud & Support SLA'), (SELECT id FROM products WHERE sku = 'PROD-005')),
    ((SELECT id FROM subscription_plans WHERE name = 'Enterprise Cloud & Support SLA'), (SELECT id FROM products WHERE sku = 'PROD-010')),
    ((SELECT id FROM subscription_plans WHERE name = 'Annual Mission-Critical SLA'), (SELECT id FROM products WHERE sku = 'PROD-014'));

SELECT setval('subscription_plan_products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM subscription_plan_products));

INSERT INTO warehouses (name, code, location, shipping_cost_weight, is_active)
VALUES
    ('Main Warehouse', 'WH-MAIN', 'Austin, TX - Primary Distribution Facility', 20.00, TRUE),
    ('East Depot', 'WH-EAST', 'Atlanta, GA - Regional Fulfillment Hub', 35.00, TRUE),
    ('West Distribution Center', 'WH-WEST', 'Reno, NV - Pacific Logistics Gateway', 25.00, TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    location = EXCLUDED.location,
    shipping_cost_weight = EXCLUDED.shipping_cost_weight,
    is_active = EXCLUDED.is_active;

SELECT setval('warehouses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM warehouses));

INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity)
VALUES
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-001'), 18, 2),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-001'), 6, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-WEST'), (SELECT id FROM products WHERE sku = 'PROD-001'), 10, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-003'), 40, 5),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-003'), 25, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-WEST'), (SELECT id FROM products WHERE sku = 'PROD-003'), 15, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-006'), 120, 10),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-006'), 45, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-WEST'), (SELECT id FROM products WHERE sku = 'PROD-006'), 60, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-007'), 50, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-007'), 30, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-016'), 12, 1),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-016'), 5, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-009'), 6, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-009'), 0, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-WEST'), (SELECT id FROM products WHERE sku = 'PROD-009'), 0, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-012'), 35, 2),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-012'), 20, 0),
    
    ((SELECT id FROM warehouses WHERE code = 'WH-MAIN'), (SELECT id FROM products WHERE sku = 'PROD-013'), 0, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-EAST'), (SELECT id FROM products WHERE sku = 'PROD-013'), 0, 0),
    ((SELECT id FROM warehouses WHERE code = 'WH-WEST'), (SELECT id FROM products WHERE sku = 'PROD-013'), 0, 0)
ON CONFLICT (warehouse_id, product_id) DO UPDATE
SET quantity_on_hand = EXCLUDED.quantity_on_hand,
    reserved_quantity = EXCLUDED.reserved_quantity;

SELECT setval('warehouse_inventory_id_seq', (SELECT COALESCE(MAX(id), 1) FROM warehouse_inventory));

DELETE FROM product_pairings WHERE base_product_id IN (
    SELECT id FROM products WHERE sku IN ('PROD-001', 'PROD-009', 'PROD-003', 'PROD-002')
);
INSERT INTO product_pairings (base_product_id, suggested_product_id, tag, margin_delta, priority, is_active, relationship_type)
VALUES
    ((SELECT id FROM products WHERE sku = 'PROD-001'), (SELECT id FROM products WHERE sku = 'PROD-003'), 'Frequently Bought Together', 32.00, 1, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-001'), (SELECT id FROM products WHERE sku = 'PROD-006'), 'Essential Accessory', 18.00, 2, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-001'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Extended Warranty & SLA', 46.00, 3, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-001'), (SELECT id FROM products WHERE sku = 'PROD-016'), 'Upgrade to 16-inch Mobile Workstation', 180.00, 1, TRUE, 'UPSELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-009'), (SELECT id FROM products WHERE sku = 'PROD-012'), 'Desktop Video Conference Suite', 40.00, 1, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-003'), (SELECT id FROM products WHERE sku = 'PROD-007'), 'Ergonomic Desktop Bundle', 25.00, 1, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-002'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Service Attachment', 40.00, 2, TRUE, 'CROSS_SELL'),
    ((SELECT id FROM products WHERE sku = 'PROD-001'), (SELECT id FROM products WHERE sku = 'PROD-013'), 'Enterprise Infrastructure (Inactive Demo)', 500.00, 9, FALSE, 'CROSS_SELL');

SELECT setval('product_pairings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_pairings));

INSERT INTO quotations (quote_code, customer_id, user_id, price_list_id, status, subtotal, total_discount, tax_amount, total_amount, overall_margin, blended_risk_score, approval_stage, payment_terms, customer_notes, internal_notes)
VALUES
    
    ('Q-1042', (SELECT id FROM customers WHERE customer_code = 'CUST-001'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Pending Approval', 3030.00, 369.00, 399.15, 3060.15, 31.50, 'HIGH', 'Sales Manager', 'Net 30', 'Customer requested rollout by end of month', 'Setup service discount is 18% vs 10% ceiling'),
    
    ('Q-1039', (SELECT id FROM customers WHERE customer_code = 'CUST-002'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Pending Approval', 28900.00, 3500.00, 3810.00, 29210.00, 28.40, 'MEDIUM', 'Sales Manager', 'Net 45', 'Enterprise expansion deal', 'Discount exceeds 20%; escalated to management review'),
    
    ('Q-1035', (SELECT id FROM customers WHERE customer_code = 'CUST-003'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Approved', 9750.00, 450.00, 1395.00, 10695.00, 34.00, 'LOW', 'Auto-Approved', 'Net 30', 'Standard catalog purchase', 'Within bronze tier ceiling'),
    
    ('Q-001', (SELECT id FROM customers WHERE customer_code = 'CUST-001'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Draft', 12400.00, 600.00, 1770.00, 13570.00, 33.20, 'LOW', 'None', 'Net 30', 'Initial discussion draft', 'Reviewing workstation configurations'),
    
    ('Q-002', (SELECT id FROM customers WHERE customer_code = 'CUST-005'), (SELECT id FROM users WHERE email = 'salesrep2@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Draft', 3200.00, 100.00, 465.00, 3565.00, 32.00, 'LOW', 'None', 'Net 15', 'Quick draft', 'Standard replacement peripherals'),
    
    ('Q-005', (SELECT id FROM customers WHERE customer_code = 'CUST-004'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Under Negotiation', 15300.00, 1200.00, 2115.00, 16215.00, 30.50, 'MEDIUM', 'Sales Manager', 'Net 30', 'Customer requested volume concession', 'Negotiation round 1 active'),
    
    ('Q-107', (SELECT id FROM customers WHERE customer_code = 'CUST-006'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Under Negotiation', 6500.00, 650.00, 877.50, 6727.50, 31.00, 'MEDIUM', 'None', 'Net 30', 'Customer counter-offer: 14% on monitors', 'Reviewing counter-discount with rep'),
    
    ('Q-108', (SELECT id FROM customers WHERE customer_code = 'CUST-009'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Approved', 18500.00, 1850.00, 2497.50, 19147.50, 33.50, 'LOW', 'Approved', 'Net 45', 'Counter-offer agreed at 10%', 'Approved by Sales Manager post-negotiation'),
    
    ('Q-109', (SELECT id FROM customers WHERE customer_code = 'CUST-010'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Rejected', 15000.00, 6750.00, 1237.50, 9487.50, 12.00, 'HIGH', 'Rejected', 'Net 30', 'Heavy tender bid', 'Margin collapsed to 12%; rejected by Finance'),
    
    ('Q-1030', (SELECT id FROM customers WHERE customer_code = 'CUST-004'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 2200.00, 150.00, 307.50, 2357.50, 32.80, 'LOW', 'Approved', 'Net 30', 'Order confirmed by customer', 'Handed over to warehouse for shipment split'),
    
    ('Q-111', (SELECT id FROM customers WHERE customer_code = 'CUST-007'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 6500.00, 325.00, 926.25, 7101.25, 33.80, 'LOW', 'Approved', 'Net 30', 'Urgent deployment', 'Warehouse 1 shipped 6 units; 4 units backordered'),
    
    ('Q-112', (SELECT id FROM customers WHERE customer_code = 'CUST-008'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 17000.00, 850.00, 2907.00, 19057.00, 29.50, 'MEDIUM', 'Approved', 'Net 60', 'Data center project', 'Factory replenishment expected in 14 days'),
    
    ('Q-113', (SELECT id FROM customers WHERE customer_code = 'CUST-012'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 28800.00, 1440.00, 4104.00, 31464.00, 34.20, 'LOW', 'Approved', 'Net 30', 'Annual device refresh', 'Fulfilled across Main Warehouse and East Depot'),
    
    ('Q-114', (SELECT id FROM customers WHERE customer_code = 'CUST-002'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 1200.00, 0.00, 0.00, 1200.00, 50.00, 'LOW', 'Approved', 'Due on Receipt', 'Annual enterprise SLA subscription', 'Subscription contract SUB-004 active'),
    
    ('Q-115', (SELECT id FROM customers WHERE customer_code = 'CUST-001'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), (SELECT id FROM price_lists WHERE name = 'Standard Price List'), 'Confirmed', 3296.00, 165.00, 469.65, 3600.65, 33.10, 'LOW', 'Approved', 'Net 30', 'Mixed hardware and care plan', 'One-time invoice INV-115 + Recurring invoice INV-115-R')
ON CONFLICT (quote_code) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    user_id = EXCLUDED.user_id,
    price_list_id = EXCLUDED.price_list_id,
    status = EXCLUDED.status,
    subtotal = EXCLUDED.subtotal,
    total_discount = EXCLUDED.total_discount,
    tax_amount = EXCLUDED.tax_amount,
    total_amount = EXCLUDED.total_amount,
    overall_margin = EXCLUDED.overall_margin,
    blended_risk_score = EXCLUDED.blended_risk_score,
    approval_stage = EXCLUDED.approval_stage,
    payment_terms = EXCLUDED.payment_terms,
    customer_notes = EXCLUDED.customer_notes,
    internal_notes = EXCLUDED.internal_notes;

SELECT setval('quotations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotations));

DELETE FROM quotation_items WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-1042', 'Q-1039', 'Q-1035', 'Q-001', 'Q-002', 'Q-005', 'Q-107', 'Q-108', 'Q-109', 'Q-1030', 'Q-111', 'Q-112', 'Q-113', 'Q-114', 'Q-115')
);
INSERT INTO quotation_items (quotation_id, product_id, item_name, category_name, quantity, unit_price, base_cost, discount_percent, discount_limit, line_total, margin_percent, risk_status, is_recurring, recurring_cycle, tax_percent)
VALUES
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 2, 1200.00, 850.00, 12.00, 15.00, 2112.00, 19.50, 'OK', FALSE, NULL, 15.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM products WHERE sku = 'PROD-002'), 'Onsite Setup Service', 'Services', 1, 450.00, 200.00, 18.00, 10.00, 369.00, 45.80, 'OVER (+8pt)', FALSE, NULL, 10.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Care Plan 2yr', 'Subscription', 1, 46.00, 15.00, 0.00, 5.00, 46.00, 67.40, 'OK', TRUE, 'Monthly', 0.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM products WHERE sku = 'PROD-016'), 'Laptop Pro 16', 'Hardware', 10, 2100.00, 1450.00, 22.00, 15.00, 16380.00, 11.50, 'OVER (+7pt)', FALSE, NULL, 18.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM products WHERE sku = 'PROD-003'), 'Docking Station', 'Peripherals & Accessories', 10, 180.00, 90.00, 15.00, 15.00, 1530.00, 41.20, 'OK', FALSE, NULL, 15.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM products WHERE sku = 'PROD-005'), 'Support SLA', 'Subscription', 4, 300.00, 120.00, 0.00, 5.00, 1200.00, 60.00, 'OK', TRUE, 'Quarterly', 0.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1035'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 8, 1200.00, 850.00, 4.00, 5.00, 9216.00, 27.50, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-001'), (SELECT id FROM products WHERE sku = 'PROD-016'), 'Laptop Pro 16', 'Hardware', 5, 2100.00, 1450.00, 5.00, 15.00, 9975.00, 27.30, 'OK', FALSE, NULL, 18.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-001'), (SELECT id FROM products WHERE sku = 'PROD-003'), 'Docking Station', 'Peripherals & Accessories', 5, 180.00, 90.00, 5.00, 15.00, 855.00, 47.40, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-005'), (SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch Monitor', 'Hardware', 20, 650.00, 380.00, 12.00, 10.00, 11440.00, 33.60, 'OVER (+2pt)', FALSE, NULL, 15.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-005'), (SELECT id FROM products WHERE sku = 'PROD-012'), '4K Conference Webcam', 'Peripherals & Accessories', 10, 160.00, 65.00, 10.00, 15.00, 1440.00, 54.90, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-107'), (SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch Monitor', 'Hardware', 10, 650.00, 380.00, 14.00, 15.00, 5590.00, 32.00, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-108'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 15, 1200.00, 850.00, 10.00, 20.00, 16200.00, 21.30, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-109'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 10, 1200.00, 850.00, 45.00, 15.00, 6600.00, -28.80, 'OVER (+30pt)', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1030'), (SELECT id FROM products WHERE sku = 'PROD-007'), 'Ergonomic Keyboard', 'Peripherals & Accessories', 15, 120.00, 45.00, 8.00, 10.00, 1656.00, 59.20, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-111'), (SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch Monitor', 'Hardware', 10, 650.00, 380.00, 5.00, 15.00, 6175.00, 38.50, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-112'), (SELECT id FROM products WHERE sku = 'PROD-013'), 'Rackmount Server 2U', 'Enterprise Infrastructure', 5, 3400.00, 2200.00, 5.00, 10.00, 16150.00, 31.90, 'OK', FALSE, NULL, 18.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-113'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 24, 1200.00, 850.00, 5.00, 15.00, 27360.00, 25.40, 'OK', FALSE, NULL, 15.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-114'), (SELECT id FROM products WHERE sku = 'PROD-014'), 'Annual Enterprise SLA', 'Subscription', 1, 1200.00, 600.00, 0.00, 5.00, 1200.00, 50.00, 'OK', TRUE, 'Yearly', 0.00),
    
    ((SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'Hardware', 2, 1200.00, 850.00, 5.00, 15.00, 2280.00, 25.40, 'OK', FALSE, NULL, 15.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM products WHERE sku = 'PROD-002'), 'Onsite Setup Service', 'Services', 1, 450.00, 200.00, 5.00, 10.00, 427.50, 53.20, 'OK', FALSE, NULL, 10.00),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Care Plan 2yr', 'Subscription', 1, 46.00, 15.00, 0.00, 5.00, 46.00, 67.40, 'OK', TRUE, 'Monthly', 0.00);

SELECT setval('quotation_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotation_items));

DELETE FROM quotation_audit_trail WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-1042', 'Q-1039', 'Q-1035', 'Q-001', 'Q-002', 'Q-005', 'Q-107', 'Q-108', 'Q-109', 'Q-1030', 'Q-111', 'Q-112', 'Q-113', 'Q-114', 'Q-115')
);
INSERT INTO quotation_audit_trail (quotation_id, user_id, user_name, user_role, action, note)
VALUES
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'Maanas Shah', 'sales_rep', 'Submitted', 'Initial quote created with 12% discount on hardware and 18% on service'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), 'M. Shah', 'sales_manager', 'Returned', 'Requested margin justification for service discount exceeding 10% ceiling'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'Maanas Shah', 'sales_rep', 'Resubmitted', 'Added margin justification note (+45.8% gross margin retained on service)'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'Maanas Shah', 'sales_rep', 'Submitted', 'Enterprise bundle submitted requiring multi-tier approval'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), 'M. Shah', 'sales_manager', 'Approved', 'Sales Manager approved tier 1; escalated to Finance for tier 2 review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-005'), (SELECT id FROM users WHERE email = 'mchen@zenith.com'), 'Michael Chen', 'customer', 'Negotiation Request', 'Customer requested 12% concession on 20 UltraWide monitors'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-107'), (SELECT id FROM users WHERE email = 'dkim@orion.com'), 'David Kim', 'customer', 'Negotiation Request', 'Customer submitted formal counter-offer of 14% on monitors'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-108'), (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), 'M. Shah', 'sales_manager', 'Approved', 'Manager accepted customer counter-offer at 10%'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-109'), (SELECT id FROM users WHERE email = 'finance@dealflow360.com'), 'R. Iyer', 'finance', 'Rejected', 'Finance rejected 45% discount due to negative deal gross contribution'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1030'), (SELECT id FROM users WHERE email = 'mchen@zenith.com'), 'Michael Chen', 'customer', 'Confirmed', 'Customer approved final quotation terms in portal'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-113'), (SELECT id FROM users WHERE email = 'derek@pacificedge.com'), 'Derek Tanaka', 'customer', 'Confirmed', 'Customer confirmed 24 workstation rollout; triggered multi-warehouse fulfillment');

SELECT setval('quotation_audit_trail_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotation_audit_trail));

DELETE FROM quotation_negotiation_lines WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-1042', 'Q-1039', 'Q-1035', 'Q-001', 'Q-002', 'Q-005', 'Q-107', 'Q-108', 'Q-109', 'Q-1030', 'Q-111', 'Q-112', 'Q-113', 'Q-114', 'Q-115')
);
INSERT INTO quotation_negotiation_lines (quotation_id, product_name, customer_comment, requested_discount, status)
VALUES
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), 'Laptop Pro 14', 'Can this be 15% off instead of 12%?', 15.00, 'Under Review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), 'Onsite Setup Service', 'Can we push deployment to next month?', NULL, 'Under Review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), 'Support SLA', 'Can the billing cycle be changed from Quarterly to Annual?', 10.00, 'Under Review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-005'), 'UltraWide 34-inch Monitor', 'We are purchasing 20 units; can you match 12% volume discount?', 12.00, 'Under Review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-107'), 'UltraWide 34-inch Monitor', 'Counter offer: 14% discount and we sign immediately', 14.00, 'Under Review'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-108'), 'Laptop Pro 14', 'Agreed on 10% discount across 15 laptops', 10.00, 'Accepted');

SELECT setval('quotation_negotiation_lines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotation_negotiation_lines));

DELETE FROM quotation_approval_steps WHERE approval_request_id IN (
    SELECT id FROM quotation_approval_requests WHERE quotation_id IN (
        SELECT id FROM quotations WHERE quote_code IN ('Q-1042', 'Q-1039', 'Q-108', 'Q-109')
    )
);
DELETE FROM quotation_approval_requests WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-1042', 'Q-1039', 'Q-108', 'Q-109')
);

INSERT INTO quotation_approval_requests (quotation_id, approval_chain_id, submitted_by, status)
VALUES
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'PENDING'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM approval_chains WHERE name = 'Standard Manager Approval'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'PENDING'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-108'), (SELECT id FROM approval_chains WHERE name = 'Standard Manager Approval'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'APPROVED'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-109'), (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval'), (SELECT id FROM users WHERE email = 'salesrep1@dealflow360.com'), 'REJECTED');

INSERT INTO quotation_approval_steps (approval_request_id, approval_chain_step_id, step_order, approver_role, status, approver_id, comment)
VALUES
    
    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-1042')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval') AND step_order = 1),
     1, 'Sales Manager', 'PENDING', (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), NULL),

    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-1042')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval') AND step_order = 2),
    2, 'Finance', 'WAITING', NULL, NULL),

    
    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-1039')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'Standard Manager Approval') AND step_order = 1),
        1, 'Sales Manager', 'PENDING', NULL, NULL),

    
    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-108')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'Standard Manager Approval') AND step_order = 1),
     1, 'Sales Manager', 'APPROVED', (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), 'Approved post-negotiation counter-offer of 10%'),

    
    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-109')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval') AND step_order = 1),
     1, 'Sales Manager', 'APPROVED', (SELECT id FROM users WHERE email = 'manager@dealflow360.com'), 'Manager endorsed for market share grab'),
    ((SELECT id FROM quotation_approval_requests WHERE quotation_id = (SELECT id FROM quotations WHERE quote_code = 'Q-109')),
    (SELECT id FROM approval_chain_steps WHERE approval_chain_id = (SELECT id FROM approval_chains WHERE name = 'High Risk Manager Finance Approval') AND step_order = 2),
     2, 'Finance', 'REJECTED', (SELECT id FROM users WHERE email = 'finance@dealflow360.com'), 'Finance rejected: 45% discount produces negative deal operating contribution');

SELECT setval('quotation_approval_requests_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotation_approval_requests));
SELECT setval('quotation_approval_steps_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quotation_approval_steps));

INSERT INTO fulfillment_orders (order_code, quotation_id, customer_name, status, total_shipments, estimated_shipping_cost, backorder_consolidated)
VALUES
    ('ORD-1042', (SELECT id FROM quotations WHERE quote_code = 'Q-1042'), 'Acme Corp', 'Split Accepted', 2, 71.00, FALSE),
    ('ORD-1030', (SELECT id FROM quotations WHERE quote_code = 'Q-1030'), 'Zenith Co', 'Split Accepted', 1, 20.00, FALSE),
    ('ORD-111', (SELECT id FROM quotations WHERE quote_code = 'Q-111'), 'Apex Global Technologies', 'Partially Shipped', 1, 20.00, FALSE),
    ('ORD-112', (SELECT id FROM quotations WHERE quote_code = 'Q-112'), 'Vortex Systems', 'Backordered', 0, 0.00, FALSE),
    ('ORD-113', (SELECT id FROM quotations WHERE quote_code = 'Q-113'), 'Pacific Edge Media', 'Fulfilled', 2, 55.00, TRUE),
    ('ORD-115', (SELECT id FROM quotations WHERE quote_code = 'Q-115'), 'Acme Corp', 'Fulfilled', 1, 20.00, TRUE)
ON CONFLICT (order_code) DO UPDATE
SET status = EXCLUDED.status,
    backorder_consolidated = EXCLUDED.backorder_consolidated;

SELECT setval('fulfillment_orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM fulfillment_orders));

DELETE FROM fulfillment_splits WHERE fulfillment_order_id IN (
    SELECT id FROM fulfillment_orders WHERE order_code IN ('ORD-1042', 'ORD-1030', 'ORD-111', 'ORD-112', 'ORD-113', 'ORD-115')
);
INSERT INTO fulfillment_splits (fulfillment_order_id, warehouse_id, warehouse_name, product_id, quantity_fulfilled, estimated_shipments, shipping_cost)
VALUES
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-1042'), (SELECT id FROM warehouses WHERE code = 'WH-MAIN'), 'Main Warehouse', (SELECT id FROM products WHERE sku = 'PROD-001'), 2, 1, 20.00),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-1030'), (SELECT id FROM warehouses WHERE code = 'WH-MAIN'), 'Main Warehouse', (SELECT id FROM products WHERE sku = 'PROD-007'), 15, 1, 20.00),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-111'), (SELECT id FROM warehouses WHERE code = 'WH-MAIN'), 'Main Warehouse', (SELECT id FROM products WHERE sku = 'PROD-009'), 6, 1, 20.00),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-113'), (SELECT id FROM warehouses WHERE code = 'WH-MAIN'), 'Main Warehouse', (SELECT id FROM products WHERE sku = 'PROD-001'), 18, 1, 20.00),
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-113'), (SELECT id FROM warehouses WHERE code = 'WH-EAST'), 'East Depot', (SELECT id FROM products WHERE sku = 'PROD-001'), 6, 1, 35.00),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-115'), (SELECT id FROM warehouses WHERE code = 'WH-MAIN'), 'Main Warehouse', (SELECT id FROM products WHERE sku = 'PROD-001'), 2, 1, 20.00);

SELECT setval('fulfillment_splits_id_seq', (SELECT COALESCE(MAX(id), 1) FROM fulfillment_splits));

DELETE FROM backorder_records WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-111', 'Q-112', 'Q-113')
);
INSERT INTO backorder_records (fulfillment_order_id, quotation_id, product_id, product_name, backordered_quantity, fulfilled_quantity, status)
VALUES
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-111'), (SELECT id FROM quotations WHERE quote_code = 'Q-111'), (SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch Monitor', 4, 6, 'PARTIALLY_FULFILLED'),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-112'), (SELECT id FROM quotations WHERE quote_code = 'Q-112'), (SELECT id FROM products WHERE sku = 'PROD-013'), 'Rackmount Server 2U', 5, 0, 'PENDING'),
    
    ((SELECT id FROM fulfillment_orders WHERE order_code = 'ORD-113'), (SELECT id FROM quotations WHERE quote_code = 'Q-113'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 0, 24, 'FULFILLED');

SELECT setval('backorder_records_id_seq', (SELECT COALESCE(MAX(id), 1) FROM backorder_records));

INSERT INTO subscriptions (subscription_code, quotation_id, customer_id, plan_name, billing_cycle, recurring_amount, next_bill_date, status)
VALUES
    ('SUB-001', (SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'Care Plan 2yr', 'Monthly', 46.00, '2026-10-15', 'Active'),
    ('SUB-002', (SELECT id FROM quotations WHERE quote_code = 'Q-1039'), (SELECT id FROM customers WHERE customer_code = 'CUST-002'), 'Support SLA', 'Quarterly', 300.00, '2026-11-01', 'Active'),
    ('SUB-003', (SELECT id FROM quotations WHERE quote_code = 'Q-002'), (SELECT id FROM customers WHERE customer_code = 'CUST-005'), 'Care Plan 1yr', 'Monthly', 40.00, '2026-10-01', 'Active'),
    ('SUB-004', (SELECT id FROM quotations WHERE quote_code = 'Q-114'), (SELECT id FROM customers WHERE customer_code = 'CUST-002'), 'Annual Enterprise SLA', 'Yearly', 1200.00, '2027-09-01', 'Active'),
    ('SUB-005', (SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'Care Plan 2yr - Hybrid', 'Monthly', 46.00, '2026-10-01', 'Active')
ON CONFLICT (subscription_code) DO UPDATE
SET status = EXCLUDED.status,
    recurring_amount = EXCLUDED.recurring_amount;

SELECT setval('subscriptions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM subscriptions));

DELETE FROM billing_schedules WHERE subscription_id IN (
    SELECT id FROM subscriptions WHERE subscription_code IN ('SUB-001', 'SUB-002', 'SUB-003', 'SUB-004', 'SUB-005')
);
INSERT INTO billing_schedules (subscription_id, billing_date, cycle_label, amount, status)
VALUES
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-001'), '2026-09-15', 'Cycle 1 (Sep 2026)', 46.00, 'Paid'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-001'), '2026-10-15', 'Cycle 2 (Oct 2026)', 46.00, 'Scheduled'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-001'), '2026-11-15', 'Cycle 3 (Nov 2026)', 46.00, 'Scheduled'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-002'), '2026-08-01', 'Q3 2026', 300.00, 'Paid'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-002'), '2026-11-01', 'Q4 2026', 300.00, 'Scheduled'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-004'), '2026-09-01', 'Year 1 (2026-2027)', 1200.00, 'Paid'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-005'), '2026-09-01', 'Cycle 1 (Sep 2026)', 46.00, 'Paid'),
    ((SELECT id FROM subscriptions WHERE subscription_code = 'SUB-005'), '2026-10-01', 'Cycle 2 (Oct 2026)', 46.00, 'Scheduled');

SELECT setval('billing_schedules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM billing_schedules));

INSERT INTO invoices (invoice_code, quotation_id, customer_id, invoice_type, amount, currency, status, due_date, paid_at)
VALUES
    ('INV-1042', (SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'One-Time', 2730.00, 'USD', 'Unpaid', '2026-09-30', NULL),
    ('INV-1043', (SELECT id FROM quotations WHERE quote_code = 'Q-1042'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'Recurring', 46.00, 'USD', 'Paid', '2026-09-15', '2026-09-15 10:30:00+00'),
    ('INV-1038', (SELECT id FROM quotations WHERE quote_code = 'Q-1035'), (SELECT id FROM customers WHERE customer_code = 'CUST-003'), 'One-Time', 10695.00, 'USD', 'Paid', '2026-08-30', '2026-08-28 14:15:00+00'),
    ('INV-1030', (SELECT id FROM quotations WHERE quote_code = 'Q-1030'), (SELECT id FROM customers WHERE customer_code = 'CUST-004'), 'One-Time', 2357.50, 'USD', 'Unpaid', '2026-10-05', NULL),
    ('INV-111', (SELECT id FROM quotations WHERE quote_code = 'Q-111'), (SELECT id FROM customers WHERE customer_code = 'CUST-007'), 'One-Time', 7101.25, 'USD', 'Unpaid', '2026-10-01', NULL),
    ('INV-113', (SELECT id FROM quotations WHERE quote_code = 'Q-113'), (SELECT id FROM customers WHERE customer_code = 'CUST-012'), 'One-Time', 31464.00, 'USD', 'Paid', '2026-09-10', '2026-09-08 11:20:00+00'),
    ('INV-114', (SELECT id FROM quotations WHERE quote_code = 'Q-114'), (SELECT id FROM customers WHERE customer_code = 'CUST-002'), 'Recurring', 1200.00, 'USD', 'Paid', '2026-09-01', '2026-09-01 09:00:00+00'),
    ('INV-115', (SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'One-Time', 3110.65, 'USD', 'Paid', '2026-09-15', '2026-09-12 16:45:00+00'),
    ('INV-115-R', (SELECT id FROM quotations WHERE quote_code = 'Q-115'), (SELECT id FROM customers WHERE customer_code = 'CUST-001'), 'Recurring', 46.00, 'USD', 'Paid', '2026-09-15', '2026-09-12 16:45:00+00')
ON CONFLICT (invoice_code) DO UPDATE
SET status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    paid_at = EXCLUDED.paid_at;

SELECT setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoices));

DELETE FROM payments WHERE invoice_id IN (
    SELECT id FROM invoices WHERE invoice_code IN ('INV-1042', 'INV-1043', 'INV-1038', 'INV-1030', 'INV-111', 'INV-113', 'INV-114', 'INV-115', 'INV-115-R')
);
DELETE FROM invoice_items WHERE invoice_id IN (
    SELECT id FROM invoices WHERE invoice_code IN ('INV-1042', 'INV-1043', 'INV-1038', 'INV-1030', 'INV-111', 'INV-113', 'INV-114', 'INV-115', 'INV-115-R')
);

INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, discount_amount, tax_amount, line_total, amount, total)
VALUES
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1042'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'High-performance business laptop, 14-inch retina display', 2, 1200.00, 12.00, 15.00, 288.00, 316.80, 2112.00, 2112.00, 2112.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1042'), (SELECT id FROM products WHERE sku = 'PROD-002'), 'Onsite Setup Service', 'Expert on-premises deployment and initial rollout', 1, 450.00, 18.00, 10.00, 81.00, 36.90, 369.00, 369.00, 369.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1043'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Care Plan 2yr', 'Extended warranty and priority support', 1, 46.00, 0.00, 0.00, 0.00, 0.00, 46.00, 46.00, 46.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1038'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'High-performance business laptop, 14-inch retina display', 8, 1200.00, 4.00, 15.00, 384.00, 1382.40, 9216.00, 9216.00, 9216.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1030'), (SELECT id FROM products WHERE sku = 'PROD-007'), 'Ergonomic Keyboard', 'Split ergonomic mechanical keyboard', 15, 120.00, 8.00, 15.00, 144.00, 248.40, 1656.00, 1656.00, 1656.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-111'), (SELECT id FROM products WHERE sku = 'PROD-009'), 'UltraWide 34-inch Monitor', 'Curved 3440x1440p IPS productivity display', 10, 650.00, 5.00, 15.00, 325.00, 926.25, 6175.00, 6175.00, 6175.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-113'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'High-performance business laptop, 14-inch retina display', 24, 1200.00, 5.00, 15.00, 1440.00, 4104.00, 27360.00, 27360.00, 27360.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-114'), (SELECT id FROM products WHERE sku = 'PROD-014'), 'Annual Enterprise SLA', 'Mission-critical 24/7 coverage contract', 1, 1200.00, 0.00, 0.00, 0.00, 0.00, 1200.00, 1200.00, 1200.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-115'), (SELECT id FROM products WHERE sku = 'PROD-001'), 'Laptop Pro 14', 'High-performance business laptop, 14-inch retina display', 2, 1200.00, 5.00, 15.00, 120.00, 342.00, 2280.00, 2280.00, 2280.00),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-115'), (SELECT id FROM products WHERE sku = 'PROD-002'), 'Onsite Setup Service', 'Expert on-premises deployment', 1, 450.00, 5.00, 10.00, 22.50, 42.75, 427.50, 427.50, 427.50),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-115-R'), (SELECT id FROM products WHERE sku = 'PROD-004'), 'Care Plan 2yr', 'Monthly recurring warranty and SLA', 1, 46.00, 0.00, 0.00, 0.00, 0.00, 46.00, 46.00, 46.00);

SELECT setval('invoice_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoice_items));

INSERT INTO payments (invoice_id, amount, payment_method, reference_code)
VALUES
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1043'), 46.00, 'ACH / Wire', 'PAY-REF-99214'),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-1038'), 10695.00, 'Corporate Credit Card', 'PAY-REF-88412'),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-113'), 31464.00, 'Wire Transfer', 'PAY-REF-77109'),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-114'), 1200.00, 'ACH Direct Debit', 'PAY-REF-66321'),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-115'), 3110.65, 'Corporate Credit Card', 'PAY-REF-55418'),
    ((SELECT id FROM invoices WHERE invoice_code = 'INV-115-R'), 46.00, 'ACH Direct Debit', 'PAY-REF-55419');

SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payments));

DELETE FROM deal_health_anomalies WHERE quotation_id IN (
    SELECT id FROM quotations WHERE quote_code IN ('Q-1039', 'Q-005', 'Q-112')
);
INSERT INTO deal_health_anomalies (quotation_id, deal_code, customer_name, issue_type, issue_description, flagged_date, status, action_note)
VALUES
    ((SELECT id FROM quotations WHERE quote_code = 'Q-1039'), 'Q-1039', 'Beta Industries', 'DISCOUNT_ANOMALY', 'Overall discount 22% on enterprise deal exceeds historical 8% average', '2026-08-25', 'ESCALATED', 'Escalated to Finance Director for blended margin evaluation'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-005'), 'Q-005', 'Zenith Co', 'STALLED', 'Quotation idle 8 days in customer negotiation without update', '2026-08-28', 'NUDGED', 'Automated nudge dispatched to sales rep Maanas Shah'),
    ((SELECT id FROM quotations WHERE quote_code = 'Q-112'), 'Q-112', 'Vortex Systems', 'SLIPPAGE', 'Delivery timeline slipped due to zero warehouse stock on 2U server', '2026-09-02', 'FLAGGED', 'Operations monitoring manufacturer replenishment schedule');

SELECT setval('deal_health_anomalies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM deal_health_anomalies));

UPDATE users SET is_active = TRUE, status = 'active', registration_status = 'APPROVED' WHERE role = 'customer';

UPDATE products
SET cgst_percent = tax_percent / 2,
    sgst_percent = tax_percent / 2
WHERE tax_percent <> 0 AND cgst_percent = 0 AND sgst_percent = 0;

UPDATE quotation_items
SET cgst_percent = tax_percent / 2,
    sgst_percent = tax_percent / 2
WHERE tax_percent <> 0 AND cgst_percent = 0 AND sgst_percent = 0;
