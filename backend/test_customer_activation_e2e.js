import jwt from "jsonwebtoken";
import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

const request = async (method, path, body = null, headers = {}) => {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${path}`, options);
    const contentType = res.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await res.json();
    } else {
        data = await res.text();
    }
    return {
        status: res.status,
        data
    };
};

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
};

async function runTests() {
    console.log("==================================================");
    console.log("STARTING CUSTOMER ACTIVATION E2E TEST SUITE");
    console.log("==================================================\n");

    const timestamp = Date.now();
    const testEmail = `cust.act.${timestamp}@enterprise.io`;
    const testCode = `CUST-${timestamp.toString().slice(-6)}`;
    const testPassword = "SuperSecurePass123!";

    let adminToken = "";
    let salesRepToken = "";
    let createdCustomerId = null;
    let initialActivationCode = "";
    let reissuedActivationCode = "";
    let customerUserToken = "";

    try {
        console.log("--- STEP 1: Admin Authentication ---");
        const adminLoginRes = await request("POST", "/auth/login", {
            email: "admin@dealflow360.com",
            password: "password123"
        });
        if (adminLoginRes.status !== 200) {
            console.error("Admin login response:", adminLoginRes);
        }
        assert(adminLoginRes.status === 200, "Admin login returned 200");
        adminToken = adminLoginRes.data.data.token;
        assert(adminToken && adminLoginRes.data.data.user.role === "admin", "Admin token obtained with admin role");

        const repLoginRes = await request("POST", "/auth/login", {
            email: "salesrep1@dealflow360.com",
            password: "password123"
        });
        salesRepToken = repLoginRes.data.data.token;
        assert(salesRepToken && repLoginRes.data.data.user.role === "sales_rep", "Sales rep token obtained");

        console.log("\n--- STEP 2: Admin Creates Customer with Portal Account ---");
        const createRes = await request(
            "POST",
            "/customers",
            {
                customerCode: testCode,
                companyName: `Acme Activation Corp ${timestamp}`,
                contactName: "Alex Vance",
                email: testEmail,
                phone: "+1-555-0199",
                customerTierId: 1,
                currency: "USD"
            },
            { Authorization: `Bearer ${adminToken}` }
        );

        assert(createRes.status === 201, "Customer creation returned 201");
        const createdData = createRes.data.data;
        createdCustomerId = createdData.id;
        assert(createdCustomerId, `Customer created with ID ${createdCustomerId}`);
        assert(createdData.portalAccount, "Response includes portalAccount details");
        assert(createdData.portalAccount.status === "pending_activation", "portalAccount status is pending_activation");
        initialActivationCode = createdData.portalAccount.activationCode;
        assert(/^DF360-[2-9A-HJ-NP-Z]{6}$/.test(initialActivationCode), `Activation code format valid: ${initialActivationCode}`);
        assert(createdData.portalAccount.activationExpiresAt, "portalAccount has activationExpiresAt timestamp");

        console.log("\n--- STEP 3: Database Verification (Pending Activation) ---");
        const userDbRes = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = $1",
            [testEmail.toLowerCase()]
        );
        assert(userDbRes.rows.length === 1, "Exactly one user record created in users table");
        const userRow = userDbRes.rows[0];
        assert(userRow.role === "customer", "User role is 'customer'");
        assert(userRow.customer_id === createdCustomerId, "User linked directly to customer_id");
        assert(userRow.status === "pending_activation", "User status is 'pending_activation'");
        assert(userRow.is_active === false, "User is_active is FALSE");
        assert(userRow.password_hash === null, "User password_hash is NULL (customer chooses own password)");
        assert(userRow.activation_code_hash && userRow.activation_code_hash.length === 64, "activation_code_hash stored as SHA256 hex");
        assert(userRow.activation_code_hash !== initialActivationCode, "Raw activation code is NOT stored in plain text");
        assert(new Date(userRow.activation_expires_at) > new Date(), "activation_expires_at is in the future");

        console.log("\n--- STEP 4: Attempt Login Before Activation (Should Fail) ---");
        const pendingLoginRes = await request("POST", "/auth/login", {
            email: testEmail,
            password: "AnyPassword123!"
        });
        assert(pendingLoginRes.status === 403, `Login rejected with 403 Forbidden: ${pendingLoginRes.data?.message}`);
        assert(pendingLoginRes.data?.message?.includes("pending activation"), "Message clarifies account is pending activation");

        console.log("\n--- STEP 5: Security - Non-Admin Reissue Check ---");
        const unauthReissue = await request("POST", `/customers/${createdCustomerId}/reissue-activation`, {});
        assert(unauthReissue.status === 401, "Unauthenticated request rejected with 401");

        const repReissue = await request(
            "POST",
            `/customers/${createdCustomerId}/reissue-activation`,
            {},
            { Authorization: `Bearer ${salesRepToken}` }
        );
        assert(repReissue.status === 403, "Non-admin reissue rejected with 403 Forbidden");

        console.log("\n--- STEP 6: Admin Reissues Activation Code ---");
        const reissueRes = await request(
            "POST",
            `/customers/${createdCustomerId}/reissue-activation`,
            {},
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(reissueRes.status === 200, "Reissue endpoint returned 200 OK");
        reissuedActivationCode = reissueRes.data.data.activationCode;
        assert(reissuedActivationCode && reissuedActivationCode !== initialActivationCode, `New code generated: ${reissuedActivationCode}`);

        console.log("\n--- STEP 7: Attempt Activation with Superseded (Old) Code ---");
        const oldCodeRes = await request("POST", "/auth/activate-customer", {
            email: testEmail,
            activationCode: initialActivationCode,
            password: testPassword,
            confirmPassword: testPassword
        });
        assert(oldCodeRes.status === 400, `Old code rejected with 400: ${oldCodeRes.data?.message}`);

        console.log("\n--- STEP 8: Activation Endpoint Input Validations ---");
        const mismatchRes = await request("POST", "/auth/activate-customer", {
            email: testEmail,
            activationCode: reissuedActivationCode,
            password: testPassword,
            confirmPassword: "DifferentPassword123!"
        });
        assert(mismatchRes.status === 400, "Mismatched passwords rejected with 400");

        const shortPassRes = await request("POST", "/auth/activate-customer", {
            email: testEmail,
            activationCode: reissuedActivationCode,
            password: "123",
            confirmPassword: "123"
        });
        assert(shortPassRes.status === 400, "Short password rejected with 400");

        const wrongEmailRes = await request("POST", "/auth/activate-customer", {
            email: "wrong.email@domain.com",
            activationCode: reissuedActivationCode,
            password: testPassword,
            confirmPassword: testPassword
        });
        assert(wrongEmailRes.status === 400, "Wrong email rejected with 400");

        console.log("\n--- STEP 9: Customer Activates Account ---");
        const activateRes = await request("POST", "/auth/activate-customer", {
            email: testEmail,
            activationCode: reissuedActivationCode,
            password: testPassword,
            confirmPassword: testPassword
        });
        assert(activateRes.status === 200, "Customer activation returned 200 OK");
        assert(activateRes.data.success === true, "Activation response success is true");

        console.log("\n--- STEP 10: Database Verification (Post-Activation) ---");
        const userActiveRes = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = $1",
            [testEmail.toLowerCase()]
        );
        const activeUser = userActiveRes.rows[0];
        assert(activeUser.status === "active", "User status transitioned to 'active'");
        assert(activeUser.is_active === true, "User is_active is now TRUE");
        assert(activeUser.registration_status === "APPROVED", "registration_status is 'APPROVED'");
        assert(activeUser.password_hash && activeUser.password_hash.startsWith("$2b$"), "password_hash populated with bcrypt hash");
        assert(activeUser.activation_code_hash === null, "activation_code_hash cleared/invalidated");
        assert(activeUser.activation_expires_at === null, "activation_expires_at cleared");
        assert(activeUser.activated_at !== null, "activated_at timestamp recorded");

        console.log("\n--- STEP 11: Security - Double Activation Rejected ---");
        const doubleActRes = await request("POST", "/auth/activate-customer", {
            email: testEmail,
            activationCode: reissuedActivationCode,
            password: testPassword,
            confirmPassword: testPassword
        });
        assert(doubleActRes.status === 400, `Second activation rejected with 400: ${doubleActRes.data?.message}`);

        console.log("\n--- STEP 12: Customer Standard Login Flow ---");
        const custLoginRes = await request("POST", "/auth/login", {
            email: testEmail,
            password: testPassword
        });
        assert(custLoginRes.status === 200, "Customer login returned 200 OK");
        customerUserToken = custLoginRes.data.data.token;
        assert(customerUserToken, "Customer received JWT token");
        assert(custLoginRes.data.data.user.role === "customer", "Authenticated user role is 'customer'");
        assert(custLoginRes.data.data.user.customerId === createdCustomerId, "Authenticated user customerId matches created customer");

        const decoded = jwt.decode(customerUserToken);
        assert(decoded.userId === activeUser.id, "JWT contains correct userId");
        assert(decoded.role === "customer", "JWT contains role 'customer'");
        assert(decoded.customerId === createdCustomerId, "JWT contains correct customerId claim");

        console.log("\n--- STEP 13: Customer Portal Data Isolation ---");
        const custQuotesRes = await request("GET", "/customer/quotes", null, {
            Authorization: `Bearer ${customerUserToken}`
        });
        assert(custQuotesRes.status === 200, "Customer quotes endpoint returned 200 OK");
        assert(Array.isArray(custQuotesRes.data.data), "Quotes list returned as array");
        assert(custQuotesRes.data.data.length === 0, "New customer sees exactly 0 quotes (no data leakage from other customers)");

        const quoteAccessRes = await request("GET", "/customer/quotes/1", null, {
            Authorization: `Bearer ${customerUserToken}`
        });
        assert(
            quoteAccessRes.status === 403 || quoteAccessRes.status === 404,
            `Access to other customer's quote correctly denied with status ${quoteAccessRes.status}`
        );

        console.log("\n--- STEP 14: Customer RBAC Role Boundaries ---");
        const restrictedEndpoints = [
            { method: "GET", path: "/admin/user-registrations", name: "Admin User Registrations" },
            { method: "GET", path: "/admin/warehouses", name: "Admin Warehouses" },
            { method: "POST", path: "/customers", name: "Create Customer" },
            { method: "GET", path: "/deal-health", name: "Deal Health" },
            { method: "GET", path: "/approvals", name: "Approvals list" }
        ];

        for (const ep of restrictedEndpoints) {
            const rRes = await request(ep.method, ep.path, null, {
                Authorization: `Bearer ${customerUserToken}`
            });
            assert(
                rRes.status === 401 || rRes.status === 403,
                `Access to ${ep.name} denied with ${rRes.status}`
            );
        }

        console.log("\n--- STEP 15: Existing Role Authentication Regressions ---");
        const rolesToVerify = [
            { email: "admin@dealflow360.com", password: "password123", expectedRole: "admin" },
            { email: "salesrep1@dealflow360.com", password: "password123", expectedRole: "sales_rep" },
            { email: "manager@dealflow360.com", password: "password123", expectedRole: "sales_manager" },
            { email: "finance@dealflow360.com", password: "password123", expectedRole: "finance" }
        ];

        for (const account of rolesToVerify) {
            const loginRes = await request("POST", "/auth/login", {
                email: account.email,
                password: account.password
            });
            assert(loginRes.status === 200, `Login succeeded for ${account.email}`);
            assert(loginRes.data.data.user.role === account.expectedRole, `Role verified as ${account.expectedRole}`);
        }

        console.log("\n--- STEP 16: Admin Customer List Portal Status Verification ---");
        const listRes = await request("GET", "/customers", null, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(listRes.status === 200, "Customer list returned 200");
        const retrievedCustomer = listRes.data.data.find(c => c.id === createdCustomerId);
        assert(retrievedCustomer, "Created customer is present in Admin customer list");
        assert(retrievedCustomer.portal_status === "active", "Retrieved customer portal_status is 'active'");

        console.log("\n==================================================");
        console.log("🎉 ALL CUSTOMER ACTIVATION E2E TESTS PASSED (100%)");
        console.log("==================================================");
    } catch (error) {
        console.error("\n💥 TEST SUITE EXECUTION FAILED:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
