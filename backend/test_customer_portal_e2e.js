import pool from "./src/config/db.js";

const BASE_URL = "http://localhost:5000/api";

const post = async (endpoint, body, token) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const get = async (endpoint, token) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
};

async function runTests() {
  console.log("==================================================");
  console.log("STARTING CUSTOMER PORTAL E2E VERIFICATION SUITE");
  console.log("==================================================");

  console.log("\n--- Phase 1: Authentication & Customer Identification ---");
  
  const custALogin = await post("/auth/login", {
    email: "john@acme.com",
    password: "password123",
  });
  assert(custALogin.ok && custALogin.data?.data?.token, "Customer A (john@acme.com) logs in successfully");
  const tokenA = custALogin.data?.data?.token;
  const userA = custALogin.data?.data?.user;
  assert(userA?.role === "customer", "Customer A user role is 'customer'");
  assert(userA?.customerId !== undefined && userA?.customerId !== null, `Customer A has associated customerId: ${userA?.customerId}`);

  const custBLogin = await post("/auth/login", {
    email: "sarah@betaind.com",
    password: "password123",
  });
  assert(custBLogin.ok && custBLogin.data?.data?.token, "Customer B (sarah@betaind.com) logs in successfully");
  const tokenB = custBLogin.data?.data?.token;
  const userB = custBLogin.data?.data?.user;
  assert(userB?.role === "customer", "Customer B user role is 'customer'");
  assert(userB?.customerId !== userA?.customerId, `Customer B customerId (${userB?.customerId}) is distinct from Customer A (${userA?.customerId})`);

  const repLogin = await post("/auth/login", {
    email: "salesrep1@dealflow360.com",
    password: "password123",
  });
  assert(repLogin.ok && repLogin.data?.data?.token, "Sales Rep (salesrep1@dealflow360.com) logs in successfully");
  const repToken = repLogin.data?.data?.token;

  const mgrLogin = await post("/auth/login", {
    email: "manager@dealflow360.com",
    password: "password123",
  });
  assert(mgrLogin.ok && mgrLogin.data?.data?.token, "Sales Manager (manager@dealflow360.com) logs in successfully");
  const mgrToken = mgrLogin.data?.data?.token;

  console.log("\n--- Phase 2: Security & Multi-Tenant Data Isolation ---");
  
  const adminAttempt = await get("/admin/warehouses", tokenA);
  assert(adminAttempt.status === 403, "Customer A denied access to Admin endpoint /api/admin/warehouses (403)");

  const approvalAttempt = await get("/approvals", tokenA);
  assert(approvalAttempt.status === 403, "Customer A denied access to Sales Manager Approvals /api/approvals (403)");

  const quotesARes = await get("/customer/quotes", tokenA);
  assert(quotesARes.ok && Array.isArray(quotesARes.data?.data), "Customer A retrieves own quotations list");
  const quotesA = quotesARes.data?.data || [];
  const allBelongToA = quotesA.every((q) => Number(q.customerId) === Number(userA.customerId));
  assert(allBelongToA, `All quotations (${quotesA.length}) returned to Customer A belong strictly to Customer A (customerId: ${userA.customerId})`);

  const quotesBRes = await get("/customer/quotes", tokenB);
  assert(quotesBRes.ok && Array.isArray(quotesBRes.data?.data), "Customer B retrieves own quotations list");
  let quotesB = quotesBRes.data?.data || [];
  const allBelongToB = quotesB.every((q) => Number(q.customerId) === Number(userB.customerId));
  assert(allBelongToB, `All quotations (${quotesB.length}) returned to Customer B belong strictly to Customer B (customerId: ${userB.customerId})`);

  let quoteBCode;
  if (quotesB.length === 0) {
    const pRes = await pool.query("SELECT id FROM products WHERE is_active = TRUE ORDER BY id LIMIT 1");
    const plRes = await pool.query("SELECT id FROM price_lists WHERE is_active = TRUE LIMIT 1");
    const qBCreate = await post("/quotations", {
      customerId: userB.customerId,
      priceListId: plRes.rows[0]?.id || 1,
      items: [{ productId: pRes.rows[0]?.id, quantity: 1, discountPercent: 0 }],
    }, repToken);
    quoteBCode = qBCreate.data?.data?.quoteCode || qBCreate.data?.data?.id;
  } else {
    quoteBCode = quotesB[0].quoteCode || quotesB[0].quotationNumber;
  }

  console.log(`  [INFO] Testing cross-tenant probe against Customer B quote: ${quoteBCode}`);
  const crossGet = await get(`/customer/quotes/${quoteBCode}`, tokenA);
  assert(crossGet.status === 403, `Customer A denied viewing Customer B quote ${quoteBCode} (status: ${crossGet.status})`);

  const crossNeg = await post(`/customer/quotes/${quoteBCode}/negotiation`, { counterDiscount: 12 }, tokenA);
  assert(crossNeg.status === 403, `Customer A denied submitting counter-offer on Customer B quote (status: ${crossNeg.status})`);

  const crossConfirm = await post(`/customer/quotes/${quoteBCode}/confirm`, {}, tokenA);
  assert(crossConfirm.status === 403, `Customer A denied confirming Customer B quote (status: ${crossConfirm.status})`);

  const unknownGet = await get(`/customer/quotes/Q-NONEXISTENT-999`, tokenA);
  assert(unknownGet.status === 404, `Unknown quote probe cleanly returns 404 (status: ${unknownGet.status})`);

  console.log("\n--- Phase 3: Sales Rep creates fresh quotation for Customer A ---");
  
  const pliRes = await pool.query(
    `SELECT pli.price_list_id, pli.product_id, p.name, pli.unit_price 
     FROM price_list_items pli 
     JOIN products p ON pli.product_id = p.id 
     WHERE pli.is_active = TRUE AND pli.unit_price > 0 
     LIMIT 1`
  );
  const validPli = pliRes.rows[0];
  const priceListId = validPli.price_list_id;
  const productId = validPli.product_id;
  console.log(`  [INFO] Using Product: ${validPli.name} (id: ${productId}) with Price List: ${priceListId}`);

  const createQuotePayload = {
    customerId: userA.customerId,
    priceListId: priceListId,
    items: [
      {
        productId: productId,
        quantity: 5,
        discountPercent: 5,
      },
    ],
  };

  const createQuoteRes = await post("/quotations", createQuotePayload, repToken);
  const createdQuote = createQuoteRes.data?.data;
  const testQuoteCode = createdQuote?.quoteCode || createdQuote?.id;
  const testQuoteDbId = createdQuote?.dbId || createdQuote?.id;
  assert(createQuoteRes.ok && testQuoteCode, `Sales Rep creates quotation ${testQuoteCode}`);

  console.log("\n--- Phase 4: Customer reviews quotation & Customer-facing privacy ---");
  const custViewRes = await get(`/customer/quotes/${testQuoteCode}`, tokenA);
  assert(custViewRes.ok && custViewRes.data?.data, "Customer A opens and views quotation details");
  const quoteDetails = custViewRes.data?.data;

  assert(quoteDetails.quoteId === testQuoteCode, `Quotation number matches (${quoteDetails.quoteId})`);
  assert(quoteDetails.lineItems && quoteDetails.lineItems.length > 0, "Quotation returns product line items");
  assert(quoteDetails.lineItems[0].productName !== undefined, `Line item includes product name: '${quoteDetails.lineItems[0].productName}'`);
  assert(quoteDetails.lineItems[0].unitPrice !== undefined, `Line item includes unit price: $${quoteDetails.lineItems[0].unitPrice}`);
  assert(quoteDetails.lineItems[0].lineTotal !== undefined, `Line item includes line total: $${quoteDetails.lineItems[0].lineTotal}`);

  assert(quoteDetails.overallMargin === undefined && quoteDetails.margin === undefined, "Strict privacy: internal margin is NOT exposed to customer");
  assert(quoteDetails.blendedRiskScore === undefined && quoteDetails.blendedRisk === undefined, "Strict privacy: internal blended risk score is NOT exposed to customer");
  assert(quoteDetails.baseCost === undefined, "Strict privacy: internal base cost is NOT exposed to customer");
  assert(quoteDetails.lineItems[0].baseCost === undefined, "Strict privacy: line item base cost is NOT exposed to customer");
  assert(quoteDetails.approvalChain === undefined, "Strict privacy: approval chain internals NOT exposed to customer");

  console.log("\n--- Phase 5: Confirmation State Validation ---");
  const earlyConfirm = await post(`/customer/quotes/${testQuoteCode}/confirm`, {}, tokenA);
  assert(earlyConfirm.status === 400, `Cannot confirm unapproved quotation in status '${quoteDetails.status}' (400 Bad Request)`);

  console.log("\n--- Phase 6: Customer submits Question / Change Request ---");
  const commentRes = await post(`/customer/quotes/${testQuoteCode}/negotiation`, {
    customerComment: "Could we confirm if expedited shipping is included in this commercial proposal?",
  }, tokenA);
  assert(commentRes.ok, "Customer submits change request / inquiry comment");

  const negLines1 = await pool.query(
    "SELECT * FROM quotation_negotiation_lines WHERE quotation_id = $1 ORDER BY id DESC LIMIT 1",
    [testQuoteDbId]
  );
  assert(negLines1.rows.length > 0 && negLines1.rows[0].customer_comment.includes("expedited shipping"), "Negotiation comment persisted in quotation_negotiation_lines");

  const historyRes = await get(`/customer/quotes/${testQuoteCode}/history`, tokenA);
  assert(historyRes.ok && (historyRes.data?.data?.negotiationLines || Array.isArray(historyRes.data?.data)), "Negotiation history returns persisted inquiry");

  console.log("\n--- Phase 7: Within-Limit Counter-Offer ---");
  const tierRes = await pool.query(
    `SELECT ct.default_discount_ceiling AS ceiling FROM customers c
     LEFT JOIN customer_tiers ct ON c.customer_tier_id = ct.id
     WHERE c.id = $1`,
    [userA.customerId]
  );
  const maxTierDiscount = tierRes.rows[0]?.ceiling ? Number(tierRes.rows[0].ceiling) : 15;
  console.log(`  [INFO] Customer tier ceiling: ${maxTierDiscount}%`);

  const withinLimitDiscount = Math.min(8, Math.floor(maxTierDiscount));
  const withinLimitRes = await post(`/customer/quotes/${testQuoteCode}/negotiation`, {
    counterDiscount: withinLimitDiscount,
    customerComment: `Proposing ${withinLimitDiscount}% discount within standard ceiling`,
  }, tokenA);

  assert(withinLimitRes.ok, `Customer submits within-limit discount proposal of ${withinLimitDiscount}%`);
  assert(withinLimitRes.data?.data?.reEnteredApproval === false, "Within-limit counter does NOT require manager re-approval");
  assert(withinLimitRes.data?.data?.status === "Approved", "Within-limit counter auto-updates status to Approved");

  const quoteDbWithin = await pool.query("SELECT status, total_discount FROM quotations WHERE id = $1", [testQuoteDbId]);
  assert(quoteDbWithin.rows[0].status === "Approved", "Quotation in DB is Approved");

  console.log("\n--- Phase 8: Above-Limit Counter-Offer & Re-approval Cycle Creation ---");
  const aboveLimitDiscount = 25;
  const aboveLimitRes = await post(`/customer/quotes/${testQuoteCode}/negotiation`, {
    counterDiscount: aboveLimitDiscount,
    customerComment: `Requesting executive discount of ${aboveLimitDiscount}% due to bulk purchase intent`,
  }, tokenA);

  assert(aboveLimitRes.ok, `Customer submits above-limit discount proposal of ${aboveLimitDiscount}%`);
  assert(aboveLimitRes.data?.data?.reEnteredApproval === true, "Above-limit counter flags reEnteredApproval = true");
  assert(aboveLimitRes.data?.data?.status === "Pending Approval", "Quotation status updated to 'Pending Approval'");

  const quoteDbAbove = await pool.query("SELECT status FROM quotations WHERE id = $1", [testQuoteDbId]);
  assert(quoteDbAbove.rows[0].status === "Pending Approval", "Quotation status in DB is 'Pending Approval'");

  const approvalReqDb = await pool.query(
    "SELECT * FROM quotation_approval_requests WHERE quotation_id = $1 AND status = 'PENDING'",
    [testQuoteDbId]
  );
  assert(approvalReqDb.rows.length > 0, "Quotation approval request record exists with status PENDING");

  const approvalStepsDb = await pool.query(
    "SELECT * FROM quotation_approval_steps WHERE approval_request_id = $1 ORDER BY step_order ASC",
    [approvalReqDb.rows[0].id]
  );
  assert(approvalStepsDb.rows.length > 0, `Quotation approval steps created (${approvalStepsDb.rows.length} step(s))`);
  assert(approvalStepsDb.rows[0].approver_role.toLowerCase().includes("manager"), `First approval step is for '${approvalStepsDb.rows[0].approver_role}'`);
  assert(approvalStepsDb.rows[0].status === "PENDING", "First approval step status is 'PENDING'");

  console.log("\n--- Phase 9: Sales Manager Review & Approval ---");
  const mgrApprovalsRes = await get("/approvals", mgrToken);
  const approvalsList = mgrApprovalsRes.data?.data?.approvals || (Array.isArray(mgrApprovalsRes.data?.data) ? mgrApprovalsRes.data?.data : []);
  assert(mgrApprovalsRes.ok && Array.isArray(approvalsList), "Sales Manager retrieves approval queue");
  const pendingInQueue = approvalsList.find(
    (a) => a.quotationId === testQuoteCode || a.dbId === testQuoteDbId || a.id === `A-${testQuoteDbId}`
  );
  assert(pendingInQueue !== undefined, `Quotation ${testQuoteCode} is visible in Sales Manager approval queue`);

  const approvalTargetId = pendingInQueue?.id || testQuoteCode;
  const approveRes = await post(`/approvals/${approvalTargetId}/approve`, {
    decision: "APPROVED",
    comment: "Approved negotiated counter-discount of 25% for strategic account expansion",
  }, mgrToken);
  assert(approveRes.ok, `Sales Manager approves quotation ${approvalTargetId}`);

  const remainingSteps = await pool.query(
    "SELECT * FROM quotation_approval_steps WHERE approval_request_id = $1 AND status = 'PENDING'",
    [approvalReqDb.rows[0].id]
  );
  if (remainingSteps.rows.length > 0 && remainingSteps.rows[0].approver_role.toLowerCase().includes("finance")) {
    console.log("  [INFO] Multi-step chain requires Finance approval");
    const finLogin = await post("/auth/login", { email: "finance@dealflow360.com", password: "password123" });
    if (finLogin.ok) {
      const finToken = finLogin.data?.data?.token;
      const finApprove = await post(`/approvals/${approvalTargetId}/approve`, {
        decision: "APPROVED",
        comment: "Finance approves negotiated margin",
      }, finToken);
      assert(finApprove.ok, "Finance approves subsequent step");
    }
  }

  const quoteAfterApproval = await pool.query("SELECT status FROM quotations WHERE id = $1", [testQuoteDbId]);
  assert(quoteAfterApproval.rows[0].status === "Approved", "Quotation is now in 'Approved' status after manager approval");

  console.log("\n--- Phase 10: Customer sees updated approved terms ---");
  const updatedCustomerView = await get(`/customer/quotes/${testQuoteCode}`, tokenA);
  assert(updatedCustomerView.ok, "Customer retrieves updated quotation");
  const updatedTerms = updatedCustomerView.data?.data;
  assert(updatedTerms.status === "Approved", "Customer sees status 'Approved'");
  assert(updatedTerms.isConfirmable === true || updatedTerms.canConfirm === true, "Customer isConfirmable flag is true");
  const firstLineDiscount = updatedTerms.lineItems?.[0]?.discountPercent ?? updatedTerms.products?.[0]?.discount;
  assert(firstLineDiscount === 25, `Customer sees updated approved discount of 25% (received: ${firstLineDiscount}%)`);

  console.log("\n--- Phase 11: Customer Confirms Quotation & Triggers Downstream Fulfillment/Billing ---");
  const confirmRes = await post(`/customer/quotes/${testQuoteCode}/confirm`, {}, tokenA);
  assert(confirmRes.ok, "Customer confirms quotation successfully");

  const confirmedDb = await pool.query("SELECT status FROM quotations WHERE id = $1", [testQuoteDbId]);
  assert(confirmedDb.rows[0].status === "Confirmed", "Quotation status in DB is 'Confirmed'");

  const fulfillmentDb = await pool.query(
    "SELECT id, order_code, status FROM fulfillment_orders WHERE quotation_id = $1",
    [testQuoteDbId]
  );
  assert(fulfillmentDb.rows.length > 0, `Downstream fulfillment order created: ${fulfillmentDb.rows[0]?.order_code}`);

  const invoicesDb = await pool.query(
    "SELECT id, invoice_code, amount, status FROM invoices WHERE quotation_id = $1",
    [testQuoteDbId]
  );
  assert(invoicesDb.rows.length > 0, `Downstream billing invoice generated: ${invoicesDb.rows[0]?.invoice_code}`);

  console.log("\n--- Phase 12: Duplicate Confirmation Prevention ---");
  const duplicateConfirm = await post(`/customer/quotes/${testQuoteCode}/confirm`, {}, tokenA);
  assert(duplicateConfirm.status === 400, "Repeated confirmation cleanly rejected with 400 Bad Request");

  const postConfirmNegotiate = await post(`/customer/quotes/${testQuoteCode}/negotiation`, { counterDiscount: 30 }, tokenA);
  assert(postConfirmNegotiate.status === 400, "Negotiation on already confirmed quotation cleanly rejected with 400 Bad Request");

  console.log("\n--- Phase 13: Audit Trail Verification ---");
  const auditRes = await pool.query(
    "SELECT action, user_name, note FROM quotation_audit_trail WHERE quotation_id = $1 ORDER BY id ASC",
    [testQuoteDbId]
  );
  assert(auditRes.rows.length > 0, `Audit trail records logged (${auditRes.rows.length} event(s))`);
  const actions = auditRes.rows.map((r) => r.action);
  console.log("  [INFO] Audit trail events:", actions.join(" -> "));
  assert(actions.includes("Negotiation Request"), "Audit trail logs 'Negotiation Request' event");
  assert(actions.includes("Confirmed"), "Audit trail logs 'Confirmed' event");

  console.log("\n--- Phase 14: Multiple Negotiation Rounds & Re-Approval Verification ---");
  const qRoundRes = await post("/quotations", {
    customerId: userA.customerId,
    priceListId: priceListId,
    items: [{ productId: productId, quantity: 2, discountPercent: 5 }],
  }, repToken);
  const qRound = qRoundRes.data?.data;
  const qRoundCode = qRound?.quoteCode || qRound?.id;
  const qRoundDbId = qRound?.dbId || qRound?.id;
  assert(qRoundRes.ok && qRoundCode, `Created fresh quotation ${qRoundCode} for multi-round test`);

  const round1Neg = await post(`/customer/quotes/${qRoundCode}/negotiation`, {
    counterDiscount: 18,
    customerComment: "Round 1 counter-offer: 18%",
  }, tokenA);
  assert(round1Neg.ok && round1Neg.data?.data?.reEnteredApproval === true, "Round 1: Counter 18% triggers approval");

  const round1Approve = await post(`/approvals/A-${qRoundDbId}/approve`, {
    decision: "APPROVED",
    comment: "Manager approves Round 1 (18%)",
  }, mgrToken);
  assert(round1Approve.ok, "Round 1: Manager approves 18% discount");

  const qRoundAfterR1 = await pool.query("SELECT status FROM quotations WHERE id = $1", [qRoundDbId]);
  assert(qRoundAfterR1.rows[0].status === "Approved", "Round 1: Quotation status updated to 'Approved'");

  const round2Neg = await post(`/customer/quotes/${qRoundCode}/negotiation`, {
    counterDiscount: 22,
    customerComment: "Round 2 counter-offer: 22% (pushing for deeper discount)",
  }, tokenA);
  assert(round2Neg.ok && round2Neg.data?.data?.reEnteredApproval === true, "Round 2: Counter 22% triggers NEW approval requirement");

  const qRoundAfterR2 = await pool.query("SELECT status FROM quotations WHERE id = $1", [qRoundDbId]);
  assert(qRoundAfterR2.rows[0].status === "Pending Approval", "Round 2: Quotation does NOT reuse old approval; status is 'Pending Approval'");

  const round2Step = await pool.query(
    `SELECT s.* FROM quotation_approval_steps s
     JOIN quotation_approval_requests ar ON s.approval_request_id = ar.id
     WHERE ar.quotation_id = $1 AND ar.status = 'PENDING' AND s.status = 'PENDING'`,
    [qRoundDbId]
  );
  assert(round2Step.rows.length > 0, "Round 2: Active pending approval step exists for new cycle");

  const round2Approve = await post(`/approvals/A-${qRoundDbId}/approve`, {
    decision: "APPROVED",
    comment: "Manager approves Round 2 (22%)",
  }, mgrToken);
  assert(round2Approve.ok, "Round 2: Manager approves 22% discount");

  const qRoundFinal = await pool.query("SELECT status FROM quotations WHERE id = $1", [qRoundDbId]);
  assert(qRoundFinal.rows[0].status === "Approved", "Round 2: Quotation status is now 'Approved'");

  const round2Confirm = await post(`/customer/quotes/${qRoundCode}/confirm`, {}, tokenA);
  assert(round2Confirm.ok, "Round 2: Customer successfully confirms final quotation");

  const multiHistory = await pool.query(
    "SELECT product_name, customer_comment, requested_discount FROM quotation_negotiation_lines WHERE quotation_id = $1 ORDER BY id ASC",
    [qRoundDbId]
  );
  assert(multiHistory.rows.length >= 2, `Multi-round negotiation history preserved (${multiHistory.rows.length} lines)`);
  console.log("  [INFO] Negotiation lines:", multiHistory.rows.map((r) => `${r.requested_discount}%: ${r.customer_comment}`).join(" | "));

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  pool.end();
  process.exit(1);
});
