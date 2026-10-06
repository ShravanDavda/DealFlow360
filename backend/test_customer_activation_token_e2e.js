import crypto from "crypto";
import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";
const request = async (method, path, body, token = "") => {
    const options = { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    return { status: response.status, data: await response.json() };
};
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log(`PASS: ${message}`); };

const run = async () => {
    const adminLogin = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
    const repLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
    assert(adminLogin.status === 200 && repLogin.status === 200, "Admin and non-admin login succeed");
    const adminToken = adminLogin.data.data.token;
    const repToken = repLogin.data.data.token;
    const suffix = Date.now();
    const customer = await request("POST", "/customers", {
        customerCode: `ACT-${suffix}`,
        companyName: `Activation Test ${suffix}`,
        contactName: "Activation User",
        email: `activation.${suffix}@example.com`,
        customerTierId: 1,
        currency: "USD"
    }, adminToken);
    assert(customer.status === 201, "Admin creates customer activation account");
    const customerId = customer.data.data.id;
    const account = customer.data.data.portalAccount;
    assert(account.activationCode && account.activationExpiresAt, "Admin receives raw token and expiry from backend");
    assert(account.emailSent === false, "Email failure is reported when SMTP is not configured");
    const user = await pool.query("SELECT activation_code_hash, activation_expires_at FROM users WHERE customer_id = $1", [customerId]);
    assert(user.rows[0].activation_code_hash && user.rows[0].activation_code_hash !== account.activationCode, "Database stores a hash, never the raw token");
    assert(user.rows[0].activation_code_hash === crypto.createHash("sha256").update(account.activationCode).digest("hex"), "Stored hash matches the returned token");
    const denied = await request("POST", `/customers/${customerId}/reissue-activation`, undefined, repToken);
    assert(denied.status === 403, "Non-admin cannot generate activation tokens");
    const activated = await request("POST", "/auth/activate-customer", { email: account.email, activationCode: account.activationCode, password: "CustomerPass123!", confirmPassword: "CustomerPass123!" });
    assert(activated.status === 200, "Customer activates with the Admin-returned token");
    const login = await request("POST", "/auth/login", { email: account.email, password: "CustomerPass123!" });
    assert(login.status === 200 && login.data.data.user.role === "customer" && login.data.data.user.customerId === customerId, "Activated customer uses existing JWT login flow");
    const secondCustomer = await request("POST", "/customers", { customerCode: `ACT-R-${suffix}`, companyName: `Reissue Test ${suffix}`, contactName: "Reissue User", email: `reissue.${suffix}@example.com`, customerTierId: 1, currency: "USD" }, adminToken);
    const secondId = secondCustomer.data.data.id;
    const oldCode = secondCustomer.data.data.portalAccount.activationCode;
    const reissued = await request("POST", `/customers/${secondId}/reissue-activation`, undefined, adminToken);
    assert(reissued.status === 200 && reissued.data.data.activationCode !== oldCode, "Reissue generates a new token");
    const oldActivation = await request("POST", "/auth/activate-customer", { email: reissued.data.data.email, activationCode: oldCode, password: "CustomerPass123!" });
    assert(oldActivation.status === 400, "Old activation token is invalid after reissue");
    const newActivation = await request("POST", "/auth/activate-customer", { email: reissued.data.data.email, activationCode: reissued.data.data.activationCode, password: "CustomerPass123!" });
    assert(newActivation.status === 200, "New activation token works");
    await pool.query("DELETE FROM users WHERE customer_id IN ($1, $2)", [customerId, secondId]);
    await pool.query("DELETE FROM customers WHERE id IN ($1, $2)", [customerId, secondId]);
    await pool.end();
    console.log("Customer activation token E2E passed.");
};
run().catch((error) => { console.error(`Customer activation token E2E failed: ${error.message}`); process.exit(1); });
