import pool from "./src/config/db.js";
import app from "./src/app.js";
import ensureAdminConfigurationSchema from "./src/config/ensureAdminConfigurationSchema.js";
import http from "http";

const TEST_CLIENT_ID = "test-client-id-12345.apps.googleusercontent.com";
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
    console.log("==================================================");
    console.log("DEALFLOW360 GOOGLE AUTH & REGRESSION TEST SUITE");
    console.log("==================================================\n");

    await ensureAdminConfigurationSchema();
    await startTestServer();
    await pool.query("UPDATE users SET google_id = NULL WHERE email = 'salesrep2@dealflow360.com'");

    const timestamp = Date.now();
    const testGoogleEmail = `google.user.${timestamp}@dealflow360.io`;
    const testGoogleSub = `sub_google_${timestamp}`;

    let adminToken = "";
    let salesRepToken = "";
    let createdPendingUserId = null;

    try {
        // --- 1. Existing email/password login still works ---
        console.log("\n[TEST 1] Existing email/password login still works");
        const adminLoginRes = await request("POST", "/auth/login", {
            email: "admin@dealflow360.com",
            password: "password123"
        });
        assert(adminLoginRes.status === 200, "Admin login returned 200");
        assert(adminLoginRes.data.success === true, "Admin login success flag is true");
        adminToken = adminLoginRes.data.data.token;
        assert(adminToken && adminLoginRes.data.data.user.role === "admin", "Admin token obtained with role 'admin'");

        const repLoginRes = await request("POST", "/auth/login", {
            email: "salesrep1@dealflow360.com",
            password: "password123"
        });
        assert(repLoginRes.status === 200, "Sales rep login returned 200");
        salesRepToken = repLoginRes.data.data.token;
        assert(salesRepToken && repLoginRes.data.data.user.role === "sales_rep", "Sales rep token obtained with role 'sales_rep'");

        // --- 2. Existing registration still works ---
        console.log("\n[TEST 2] Existing email/password registration creates pending account");
        const regEmail = `test.pw.user.${timestamp}@dealflow360.io`;
        const regUsername = `pwuser_${timestamp.toString().slice(-6)}`;
        const regRes = await request("POST", "/auth/register", {
            username: regUsername,
            email: regEmail,
            password: "Password123!",
            role: "sales_rep"
        });
        assert(regRes.status === 201, "Existing registration returned 201");
        assert(regRes.data.success === true, "Existing registration success flag is true");
        assert(regRes.data.data.is_active === false, "Registered user is inactive (pending approval)");

        // Verify login fails before approval
        const preApprovalLoginRes = await request("POST", "/auth/login", {
            email: regEmail,
            password: "Password123!"
        });
        assert(preApprovalLoginRes.status === 401, "Unapproved user login rejected with 401");

        // --- 3. Valid Google login for an eligible linked account ---
        console.log("\n[TEST 3] Google login links eligible legacy account and logs in");
        const linkedEmail = "salesrep2@dealflow360.com"; // Existing approved sales rep
        const linkedGoogleSub = `sub_salesrep2_${timestamp}`;
        const googleLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: linkedGoogleSub,
                email: linkedEmail,
                name: "Sales Rep 2"
            })
        });
        assert(googleLoginRes.status === 200, "Google login for existing approved account returned 200");
        assert(googleLoginRes.data.success === true, "Google login success flag is true");
        assert(googleLoginRes.data.data.token, "Google login returned DealFlow360 JWT token");
        assert(googleLoginRes.data.data.user.email === linkedEmail, "User email matches linked account");
        assert(googleLoginRes.data.data.user.role === "sales_rep", "Preserved existing role 'sales_rep'");

        // Verify database stored google_id
        const userDb = await pool.query("SELECT google_id FROM users WHERE LOWER(email) = $1", [linkedEmail]);
        assert(userDb.rows[0].google_id === linkedGoogleSub, "Database correctly linked google_id to existing account");

        // Subsequent Google login with matching google_id succeeds
        const repeatGoogleLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: linkedGoogleSub,
                email: linkedEmail,
                name: "Sales Rep 2"
            })
        });
        assert(repeatGoogleLoginRes.status === 200, "Subsequent Google login by google_id returned 200");

        // --- 4. Google registration creates pending account using existing approval rules ---
        console.log("\n[TEST 4] Google registration creates a pending account");
        const googleRegRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: testGoogleSub,
                email: testGoogleEmail,
                name: "Jane Google",
                given_name: "Jane",
                family_name: "Google"
            }),
            requestedRole: "finance"
        });
        assert(googleRegRes.status === 201, "Google registration returned 201 Created");
        assert(googleRegRes.data.success === true, "Google registration success is true");
        assert(googleRegRes.data.isNewUser === true, "isNewUser flag is true");
        assert(!googleRegRes.data.data.token, "No JWT session token issued for pending Google registration");
        assert(googleRegRes.data.data.registrationStatus === "PENDING", "Registration status is 'PENDING'");
        assert(googleRegRes.data.data.isActive === false, "User isActive is FALSE");
        assert(googleRegRes.data.data.requestedRole === "finance", "Requested role recorded as 'finance'");
        assert(googleRegRes.data.data.role === "sales_rep", "Base role set to 'sales_rep' until approved");
        createdPendingUserId = googleRegRes.data.data.id;

        // --- 5. Pending users cannot bypass approval ---
        console.log("\n[TEST 5] Pending Google users cannot bypass approval");
        const pendingGoogleLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: testGoogleSub,
                email: testGoogleEmail
            })
        });
        assert(pendingGoogleLoginRes.status === 403, "Pending Google user login rejected with 403");
        assert(pendingGoogleLoginRes.data.message.includes("approval"), "Message indicates pending administrator approval");

        // Admin approves the registration
        console.log("\n--- Admin Approves Google User Registration ---");
        const approveRes = await request(
            "PATCH",
            `/admin/user-registrations/${createdPendingUserId}/approve`,
            {},
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(approveRes.status === 200, "Admin approval returned 200");
        assert(approveRes.data.data.registrationStatus === "APPROVED", "Status updated to APPROVED");
        assert(approveRes.data.data.role === "finance", "Role updated to approved requested role 'finance'");

        // Approved Google user can now log in
        const approvedGoogleLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: testGoogleSub,
                email: testGoogleEmail
            })
        });
        assert(approvedGoogleLoginRes.status === 200, "Approved Google user login returned 200");
        assert(approvedGoogleLoginRes.data.data.token, "Approved Google user issued JWT token");
        assert(approvedGoogleLoginRes.data.data.user.role === "finance", "Issued token user role is 'finance'");

        // --- 6. Inactive or suspended users cannot bypass account restrictions ---
        console.log("\n[TEST 6] Inactive/suspended accounts rejected");
        await pool.query("UPDATE users SET is_active = FALSE, status = 'suspended' WHERE id = $1", [createdPendingUserId]);
        const suspendedLoginRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: testGoogleSub,
                email: testGoogleEmail
            })
        });
        assert(suspendedLoginRes.status === 403, "Suspended user Google login rejected with 403");
        // Restore active
        await pool.query("UPDATE users SET is_active = TRUE, status = 'active' WHERE id = $1", [createdPendingUserId]);

        // --- 7. Customer activation remains mandatory where required ---
        console.log("\n[TEST 7] Customer accounts pending activation cannot bypass activation");
        const custEmail = `cust.google.${timestamp}@enterprise.io`;
        const custCreateRes = await request(
            "POST",
            "/customers",
            {
                customerCode: `CUST-${timestamp.toString().slice(-6)}`,
                companyName: `Google Test Customer ${timestamp}`,
                contactName: "Customer Lead",
                email: custEmail,
                customerTierId: 1,
                currency: "USD"
            },
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(custCreateRes.status === 201, "Customer created with portal account in pending_activation status");

        const custGoogleRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_cust_${timestamp}`,
                email: custEmail
            })
        });
        assert(custGoogleRes.status === 403, "Pending customer activation rejected with 403");
        assert(custGoogleRes.data.message.includes("activation"), "Message clarifies customer activation is required");

        // --- 8. Invalid, expired and wrong-audience tokens are rejected ---
        console.log("\n[TEST 8] Invalid, expired, and wrong-audience tokens rejected");
        const invalidTokenRes = await request("POST", "/auth/google", {
            idToken: "not-a-valid-token"
        });
        assert(invalidTokenRes.status === 401, "Malformed token rejected with 401");

        const expiredTokenRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: "sub_expired",
                email: "expired@dealflow360.io",
                expired: true
            })
        });
        assert(expiredTokenRes.status === 401, "Expired token rejected with 401");

        const wrongAudTokenRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: "sub_wrong_aud",
                email: "wrongaud@dealflow360.io",
                aud: "wrong-audience.apps.googleusercontent.com"
            })
        });
        assert(wrongAudTokenRes.status === 401, "Wrong audience token rejected with 401");

        // --- 9. Unverified email claims are rejected ---
        console.log("\n[TEST 9] Unverified email claims are rejected");
        const unverifiedEmailRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: "sub_unverified",
                email: "unverified@dealflow360.io",
                email_verified: false
            })
        });
        assert(unverifiedEmailRes.status === 401, "Unverified email claim rejected with 401");

        // --- 10. Prevent Google account takeover on existing accounts ---
        console.log("\n[TEST 10] Prevent Google account takeover on existing account");
        // linkedEmail already linked to linkedGoogleSub. Attempt linking with different Google sub:
        const takeoverRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `different_sub_${timestamp}`,
                email: linkedEmail
            })
        });
        assert(takeoverRes.status === 409, "Account takeover with different Google sub rejected with 409 Conflict");

        // --- 11. Duplicate Google subject IDs cannot create duplicate accounts ---
        console.log("\n[TEST 11] Duplicate Google subject ID matches existing account");
        const userCountBefore = (await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE google_id = $1", [testGoogleSub])).rows[0].count;
        assert(userCountBefore === 1, "Exactly one user exists with testGoogleSub");

        // Call again with same sub but different casing/call
        await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: testGoogleSub,
                email: testGoogleEmail
            })
        });
        const userCountAfter = (await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE google_id = $1", [testGoogleSub])).rows[0].count;
        assert(userCountAfter === 1, "User count remains 1, no duplicate account created");

        // --- 12. Concurrent registrations do not bypass uniqueness constraints ---
        console.log("\n[TEST 12] Concurrent Google registrations handled safely");
        const concurrentEmail = `concurrent.${timestamp}@dealflow360.io`;
        const concurrentSub = `sub_concurrent_${timestamp}`;
        const tokenConcurrent = makeTestGoogleToken({
            sub: concurrentSub,
            email: concurrentEmail
        });

        const [resA, resB] = await Promise.all([
            request("POST", "/auth/google", { idToken: tokenConcurrent }),
            request("POST", "/auth/google", { idToken: tokenConcurrent })
        ]);
        const statuses = [resA.status, resB.status];
        assert(statuses.includes(201), "At least one concurrent registration succeeded with 201");
        assert(
            statuses.every(s => [201, 403, 409].includes(s)),
            `Concurrent requests handled safely without 500 error (statuses: ${statuses.join(", ")})`
        );

        // --- 13. Users cannot grant themselves privileged roles ---
        console.log("\n[TEST 13] Users cannot request privileged roles (admin, customer)");
        const adminEscalateRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_admin_attempt_${timestamp}`,
                email: `hacker1.${timestamp}@dealflow360.io`
            }),
            requestedRole: "admin"
        });
        assert(adminEscalateRes.status === 400, "Requesting 'admin' role rejected with 400 Bad Request");

        const customerEscalateRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_cust_attempt_${timestamp}`,
                email: `hacker2.${timestamp}@dealflow360.io`
            }),
            requestedRole: "customer"
        });
        assert(customerEscalateRes.status === 400, "Requesting 'customer' role rejected with 400 Bad Request");

        const arbitraryRoleRes = await request("POST", "/auth/google", {
            idToken: makeTestGoogleToken({
                sub: `sub_super_attempt_${timestamp}`,
                email: `hacker3.${timestamp}@dealflow360.io`
            }),
            requestedRole: "superadmin"
        });
        assert(arbitraryRoleRes.status === 400, "Requesting arbitrary role rejected with 400 Bad Request");

        // --- 14. Existing JWT middleware and /api/auth/me still work ---
        console.log("\n[TEST 14] Existing JWT middleware and /api/auth/me work with issued token");
        const meRes = await request("GET", "/auth/me", null, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(meRes.status === 200, "GET /api/auth/me with admin token returned 200");
        assert(meRes.data.data.email === "admin@dealflow360.com", "GET /api/auth/me returns current user email");

        const unauthMeRes = await request("GET", "/auth/me");
        assert(unauthMeRes.status === 401, "GET /api/auth/me without token rejected with 401");

        const badTokenMeRes = await request("GET", "/auth/me", null, {
            Authorization: "Bearer invalid_jwt_token_string"
        });
        assert(badTokenMeRes.status === 401, "GET /api/auth/me with invalid JWT rejected with 401");

        // --- 15. Role-based routing / authorization middleware remains intact ---
        console.log("\n[TEST 15] Role-based authorization middleware enforced");
        const repAccessAdminRes = await request("GET", "/admin/user-registrations", null, {
            Authorization: `Bearer ${salesRepToken}`
        });
        assert(repAccessAdminRes.status === 403, "Sales rep accessing admin endpoint rejected with 403 Forbidden");

        const adminAccessAdminRes = await request("GET", "/admin/user-registrations", null, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(adminAccessAdminRes.status === 200, "Admin accessing admin endpoint returned 200 OK");

        console.log("\n==================================================");
        console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (15/15 Integration Checks)");
        console.log("==================================================");
    } finally {
        await pool.query("UPDATE users SET google_id = NULL WHERE email = 'salesrep2@dealflow360.com'").catch(() => {});
        await stopTestServer();
        await pool.end();
    }
}

runTestSuite().catch((err) => {
    console.error("\n💥 TEST SUITE EXECUTION FAILED:", err);
    stopTestServer().finally(() => process.exit(1));
});
