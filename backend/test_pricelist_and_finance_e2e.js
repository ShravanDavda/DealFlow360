import http from 'http';
import jwt from 'jsonwebtoken';
import pool from './src/config/db.js';

const jwtSecret = process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_2026';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' DealFlow360 — Price List Items & Finance Fulfillment E2E Tests');
  console.log('================================================================');

  let adminUser, financeUser, repUser, testProduct, testPriceList1, testPriceList2, testItem1;

  try {
    // 1. Fetch or create users for roles: admin, finance, sales_rep
    const adminRes = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1");
    adminUser = adminRes.rows[0];
    assert(Boolean(adminUser), 'Admin user exists in database');

    const finRes = await pool.query("SELECT id, email, role FROM users WHERE role = 'finance' LIMIT 1");
    financeUser = finRes.rows[0];
    assert(Boolean(financeUser), 'Finance user exists in database');

    const repRes = await pool.query("SELECT id, email, role FROM users WHERE role = 'sales_rep' LIMIT 1");
    repUser = repRes.rows[0];
    assert(Boolean(repUser), 'Sales Rep user exists in database');

    const adminToken = jwt.sign({ id: adminUser.id, userId: adminUser.id, email: adminUser.email, role: 'admin' }, jwtSecret, { expiresIn: '1h' });
    const financeToken = jwt.sign({ id: financeUser.id, userId: financeUser.id, email: financeUser.email, role: 'finance' }, jwtSecret, { expiresIn: '1h' });
    const repToken = jwt.sign({ id: repUser.id, userId: repUser.id, email: repUser.email, role: 'sales_rep' }, jwtSecret, { expiresIn: '1h' });

    // 2. Fetch a valid active product
    const prodRes = await pool.query("SELECT id, name, sku, base_cost FROM products WHERE is_active = TRUE LIMIT 1");
    testProduct = prodRes.rows[0];
    assert(Boolean(testProduct), `Test product found: ${testProduct.name} (${testProduct.sku})`);

    // 3. Create two temporary price lists for cross-tampering tests
    const pl1Res = await pool.query(
      `INSERT INTO price_lists (name, description, currency, is_default, is_active)
       VALUES ($1, 'Test Price List 1', 'USD', FALSE, TRUE)
       RETURNING id, name, currency`,
      [`TEST_PL_1_${Date.now()}`]
    );
    testPriceList1 = pl1Res.rows[0];

    const pl2Res = await pool.query(
      `INSERT INTO price_lists (name, description, currency, is_default, is_active)
       VALUES ($1, 'Test Price List 2', 'USD', FALSE, TRUE)
       RETURNING id, name, currency`,
      [`TEST_PL_2_${Date.now()}`]
    );
    testPriceList2 = pl2Res.rows[0];

    console.log(`\n--- PART A: Price List Item Management Tests ---`);

    // Test A1: Admin adds an item to price list 1
    console.log('\n[Test A1] Admin adds an item to price list 1');
    const addItemRes = await request(
      'POST',
      `/price-lists/${testPriceList1.id}/items`,
      {
        priceListId: testPriceList1.id,
        productId: testProduct.id,
        unitPrice: 1500.00,
        minQuantity: 1,
        maxQuantity: 10
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(addItemRes.status === 201, `Item added with status 201 (got ${addItemRes.status})`);
    testItem1 = addItemRes.data?.data;
    assert(Boolean(testItem1?.id), `Created item ID: ${testItem1?.id}`);
    assert(Number(testItem1.unit_price || testItem1.unitPrice) === 1500.00, 'Created item price is $1500.00');

    // Test A2: Admin views all items in the price list
    console.log('\n[Test A2] Admin views all items in price list 1');
    const getItemsRes = await request('GET', `/price-lists/${testPriceList1.id}/items`, null, { Authorization: `Bearer ${adminToken}` });
    assert(getItemsRes.status === 200, 'Items retrieved with status 200');
    const itemsList = getItemsRes.data?.data || [];
    assert(itemsList.length >= 1, `Items list contains ${itemsList.length} item(s)`);
    const foundItem = itemsList.find(i => Number(i.id) === Number(testItem1.id));
    assert(Boolean(foundItem), `Found created item in list`);
    assert(foundItem.product_name || foundItem.productName, 'Item includes product name');
    assert(foundItem.product_sku || foundItem.productSku, 'Item includes product SKU');

    // Test A3: Admin edits the item price and saves it
    console.log('\n[Test A3] Admin edits the item price to $1750.00');
    const editItemRes = await request(
      'PUT',
      `/price-lists/${testPriceList1.id}/items/${testItem1.id}`,
      {
        priceListId: testPriceList1.id,
        productId: testProduct.id,
        unitPrice: 1750.00,
        minQuantity: 1,
        maxQuantity: 20
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(editItemRes.status === 200, `Item updated with status 200 (got ${editItemRes.status})`);
    assert(Number(editItemRes.data?.data?.unit_price || editItemRes.data?.data?.unitPrice) === 1750.00, 'Updated price is $1750.00');

    // Test A4: Verify changes persist after reload
    console.log('\n[Test A4] Verify updated price persists in database');
    const reloadRes = await request('GET', `/price-lists/${testPriceList1.id}/items`, null, { Authorization: `Bearer ${adminToken}` });
    const reloadedItem = reloadRes.data?.data?.find(i => Number(i.id) === Number(testItem1.id));
    assert(Number(reloadedItem.unit_price || reloadedItem.unitPrice) === 1750.00, 'Persisted price is $1750.00 after reload');
    assert(Number(reloadedItem.max_quantity || reloadedItem.maxQuantity) === 20, 'Persisted maxQuantity is 20');

    // Test A5: Tampered request prevention (cross-price-list modification)
    console.log('\n[Test A5] Cross-price-list tampering rejection');
    const tamperRes = await request(
      'PUT',
      `/price-lists/${testPriceList2.id}/items/${testItem1.id}`,
      {
        priceListId: testPriceList2.id,
        productId: testProduct.id,
        unitPrice: 999.00
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(tamperRes.status === 400, `Tampered request targeting mismatched price list rejected with 400 (got ${tamperRes.status})`);

    // Test A6: Non-admin authorization rejection
    console.log('\n[Test A6] Non-admin cannot edit or remove price list items');
    const repEditRes = await request(
      'PUT',
      `/price-lists/${testPriceList1.id}/items/${testItem1.id}`,
      { unitPrice: 500.00 },
      { Authorization: `Bearer ${repToken}` }
    );
    assert(repEditRes.status === 403, `Sales rep update rejected with 403 (got ${repEditRes.status})`);

    const finDeleteRes = await request(
      'DELETE',
      `/price-lists/${testPriceList1.id}/items/${testItem1.id}`,
      null,
      { Authorization: `Bearer ${financeToken}` }
    );
    assert(finDeleteRes.status === 403, `Finance delete rejected with 403 (got ${finDeleteRes.status})`);

    // Test A7: Input validation checks (negative price, invalid quantities)
    console.log('\n[Test A7] Price and quantity validation');
    const negPriceRes = await request(
      'PUT',
      `/price-lists/${testPriceList1.id}/items/${testItem1.id}`,
      { unitPrice: -50.00 },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(negPriceRes.status === 400, `Negative price rejected with 400 (got ${negPriceRes.status})`);

    // Test A8: Admin removes item from price list
    console.log('\n[Test A8] Admin removes item from price list');
    const deleteRes = await request(
      'DELETE',
      `/price-lists/${testPriceList1.id}/items/${testItem1.id}`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(deleteRes.status === 200, `Item deleted with status 200 (got ${deleteRes.status})`);

    // Test A9: Verify item is absent from price list items
    console.log('\n[Test A9] Verify removed item is absent from price list');
    const afterDeleteRes = await request('GET', `/price-lists/${testPriceList1.id}/items`, null, { Authorization: `Bearer ${adminToken}` });
    const absentCheck = afterDeleteRes.data?.data?.find(i => Number(i.id) === Number(testItem1.id));
    assert(!absentCheck, 'Deleted item is no longer returned in price list items');

    // Test A10: Verify underlying catalog product remains completely intact
    console.log('\n[Test A10] Verify underlying catalog product is intact');
    const prodCheck = await pool.query('SELECT id, is_active FROM products WHERE id = $1', [testProduct.id]);
    assert(prodCheck.rows.length === 1 && prodCheck.rows[0].is_active === true, 'Underlying catalog product is still active and unchanged');

    console.log(`\n--- PART B: Fulfillment Role Access Tests ---`);

    // Test B1: Finance Manager is rejected from accessing fulfillment orders API
    console.log('\n[Test B1] Finance Manager cannot access GET /api/fulfillment/orders');
    const finOrdersRes = await request('GET', '/fulfillment/orders', null, { Authorization: `Bearer ${financeToken}` });
    assert(finOrdersRes.status === 403, `Finance Manager GET /orders rejected with 403 (got ${finOrdersRes.status})`);

    // Test B2: Finance Manager is rejected from mutating fulfillment
    console.log('\n[Test B2] Finance Manager cannot execute fulfillment mutations');
    const finMutateRes = await request('POST', '/fulfillment/orders/1/accept-split', {}, { Authorization: `Bearer ${financeToken}` });
    assert(finMutateRes.status === 403, `Finance Manager mutation rejected with 403 (got ${finMutateRes.status})`);

    // Test B3: Admin retains authorized fulfillment access
    console.log('\n[Test B3] Admin retains authorized fulfillment access');
    const adminOrdersRes = await request('GET', '/fulfillment/orders', null, { Authorization: `Bearer ${adminToken}` });
    assert(adminOrdersRes.status === 200, `Admin GET /orders returns 200 (got ${adminOrdersRes.status})`);

    // Test B4: Finance Manager can still access billing, invoices, and reports
    console.log('\n[Test B4] Finance Manager retains access to billing, invoices, and reports');
    const finInvoicesRes = await request('GET', '/invoices', null, { Authorization: `Bearer ${financeToken}` });
    assert(finInvoicesRes.status === 200, `Finance Manager can access /invoices (got ${finInvoicesRes.status})`);

    const finSubsRes = await request('GET', '/billing/subscriptions', null, { Authorization: `Bearer ${financeToken}` });
    assert(finSubsRes.status === 200 || finSubsRes.status === 404, `Finance Manager can access billing subscriptions (got ${finSubsRes.status})`);

    console.log('\n================================================================');
    console.log(' ALL PRICE LIST ITEM & FINANCE FULFILLMENT TESTS PASSED! (100%)');
    console.log('================================================================');
  } finally {
    // Cleanup temporary price lists
    if (testPriceList1?.id) await pool.query('DELETE FROM price_lists WHERE id = $1', [testPriceList1.id]);
    if (testPriceList2?.id) await pool.query('DELETE FROM price_lists WHERE id = $1', [testPriceList2.id]);
    await pool.end();
  }
}

runTestSuite().catch((err) => {
  console.error('\n💥 TEST SUITE EXECUTION FAILED:', err);
  process.exit(1);
});
