import pool from "./src/config/db.js";
import app from "./src/app.js";
import ensureAdminConfigurationSchema from "./src/config/ensureAdminConfigurationSchema.js";
import http from "http";

const TEST_CLIENT_ID = "test-client-id-role-policy.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
process.env.NODE_ENV = "test";

let server;
let serverPort;
let baseUrl;

const startTestServer = () => {
    return new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, () => {
            serverPort = server.address().port;
            baseUrl = `http://127.0.0.1:${serverPort}/api`;
            console.log(`Test server running on ${baseUrl}`);
            resolve();
        });
    });
};

const stopTestServer = () => {
    return new Promise((resolve) => {
        if (server) {
            server.close(resolve);
        } else {
            resolve();
        }
    });
};

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
    const res = await fetch(`${baseUrl}${path}`, options);
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

const makeTestGoogleToken = (payload) => {
    const fullPayload = {
        aud: TEST_CLIENT_ID,
        email_verified: true,
        ...payload
    };
    return "TEST_GOOGLE_TOKEN_" + Buffer.from(JSON.stringify(fullPayload)).toString("base64");
};

async function runTestSuite() {
    console.log("==================================================================");
    console.log("DEALFLOW360 — GOOGLE OAUTH ROLE SELECTION POLICY VERIFICATION");
    console.log("==================================================================\n");

    await ensureAdminConfigurationSchema();
    await startTestServer();

    const timestamp = Date.now();
    let adminToken = "";

    try {
        // --- 1. Existing email/password login still works ---
        console.log("\n[SCENARIO 8A] Existing email/password login works for Admin & Sales Rep");
        const adminLoginRes = await request("POST", "/auth/login", {
            email: "admin@dealflow360.com",
            password: "password123"
        });
        assert(adminLoginRes.status === 200, "Admin login returned 200 OK");
        adminToken = adminLoginRes.data.data.token;
        assert(adminToken && adminLoginRes.data.data.user.role === "admin", "Admin authenticated with role 'admin'");

        const repLoginRes = await request("POST", "/auth/login", {
            email: "salesrep1@dealflow360.com",
            password: "password123"
        });
        assert(repLoginRes.status === 200, "Sales rep login returned 200 OK");
        assert(repLoginRes.data.data.user.role === "sales_rep", "Sales rep authenticated with role 'sales_rep'");

        // --- 2. Existing Google users sign in without re-registration or profile prompt ---
        console.log("\n[SCENARIO 8B] Existing Google users with complete profiles sign in seamlessly");
        const existingEmail = "salesrep2@dealflow360.com";
        const existingSub = `sub_existing_${timestamp}`;
        // Link google_id
        await pool.query("UPDATE users SET google_id = $1 WHERE email = $2", [existingSub, existingEmail]);

        const existingGoogleLogin = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: existingSub,
                email: existingEmail
            })
        });
        assert(existingGoogleLogin.status === 200, "Existing Google user login returned 200 OK without role/username");
        assert(existingGoogleLogin.data.data.token, "JWT token issued to existing Google user");
        assert(existingGoogleLogin.data.data.user.email === existingEmail, "User email matches existing account");
        assert(existingGoogleLogin.data.data.user.role === "sales_rep", "Existing role preserved");

        // --- 3. Scenario 1 & 2: Registration with Role 1: 'sales_rep' (Sales representative) ---
        console.log("\n[SCENARIO 1 & 2: ROLE 1] Submit 'sales_rep' (Sales representative)");
        const repUsername = `googlerep_${timestamp.toString().slice(-6)}`;
        const repEmail = `googlerep.${timestamp}@dealflow360.io`;
        const repSub = `sub_rep_${timestamp}`;

        const regRepRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: repSub,
                email: repEmail,
                name: "Google Sales Rep"
            }),
            username: repUsername,
            requestedRole: "sales_rep"
        });
        assert(regRepRes.status === 201, "Registration with 'sales_rep' returned 201 Created");
        assert(regRepRes.data.isNewUser === true, "isNewUser flag is true");
        assert(regRepRes.data.data.requestedRole === "sales_rep", "requestedRole is 'sales_rep'");
        assert(regRepRes.data.data.username === repUsername, "username matches submitted value");
        assert(regRepRes.data.data.registrationStatus === "PENDING", "registrationStatus is 'PENDING'");
        assert(regRepRes.data.data.isActive === false, "isActive is FALSE");

        // DB verification
        const repDb = (await pool.query("SELECT role, requested_role, is_active, registration_status FROM users WHERE username = $1", [repUsername])).rows[0];
        assert(repDb.requested_role === "sales_rep", "DB requested_role correctly persisted as 'sales_rep'");
        assert(repDb.role === "sales_rep", "DB base role set to 'sales_rep' pending approval");
        assert(repDb.registration_status === "PENDING", "DB registration_status is PENDING");

        // --- 4. Scenario 1 & 2: Registration with Role 2: 'finance' (Finance/Operator) ---
        console.log("\n[SCENARIO 1 & 2: ROLE 2] Submit 'finance' (Finance/Operator)");
        const finUsername = `googlefin_${timestamp.toString().slice(-6)}`;
        const finEmail = `googlefin.${timestamp}@dealflow360.io`;
        const finSub = `sub_fin_${timestamp}`;

        const regFinRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: finSub,
                email: finEmail,
                name: "Google Finance User"
            }),
            username: finUsername,
            role: "finance" // tests using 'role' parameter as well
        });
        assert(regFinRes.status === 201, "Registration with 'finance' returned 201 Created");
        assert(regFinRes.data.isNewUser === true, "isNewUser flag is true");
        assert(regFinRes.data.data.requestedRole === "finance", "requestedRole is 'finance'");
        assert(regFinRes.data.data.username === finUsername, "username matches submitted value");
        assert(regFinRes.data.data.registrationStatus === "PENDING", "registrationStatus is 'PENDING'");

        // DB verification: Never silently override to sales_rep!
        const finDb = (await pool.query("SELECT role, requested_role, is_active, registration_status FROM users WHERE username = $1", [finUsername])).rows[0];
        assert(finDb.requested_role === "finance", "DB requested_role correctly persisted as 'finance' (NOT overridden to sales_rep)");

        // --- 5. Scenario 1 & 2: Registration with Role 3: 'sales_manager' (SalesManager) ---
        console.log("\n[SCENARIO 1 & 2: ROLE 3] Submit 'sales_manager' (SalesManager)");
        const mgrUsername = `googlemgr_${timestamp.toString().slice(-6)}`;
        const mgrEmail = `googlemgr.${timestamp}@dealflow360.io`;
        const mgrSub = `sub_mgr_${timestamp}`;

        const regMgrRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: mgrSub,
                email: mgrEmail,
                name: "Google Sales Manager"
            }),
            username: mgrUsername,
            requestedRole: "sales_manager"
        });
        assert(regMgrRes.status === 201, "Registration with 'sales_manager' returned 201 Created");
        assert(regMgrRes.data.isNewUser === true, "isNewUser flag is true");
        assert(regMgrRes.data.data.requestedRole === "sales_manager", "requestedRole is 'sales_manager'");
        assert(regMgrRes.data.data.username === mgrUsername, "username matches submitted value");

        // DB verification: Never silently override to sales_rep!
        const mgrDb = (await pool.query("SELECT id, role, requested_role, is_active, registration_status FROM users WHERE username = $1", [mgrUsername])).rows[0];
        assert(mgrDb.requested_role === "sales_manager", "DB requested_role correctly persisted as 'sales_manager' (NOT overridden to sales_rep)");
        const mgrUserId = mgrDb.id;

        // --- 6. Scenario 3: Customer registration through Google is rejected by the backend ---
        console.log("\n[SCENARIO 3] Customer registration through Google is rejected");
        const custRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_cust_attempt_${timestamp}`,
                email: `hacker_cust.${timestamp}@dealflow360.io`
            }),
            username: `hackcust_${timestamp.toString().slice(-6)}`,
            requestedRole: "customer"
        });
        assert(custRes.status === 400, "Requesting 'customer' role rejected with 400 Bad Request");
        assert(custRes.data.success === false, "Success is false");
        assert(custRes.data.message.includes("Permitted roles"), "Error message cites permitted roles");

        // --- 7. Scenario 4: Admin registration through Google is rejected by the backend ---
        console.log("\n[SCENARIO 4] Admin registration through Google is rejected");
        const adminAttemptRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_admin_attempt_${timestamp}`,
                email: `hacker_admin.${timestamp}@dealflow360.io`
            }),
            username: `hackadmin_${timestamp.toString().slice(-6)}`,
            requestedRole: "admin"
        });
        assert(adminAttemptRes.status === 400, "Requesting 'admin' role rejected with 400 Bad Request");
        assert(adminAttemptRes.data.success === false, "Success is false");

        // --- 8. Scenario 5: Arbitrary or tampered role values are rejected ---
        console.log("\n[SCENARIO 5] Arbitrary and tampered role values are rejected");
        // Test operations role (not one of the 3 permitted options for Google registration)
        const opsAttemptRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_ops_attempt_${timestamp}`,
                email: `hacker_ops.${timestamp}@dealflow360.io`
            }),
            username: `hackops_${timestamp.toString().slice(-6)}`,
            requestedRole: "operations"
        });
        assert(opsAttemptRes.status === 400, "Requesting 'operations' role rejected with 400 Bad Request");

        // Test random role
        const randAttemptRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_rand_attempt_${timestamp}`,
                email: `hacker_rand.${timestamp}@dealflow360.io`
            }),
            username: `hackrand_${timestamp.toString().slice(-6)}`,
            requestedRole: "superadmin"
        });
        assert(randAttemptRes.status === 400, "Requesting arbitrary role rejected with 400 Bad Request");

        // --- 9. Scenario 6: Missing usernames and duplicate usernames handled correctly ---
        console.log("\n[SCENARIO 6] Missing, invalid, and duplicate usernames are handled");
        // Missing username
        const missingUserRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_noun_attempt_${timestamp}`,
                email: `noun.${timestamp}@dealflow360.io`
            }),
            requestedRole: "finance"
        });
        assert(missingUserRes.status === 400, "Missing username rejected with 400 Bad Request");
        assert(missingUserRes.data.message.includes("Username is required"), "Error message notes username is required");
        assert(missingUserRes.data.needsProfileCompletion === true, "needsProfileCompletion is true");

        // Short username (< 3 chars)
        const shortUserRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_short_attempt_${timestamp}`,
                email: `short.${timestamp}@dealflow360.io`
            }),
            username: "ab",
            requestedRole: "finance"
        });
        assert(shortUserRes.status === 400, "Short username rejected with 400 Bad Request");

        // Duplicate username (reuse finUsername)
        const dupUserRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_dup_attempt_${timestamp}`,
                email: `anotheremail.${timestamp}@dealflow360.io`
            }),
            username: finUsername,
            requestedRole: "sales_rep"
        });
        assert(dupUserRes.status === 400, "Duplicate username rejected with 400 Bad Request");
        assert(dupUserRes.data.message.includes("Username is already taken"), "Error message notes username is already taken");

        // --- 10. Scenario 7: Staff approval requirements remain enforced ---
        console.log("\n[SCENARIO 7] Staff approval requirements enforced");
        // Unapproved manager attempts login
        const unapprovedLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: mgrSub,
                email: mgrEmail
            })
        });
        assert(unapprovedLoginRes.status === 403, "Unapproved Google user rejected with 403 Forbidden");
        assert(unapprovedLoginRes.data.message.includes("approval"), "Error clarifies account registration is awaiting approval");

        // Admin approves the registration
        console.log("\n--- Admin Approves Registration for Sales Manager ---");
        const approveRes = await request(
            "PATCH",
            `/admin/user-registrations/${mgrUserId}/approve`,
            {},
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(approveRes.status === 200, "Admin approval returned 200 OK");
        assert(approveRes.data.data.registrationStatus === "APPROVED", "Status updated to APPROVED");
        assert(approveRes.data.data.role === "sales_manager", "Role promoted to requested_role 'sales_manager'");

        // Approved Google user can now sign in
        const approvedLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: mgrSub,
                email: mgrEmail
            })
        });
        assert(approvedLoginRes.status === 200, "Approved user Google login returned 200 OK");
        assert(approvedLoginRes.data.data.token, "Approved user issued JWT token");
        assert(approvedLoginRes.data.data.user.role === "sales_manager", "Issued token user role is 'sales_manager'");

        console.log("\n==================================================================");
        console.log("🎉 ALL 8 VALIDATION SCENARIOS VERIFIED SUCCESSFULLY (100% PASS)");
        console.log("==================================================================");
    } finally {
        await pool.query("DELETE FROM users WHERE username LIKE 'googlerep_%' OR username LIKE 'googlefin_%' OR username LIKE 'googlemgr_%'").catch(() => {});
        await pool.query("UPDATE users SET google_id = NULL WHERE email = 'salesrep2@dealflow360.com'").catch(() => {});
        await stopTestServer();
        await pool.end();
    }
}

runTestSuite().catch((err) => {
    console.error("\n💥 TEST SUITE FAILED:", err);
    stopTestServer().finally(() => process.exit(1));
});
