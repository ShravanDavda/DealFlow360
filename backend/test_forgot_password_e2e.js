import assert from "assert";
import crypto from "crypto";
import http from "http";
import app from "./src/app.js";
import pool from "./src/config/db.js";
import ensureAdminConfigurationSchema from "./src/config/ensureAdminConfigurationSchema.js";
import bcrypt from "bcrypt";

let server;
let baseUrl;

const startServer = () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
};

const post = async (path, body, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

async function runForgotPasswordSuite() {
  console.log("==================================================");
  console.log("FORGOT PASSWORD & RECOVERY WORKFLOW E2E TEST SUITE");
  console.log("==================================================");

  await ensureAdminConfigurationSchema();
  await startServer();

  // Mock global fetch for Brevo email service to capture OTP safely during automated tests
  const originalFetch = global.fetch;
  let lastCapturedEmail = null;
  let lastCapturedOtp = null;

  global.fetch = async (url, options) => {
    if (String(url).includes("brevo.com")) {
      const payload = JSON.parse(options.body);
      lastCapturedEmail = payload.to[0].email;
      const match = payload.htmlContent.match(/<h1>(\d{6})<\/h1>/);
      if (match) {
        lastCapturedOtp = match[1];
      }
      return { ok: true, status: 200, json: async () => ({ messageId: "mock-brevo-id" }) };
    }
    return originalFetch(url, options);
  };

  try {
    const testEmail = `forgot_test_${Date.now()}@dealflow360.com`;
    const initialPassword = "InitialPassword123!";
    const newPassword = "NewSecurePassword456!";
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    // Create test user in DB
    const userRes = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, requested_role, is_active, registration_status, status)
       VALUES ($1, $2, $3, 'sales_rep', 'sales_rep', TRUE, 'APPROVED', 'active')
       RETURNING id, email`,
      [`user_${Date.now()}`, testEmail, passwordHash]
    );
    const user = userRes.rows[0];
    console.log(`Created test user: ${user.email} (id: ${user.id})`);

    // Step 1: User logs in with initial password
    const initialLogin = await post("/auth/login", { email: testEmail, password: initialPassword });
    assert.strictEqual(initialLogin.status, 200, "Initial login should succeed with 200");
    assert.ok(initialLogin.data?.data?.token, "Initial login should return token");
    console.log("✅ Step 1: Existing user logs in with initial password");

    // Step 2: Request password reset OTP
    const forgotRes = await post("/auth/forgot-password", { email: testEmail });
    assert.strictEqual(forgotRes.status, 200, "Forgot password request should return 200");
    assert.ok(forgotRes.data?.success, "Forgot password success flag should be true");
    assert.ok(lastCapturedOtp, "Email service should have generated a 6-digit OTP");
    console.log(`✅ Step 2: Password reset requested; email sent with OTP ${lastCapturedOtp}`);

    // Verify OTP is hashed in PostgreSQL, never plaintext
    const tokenDbRes = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
      [user.id]
    );
    assert.strictEqual(tokenDbRes.rows.length, 1, "Token record must exist in DB");
    const dbRecord = tokenDbRes.rows[0];
    const expectedHash = crypto.createHash("sha256").update(lastCapturedOtp).digest("hex");
    assert.strictEqual(dbRecord.otp_hash, expectedHash, "DB must store sha256 hash of OTP");
    assert.strictEqual(dbRecord.is_otp_verified, false, "OTP must not be marked verified yet");
    assert.strictEqual(dbRecord.is_used, false, "Token must not be used yet");
    console.log("✅ Step 3: Verified token is stored securely as sha256 hash in DB");

    // Step 4: Verify wrong OTP is rejected
    const wrongOtpRes = await post("/auth/verify-reset-otp", { email: testEmail, otp: "000000" });
    assert.strictEqual(wrongOtpRes.status, 400, "Invalid OTP must return 400");
    console.log("✅ Step 4: Invalid OTP rejected with 400");

    // Step 5: Verify valid OTP returns reset token
    const verifyRes = await post("/auth/verify-reset-otp", { email: testEmail, otp: lastCapturedOtp });
    assert.strictEqual(verifyRes.status, 200, "Valid OTP must return 200");
    const resetToken = verifyRes.data?.data?.resetToken;
    assert.ok(resetToken, "Response must include single-use resetToken");
    console.log("✅ Step 5: Valid OTP verified, resetToken issued");

    // Step 6: Verify already-used OTP cannot be verified again
    const reVerifyRes = await post("/auth/verify-reset-otp", { email: testEmail, otp: lastCapturedOtp });
    assert.strictEqual(reVerifyRes.status, 400, "Re-verifying OTP must return 400");
    console.log("✅ Step 6: Single-use OTP cannot be reused");

    // Step 7: Invalid reset token rejected on reset
    const invalidResetRes = await post("/auth/reset-password", {
      resetToken: "invalid-token-123",
      newPassword,
      confirmPassword: newPassword,
    });
    assert.strictEqual(invalidResetRes.status, 400, "Invalid reset token rejected with 400");
    console.log("✅ Step 7: Invalid resetToken rejected on reset attempt");

    // Step 8: Reset password with valid resetToken
    const validResetRes = await post("/auth/reset-password", {
      resetToken,
      newPassword,
      confirmPassword: newPassword,
    });
    assert.strictEqual(validResetRes.status, 200, "Valid reset must return 200");
    assert.ok(validResetRes.data?.success, "Password reset should be successful");
    console.log("✅ Step 8: Password reset completed successfully with valid token");

    // Step 9: Reset token cannot be reused (single-use semantics)
    const reusedResetRes = await post("/auth/reset-password", {
      resetToken,
      newPassword: "AnotherPassword789!",
      confirmPassword: "AnotherPassword789!",
    });
    assert.strictEqual(reusedResetRes.status, 400, "Reused reset token must be rejected with 400");
    console.log("✅ Step 9: Already-used resetToken rejected on subsequent attempt");

    // Step 10: Old password no longer works
    const oldLoginRes = await post("/auth/login", { email: testEmail, password: initialPassword });
    assert.strictEqual(oldLoginRes.status, 401, "Old password must fail with 401");
    console.log("✅ Step 10: Old password is no longer accepted");

    // Step 11: New password works
    const newLoginRes = await post("/auth/login", { email: testEmail, password: newPassword });
    assert.strictEqual(newLoginRes.status, 200, "New password must succeed with 200");
    assert.ok(newLoginRes.data?.data?.token, "New login returns valid JWT token");
    console.log("✅ Step 11: Login with new password succeeded and issued valid JWT");

    // Cleanup
    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
    console.log("==================================================");
    console.log("🎉 ALL FORGOT PASSWORD SUITE TESTS PASSED (11/11)");
    console.log("==================================================");
  } finally {
    global.fetch = originalFetch;
    await stopServer();
    await pool.end();
  }
}

runForgotPasswordSuite().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
