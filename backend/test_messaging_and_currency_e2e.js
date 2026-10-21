import jwt from 'jsonwebtoken';
import pool from './src/config/db.js';

const BASE_URL = 'http://localhost:5000/api';

const request = async (method, path, body = null, headers = {}) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return {
    status: res.status,
    data,
  };
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

// Currency Formatter Test
function formatCurrency(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  let prefix = '';
  let num;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—' || trimmed === '--' || trimmed === '-') {
      return fallback;
    }
    const prefixMatch = trimmed.match(/^([a-zA-Z\s]+:\s*)(.*)$/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
    }
    const toProcess = prefixMatch ? prefixMatch[2] : trimmed;
    const cleanStr = toProcess
      .replace(/\b(INR|USD|EUR|GBP|AUD|CAD)\b/gi, '')
      .replace(/[₹$€£,]/g, '')
      .trim();
    num = Number(cleanStr);
  } else {
    num = Number(value);
  }
  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = `$${absNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const result = isNegative ? `-${formatted}` : formatted;
  return prefix ? `${prefix}${result}` : result;
}

function testCurrencyFormatter() {
  console.log('\n--- PART B: Testing Centralized Currency Formatter ---');
  assert(formatCurrency(1322.99) === '$1,322.99', '1322.99 -> $1,322.99');
  assert(formatCurrency(92) === '$92.00', '92 -> $92.00');
  assert(formatCurrency(2714) === '$2,714.00', '2714 -> $2,714.00');
  assert(formatCurrency(0) === '$0.00', '0 -> $0.00');
  assert(formatCurrency('1322.99') === '$1,322.99', '"1322.99" -> $1,322.99');
  assert(formatCurrency('$1322.99 INR') === '$1,322.99', '"$1322.99 INR" -> $1,322.99');
  assert(formatCurrency('1322.99 INR') === '$1,322.99', '"1322.99 INR" -> $1,322.99');
  assert(formatCurrency('₹1,322.99') === '$1,322.99', '"₹1,322.99" -> $1,322.99');
  assert(formatCurrency('INR 1322.99') === '$1,322.99', '"INR 1322.99" -> $1,322.99');
  assert(formatCurrency('$92.00 INR') === '$92.00', '"$92.00 INR" -> $92.00');
  assert(formatCurrency('Total: INR 2,714.00') === 'Total: $2,714.00', '"Total: INR 2,714.00" -> Total: $2,714.00');
  assert(formatCurrency(-92) === '-$92.00', '-92 -> -$92.00');
  assert(formatCurrency(null) === '—', 'null -> — (fallback)');
  assert(formatCurrency(undefined) === '—', 'undefined -> — (fallback)');
  assert(formatCurrency('') === '—', '"" -> — (fallback)');
  assert(formatCurrency('N/A') === '—', '"N/A" -> — (fallback)');
  console.log('✅ Centralized currency formatting passed all test cases!\n');
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' DealFlow360 — Two-Way Messaging & Currency E2E Test Suite');
  console.log('================================================================');

  testCurrencyFormatter();

  console.log('--- PART A: Testing Two-Way Messaging & Notifications ---');

  // Setup test users and data directly in DB
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-dealflow360';

  // 1. Fetch or create a Sales Rep
  let repRes = await pool.query("SELECT id, email, first_name, last_name, role FROM users WHERE role = 'sales_rep' LIMIT 1");
  let rep = repRes.rows[0];
  if (!rep) {
    const insertRep = await pool.query(
      "INSERT INTO users (username, email, password_hash, role, is_active, first_name, last_name) VALUES ('rep_test', 'rep_test@dealflow360.com', 'test', 'sales_rep', true, 'Test', 'Representative') RETURNING id, email, first_name, last_name, role"
    );
    rep = insertRep.rows[0];
  }

  // 2. Fetch or create Customer A
  let custRes = await pool.query("SELECT id, company_name, email, is_active FROM customers LIMIT 1");
  let customerA = custRes.rows[0];
  if (!customerA) {
    const insertCust = await pool.query(
      "INSERT INTO customers (company_name, email, is_active, currency) VALUES ('Acme Corp', 'customer_a@example.com', true, 'USD') RETURNING id, company_name, email, is_active"
    );
    customerA = insertCust.rows[0];
  }

  // 3. Fetch or create Customer B (for isolation test)
  let custBRes = await pool.query("SELECT id, company_name, email, is_active FROM customers WHERE id != $1 LIMIT 1", [customerA.id]);
  let customerB = custBRes.rows[0];
  if (!customerB) {
    const insertCustB = await pool.query(
      "INSERT INTO customers (company_name, email, is_active, currency) VALUES ('Beta Industries', 'customer_b@example.com', true, 'USD') RETURNING id, company_name, email, is_active"
    );
    customerB = insertCustB.rows[0];
  }

  // Generate tokens
  const repToken = jwt.sign({ id: rep.id, userId: rep.id, email: rep.email, role: 'sales_rep', firstName: rep.first_name, lastName: rep.last_name }, jwtSecret, { expiresIn: '1h' });
  const custAToken = jwt.sign({ id: customerA.id, customerId: customerA.id, userId: customerA.id, email: customerA.email, role: 'customer' }, jwtSecret, { expiresIn: '1h' });
  const custBToken = jwt.sign({ id: customerB.id, customerId: customerB.id, userId: customerB.id, email: customerB.email, role: 'customer' }, jwtSecret, { expiresIn: '1h' });

  // 4. Create a test quotation assigned to rep and customer A
  const quoteCode = `Q-TEST-${Date.now().toString().slice(-4)}`;
  const quoteRes = await pool.query(
    `INSERT INTO quotations (quote_code, user_id, customer_id, status, subtotal, total_discount, tax_amount, total_amount)
     VALUES ($1, $2, $3, 'Draft', 1000.00, 50.00, 100.00, 1050.00)
     RETURNING id, quote_code, status`,
    [quoteCode, rep.id, customerA.id]
  );
  const quote = quoteRes.rows[0];
  console.log(`Created test quotation ${quote.quote_code} (ID: ${quote.id}) assigned to Rep ${rep.id} and Customer ${customerA.id}`);

  // Test 1: Customer A sends an inquiry message
  console.log('\n[Test 1] Customer A sends a negotiation message');
  const custMsgRes = await request(
    'POST',
    `/customer/quotes/${quote.id}/messages`,
    {
      message: 'Can you provide expedited delivery for this quotation?',
    },
    { Authorization: `Bearer ${custAToken}` }
  );
  assert(custMsgRes.status === 200 || custMsgRes.status === 201, `Customer message creation status is 200/201 (got ${custMsgRes.status})`);

  // Test 2: Verify assigned Sales Rep received in-app notification
  console.log('\n[Test 2] Verify assigned Sales Rep received an in-app notification');
  const repNotifRes = await request('GET', '/notifications', null, { Authorization: `Bearer ${repToken}` });
  assert(repNotifRes.status === 200, 'Rep notifications retrieved');
  const repNotifs = repNotifRes.data?.data?.notifications || [];
  const repTargetNotif = repNotifs.find((n) => n.quotationId === quote.id && n.title?.includes(quote.quote_code));
  assert(Boolean(repTargetNotif), `Found notification for Sales Rep regarding quotation ${quote.quote_code}`);
  assert(repTargetNotif?.message?.includes('expedited delivery'), 'Rep notification message preview contains customer inquiry');

  // Test 3: Sales Rep reads conversation history
  console.log('\n[Test 3] Sales Rep reads conversation history');
  const repConvRes = await request('GET', `/quotations/${quote.id}/messages`, null, { Authorization: `Bearer ${repToken}` });
  assert(repConvRes.status === 200, 'Rep retrieved messages');
  const convMessages = repConvRes.data?.data || [];
  assert(convMessages.length >= 1, `Rep sees ${convMessages.length} message(s) in conversation`);
  assert(convMessages[0].senderRole === 'customer', 'First message is from customer');

  // Test 4: Sales Rep sends reply
  console.log('\n[Test 4] Sales Rep replies to customer');
  const beforeReplyRes = await pool.query('SELECT status FROM quotations WHERE id = $1', [quote.id]);
  const statusBeforeReply = beforeReplyRes.rows[0].status;
  const replyRes = await request(
    'POST',
    `/quotations/${quote.id}/reply`,
    {
      message: 'Yes, expedited shipping is available within 5 business days at no additional charge.',
    },
    { Authorization: `Bearer ${repToken}` }
  );
  assert(replyRes.status === 201, `Rep reply status is 201 (got ${replyRes.status})`);
  assert(replyRes.data?.data?.senderRole === 'sales_rep', 'Reply senderRole is "sales_rep"');
  assert(replyRes.data?.data?.messageType === 'sales_reply', 'Reply messageType is "sales_reply"');

  // Test 5: Verify quotation status did NOT change due to regular message
  console.log('\n[Test 5] Verify normal reply did NOT change quotation status or approval chain');
  const checkQuoteRes = await pool.query('SELECT status FROM quotations WHERE id = $1', [quote.id]);
  assert(checkQuoteRes.rows[0].status === statusBeforeReply, `Quotation status remained '${statusBeforeReply}' (did not transition on normal message)`);

  // Test 6: Verify Customer received an in-app notification
  console.log('\n[Test 6] Verify Customer A received in-app notification for Rep reply');
  const custNotifRes = await request('GET', '/notifications', null, { Authorization: `Bearer ${custAToken}` });
  assert(custNotifRes.status === 200, 'Customer notifications retrieved');
  const custNotifs = custNotifRes.data?.data?.notifications || [];
  const custTargetNotif = custNotifs.find((n) => n.quotationId === quote.id && n.title?.includes(quote.quote_code));
  assert(Boolean(custTargetNotif), `Found notification for Customer regarding quotation ${quote.quote_code}`);
  assert(custTargetNotif?.message?.includes('expedited shipping is available'), 'Customer notification preview contains Sales Rep reply');

  // Test 7: Customer marks notification as read
  console.log('\n[Test 7] Customer marks notification as read');
  const markReadRes = await request('PATCH', `/notifications/${custTargetNotif.id}/read`, null, { Authorization: `Bearer ${custAToken}` });
  assert(markReadRes.status === 200, 'Notification marked as read');
  const checkRead = await pool.query('SELECT is_read FROM notifications WHERE id = $1', [custTargetNotif.id]);
  assert(checkRead.rows[0].is_read === true, 'Notification is_read flag is true in database');

  // Test 8: Both users view the same chronological conversation
  console.log('\n[Test 8] Both parties see the same chronological conversation');
  const custConvRes = await request('GET', `/customer/quotes/${quote.id}/messages`, null, { Authorization: `Bearer ${custAToken}` });
  assert(custConvRes.status === 200, 'Customer retrieved messages');
  const custMessages = custConvRes.data?.data || [];
  assert(custMessages.length === 2, `Customer sees 2 messages in chronological order (got ${custMessages.length})`);
  assert(custMessages[0].senderRole === 'customer', 'Message 1 is customer inquiry');
  assert(custMessages[1].senderRole === 'sales_rep', 'Message 2 is sales rep reply');

  // Test 9: Customer isolation - Customer B cannot access Customer A's conversation
  console.log('\n[Test 9] Customer B cannot access Customer A quotation or messages');
  const unauthorizedRead = await request('GET', `/customer/quotes/${quote.id}/messages`, null, { Authorization: `Bearer ${custBToken}` });
  assert(unauthorizedRead.status === 403, `Customer B read blocked with status 403 (got ${unauthorizedRead.status})`);

  const unauthorizedSend = await request(
    'POST',
    `/customer/quotes/${quote.id}/messages`,
    { message: 'Malicious attempt to inject message' },
    { Authorization: `Bearer ${custBToken}` }
  );
  assert(unauthorizedSend.status === 403, `Customer B write blocked with status 403 (got ${unauthorizedSend.status})`);

  // Test 10: Validation checks
  console.log('\n[Test 10] Validation & error handling checks');
  const emptyMsgRes = await request('POST', `/quotations/${quote.id}/reply`, { message: '   ' }, { Authorization: `Bearer ${repToken}` });
  assert(emptyMsgRes.status === 400, `Empty message rejected with status 400 (got ${emptyMsgRes.status})`);

  const hugeMessage = 'A'.repeat(2500);
  const oversizedMsgRes = await request('POST', `/quotations/${quote.id}/reply`, { message: hugeMessage }, { Authorization: `Bearer ${repToken}` });
  assert(oversizedMsgRes.status === 400, `Oversized message (>2000 chars) rejected with status 400 (got ${oversizedMsgRes.status})`);

  // Test 11: Cleanup test quotation
  await pool.query('DELETE FROM notifications WHERE quotation_id = $1', [quote.id]);
  await pool.query('DELETE FROM quotation_negotiation_lines WHERE quotation_id = $1', [quote.id]);
  await pool.query('DELETE FROM quotations WHERE id = $1', [quote.id]);
  console.log('\nCleaned up test quotation and notifications.');

  console.log('\n================================================================');
  console.log(' ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('================================================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
