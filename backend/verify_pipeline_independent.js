import pool from "./src/config/db.js";
import assert from "assert";

const BASE_URL = "http://localhost:5000/api";

const request = async (method, path, body, token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
};

async function runIndependentVerification() {
    console.log("================================================================================");
    console.log("INDEPENDENT QUOTE-TO-CASH MATHEMATICAL & DATABASE VERIFICATION");
    console.log("================================================================================\n");

    // 1. Authenticate actors
    const salesLogin = await request("POST", "/auth/login", { email: "salesrep1@dealflow360.com", password: "password123" });
    assert.strictEqual(salesLogin.status, 200, "Sales Rep login succeeds");
    const salesToken = salesLogin.data.data.token;

    const mgrLogin = await request("POST", "/auth/login", { email: "manager@dealflow360.com", password: "password123" });
    assert.strictEqual(mgrLogin.status, 200, "Manager login succeeds");
    const mgrToken = mgrLogin.data.data.token;

    const custLogin = await request("POST", "/auth/login", { email: "john@acme.com", password: "password123" });
    assert.strictEqual(custLogin.status, 200, "Customer login succeeds");
    const custToken = custLogin.data.data.token;

    const adminLogin = await request("POST", "/auth/login", { email: "admin@dealflow360.com", password: "password123" });
    const adminToken = adminLogin.data.data.token;

    // 2. Hardware stock preparation in Warehouse 1 (ID 1)
    await pool.query(
        `INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity_on_hand, reserved_quantity)
         VALUES (1, 1, 10, 0)
         ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity_on_hand = 10, reserved_quantity = 0`
    );
    const stockPre = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = 1 AND product_id = 1");
    assert.strictEqual(Number(stockPre.rows[0].quantity_on_hand), 10, "Warehouse 1 stock initialized to 10 units");

    // 3. Create Quotation with PEN-AND-PAPER EXPECTED VALUES
    // Product 1 (Laptop Pro 14): Qty = 2, Price = 1200.00, Discount = 5%, CGST = 7.5%, SGST = 7.5%
    // Product 4 (Care Plan 2yr, Recurring): Qty = 2, Price = 46.00, Discount = 0%, Tax = 0%
    const createQuoteRes = await request("POST", "/quotations", {
        customerId: 1, // Acme Corp (Bronze tier, 5% ceiling)
        priceListId: 1,
        items: [
            { productId: 1, quantity: 2, discountPercent: 5 },
            { productId: 4, quantity: 2, discountPercent: 0 }
        ]
    }, salesToken);
    assert.strictEqual(createQuoteRes.status, 201, "Quotation created with HTTP 201");
    const quoteCode = createQuoteRes.data.data.quoteCode || createQuoteRes.data.data.quote_code;
    const quoteDbId = createQuoteRes.data.data.dbId || createQuoteRes.data.data.id;

    // 4. Query PostgreSQL DIRECTLY and compare against independent calculations
    const dbQuote = await pool.query("SELECT * FROM quotations WHERE id = $1", [quoteDbId]);
    const quoteRow = dbQuote.rows[0];

    // Independent expected numbers:
    // Line 1: Gross = 2400.00, Disc = 120.00, Net = 2280.00, Tax = 342.00, LineTotal = 2622.00
    // Line 2: Gross = 92.00, Disc = 0.00, Net = 92.00, Tax = 0.00, LineTotal = 92.00
    // Subtotal: 2400.00 + 92.00 = 2492.00
    // Total Discount: 120.00
    // Total Tax: 342.00
    // Total Amount: (2492.00 - 120.00) + 342.00 = 2714.00
    console.log("Checking DB Quotation calculations against manual formulas:");
    assert.strictEqual(Number(quoteRow.subtotal).toFixed(2), "2492.00", "DB subtotal equals manual 2492.00");
    assert.strictEqual(Number(quoteRow.total_discount).toFixed(2), "120.00", "DB total_discount equals manual 120.00");
    assert.strictEqual(Number(quoteRow.tax_amount).toFixed(2), "342.00", "DB tax_amount equals manual 342.00");
    assert.strictEqual(Number(quoteRow.total_amount).toFixed(2), "2714.00", "DB total_amount equals manual 2714.00");
    console.log("✅ PASSED: Direct DB quote totals reconcile with independent mathematical arithmetic");

    // 5. Submit and verify auto-approval (since 5% discount is within Bronze ceiling of 5%)
    const submitRes = await request("POST", `/quotations/${quoteCode}/submit`, {}, salesToken);
    assert.strictEqual(submitRes.status, 200, "Quotation submitted with HTTP 200");
    const submitStatus = submitRes.data.data.status;
    assert.strictEqual(submitStatus, "Approved", "Quotation with 5% discount within Bronze ceiling auto-approves");
    console.log("✅ PASSED: Within-limit quotation auto-approves without manual intervention");

    // 6. Customer confirms quotation online
    const confirmRes = await request("POST", `/customer/quotes/${quoteCode}/confirm`, {}, custToken);
    assert.strictEqual(confirmRes.status, 200, "Customer confirms quote with HTTP 200");

    // 7. Verify Invoices generated directly in PostgreSQL
    const invRows = await pool.query("SELECT * FROM invoices WHERE quotation_id = $1 ORDER BY id ASC", [quoteDbId]);
    assert.strictEqual(invRows.rows.length, 2, "Exactly two split invoices generated (One-Time and Recurring)");

    const oneTimeInv = invRows.rows.find(i => i.invoice_type === "One-Time");
    const recurringInv = invRows.rows.find(i => i.invoice_type === "Recurring");

    assert(oneTimeInv, "One-Time invoice exists in invoices table");
    assert(recurringInv, "Recurring invoice exists in invoices table");

    // Expected One-Time Amount = LineTotal of Laptop Pro 14 = 2622.00
    // Expected Recurring Amount = LineTotal of Care Plan 2yr = 92.00
    assert.strictEqual(Number(oneTimeInv.amount).toFixed(2), "2622.00", "One-Time invoice amount equals manual 2622.00");
    assert.strictEqual(Number(recurringInv.amount).toFixed(2), "92.00", "Recurring invoice amount equals manual 92.00");
    assert.strictEqual(oneTimeInv.status, "Unpaid", "Initial invoice status is 'Unpaid'");
    console.log("✅ PASSED: Direct DB invoice amounts reconcile exactly with line-item manual calculations");

    // 8. Verify Subscription contract created in subscriptions table
    const subRows = await pool.query("SELECT * FROM subscriptions WHERE quotation_id = $1", [quoteDbId]);
    assert.strictEqual(subRows.rows.length, 1, "Subscription contract persisted in subscriptions table");
    assert.strictEqual(subRows.rows[0].status, "Active", "Subscription status is 'Active'");
    console.log("✅ PASSED: Subscription contract created with status 'Active'");

    // 9. Verify Warehouse Inventory deduction in PostgreSQL
    // 2 units ordered, stock pre was 10 -> stock post must be 8
    const stockPost = await pool.query("SELECT quantity_on_hand FROM warehouse_inventory WHERE warehouse_id = 1 AND product_id = 1");
    assert.strictEqual(Number(stockPost.rows[0].quantity_on_hand), 8, "Stock correctly decremented from 10 to 8 units in PostgreSQL");
    console.log("✅ PASSED: Warehouse inventory decremented atomically from 10 to 8 units");

    // 10. Test Payment Recording and Outstanding Balance Reconciliation
    const payRes = await request("POST", `/invoices/${oneTimeInv.id}/payment`, {
        amount: 2622.00,
        paymentMethod: "Bank Transfer",
        referenceCode: `PAY-${Date.now()}`
    }, adminToken);
    assert.strictEqual(payRes.status, 200, "Payment of 2622.00 accepted");

    // Check invoice status after payment directly in PostgreSQL
    const invAfterPay = await pool.query("SELECT status, paid_at FROM invoices WHERE id = $1", [oneTimeInv.id]);
    const paymentsLogged = await pool.query("SELECT * FROM payments WHERE invoice_id = $1", [oneTimeInv.id]);
    assert.strictEqual(paymentsLogged.rows.length, 1, "Payment record inserted into payments table");
    assert.strictEqual(Number(paymentsLogged.rows[0].amount).toFixed(2), "2622.00", "Payments ledger logs 2622.00");
    assert.strictEqual(invAfterPay.rows[0].status, "Paid", "Invoice status transitioned to 'Paid' upon full balance settlement");
    assert(invAfterPay.rows[0].paid_at !== null, "Invoice paid_at timestamp recorded");
    console.log("✅ PASSED: Payment recorded in payments table and invoice status transitioned to 'Paid'");

    // 11. Idempotency Check: Customer cannot confirm quotation a second time
    const repeatConfirm = await request("POST", `/customer/quotes/${quoteCode}/confirm`, {}, custToken);
    assert.strictEqual(repeatConfirm.status, 400, "Repeat confirmation is rejected with HTTP 400 Bad Request");
    const invCountPost = await pool.query("SELECT COUNT(*)::int AS count FROM invoices WHERE quotation_id = $1", [quoteDbId]);
    assert.strictEqual(invCountPost.rows[0].count, 2, "Invoice count remains exactly 2 (zero duplicate invoices created)");
    console.log("✅ PASSED: Repeat confirmation prevented; zero duplicate invoices created");

    console.log("\n================================================================================");
    console.log("🎉 ALL INDEPENDENT PIPELINE & FINANCIAL CHECKS PASSED (100%)");
    console.log("================================================================================");

    await pool.end();
}

runIndependentVerification().catch(err => {
    console.error("💥 INDEPENDENT VERIFICATION FAILED:", err);
    process.exit(1);
});
