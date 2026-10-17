import pool from "../config/db.js";

const paymentTermDays = (paymentTerms) => {
    const match = String(paymentTerms || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
};

const ensureInvoiceItems = async (client, invoiceCode, items) => {
    const tableResult = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoice_items'`
    );
    const availableColumns = new Set(tableResult.rows.map((row) => row.column_name));
    if (!availableColumns.size) return;

    const invoiceResult = await client.query("SELECT id FROM invoices WHERE invoice_code = $1", [invoiceCode]);
    const invoiceId = invoiceResult.rows[0]?.id;
    if (!invoiceId) return;
    const existingResult = await client.query("SELECT 1 FROM invoice_items WHERE invoice_id = $1 LIMIT 1", [invoiceId]);
    if (existingResult.rows[0]) return;

    const supported = [
        "invoice_id", "quotation_item_id", "product_id", "item_name", "description", "quantity", "unit_price",
        "discount_percent", "tax_percent", "cgst_percent", "sgst_percent", "discount_amount", "tax_amount", "line_total", "amount", "total"
    ].filter((column) => availableColumns.has(column));
    if (!supported.includes("invoice_id") || !supported.includes("quantity")) return;

    for (const item of items) {
        const netBase = Number(item.unitPrice || 0) * Number(item.quantity || 0) * (1 - Number(item.discountPercent || 0) / 100);
        const cgstVal = netBase * (Number(item.cgstPercent || 0) / 100);
        const sgstVal = netBase * (Number(item.sgstPercent || 0) / 100);
        const taxVal = cgstVal + sgstVal;
        const values = {
            invoice_id: invoiceId,
            quotation_item_id: item.id,
            product_id: item.productId,
            item_name: item.itemName,
            description: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            discount_percent: item.discountPercent,
            tax_percent: item.taxPercent,
            cgst_percent: item.cgstPercent,
            sgst_percent: item.sgstPercent,
            discount_amount: Number(item.unitPrice || 0) * Number(item.quantity || 0) * Number(item.discountPercent || 0) / 100,
            tax_amount: Number(taxVal.toFixed(2)),
            line_total: item.lineTotal,
            amount: item.lineTotal,
            total: item.lineTotal
        };
        const columns = supported.filter((column) => values[column] !== undefined);
        await client.query(
            `INSERT INTO invoice_items (${columns.join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
            columns.map((column) => values[column])
        );
    }
};

const generateBillingForQuotation = async (client, quote) => {
    const itemsResult = await client.query(
        `SELECT qi.id, qi.product_id AS "productId", qi.item_name AS "itemName", qi.quantity, qi.unit_price AS "unitPrice", qi.discount_percent AS "discountPercent",
            COALESCE(NULLIF(qi.cgst_percent, 0), NULLIF(p.cgst_percent, 0), p.tax_percent / 2, 0) AS "cgstPercent",
            COALESCE(NULLIF(qi.sgst_percent, 0), NULLIF(p.sgst_percent, 0), p.tax_percent / 2, 0) AS "sgstPercent",
            COALESCE(NULLIF(qi.cgst_percent, 0), NULLIF(p.cgst_percent, 0), p.tax_percent / 2, 0) + COALESCE(NULLIF(qi.sgst_percent, 0), NULLIF(p.sgst_percent, 0), p.tax_percent / 2, 0) AS "taxPercent",
            qi.line_total AS "lineTotal", qi.is_recurring AS "isRecurring", qi.recurring_cycle AS "recurringCycle"
         FROM quotation_items qi
         LEFT JOIN products p ON p.id = qi.product_id
         WHERE qi.quotation_id = $1 ORDER BY qi.id`,
        [quote.id]
    );
    const items = itemsResult.rows;
    const oneTimeAmount = items.filter((item) => !item.isRecurring).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const recurringItems = items.filter((item) => item.isRecurring);
    const recurringAmount = recurringItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const dueDays = paymentTermDays(quote.payment_terms);
    const generated = { invoices: [], subscription: null };

    if (oneTimeAmount > 0) {
        const existing = await client.query(
            `SELECT invoice_code AS "invoiceCode" FROM invoices WHERE quotation_id = $1 AND invoice_type = 'One-Time' LIMIT 1`,
            [quote.id]
        );
        if (existing.rows[0]) {
            generated.invoices.push(existing.rows[0].invoiceCode);
            await ensureInvoiceItems(client, existing.rows[0].invoiceCode, items.filter((item) => !item.isRecurring));
        } else {
            const invoiceCode = `INV-${String(quote.quote_code).replace(/^Q-/, "")}`;
            const invoice = await client.query(
                `INSERT INTO invoices (invoice_code, quotation_id, customer_id, invoice_type, amount, currency, status, due_date)
                 VALUES ($1, $2, $3, 'One-Time', $4, $5, 'Unpaid', CURRENT_DATE + ($6 * INTERVAL '1 day'))
                 RETURNING invoice_code AS "invoiceCode"`,
                [invoiceCode, quote.id, quote.customer_id, oneTimeAmount, quote.currency || "USD", dueDays]
            );
            generated.invoices.push(invoice.rows[0].invoiceCode);
            await ensureInvoiceItems(client, invoice.rows[0].invoiceCode, items.filter((item) => !item.isRecurring));
        }
    }

    if (recurringAmount > 0) {
        const subscriptionResult = await client.query(
            `SELECT id, subscription_code AS "subscriptionCode" FROM subscriptions WHERE quotation_id = $1 LIMIT 1`,
            [quote.id]
        );
        let subscription = subscriptionResult.rows[0];
        const cycle = recurringItems[0].recurringCycle || "Monthly";
        if (!subscription) {
            const subscriptionInsert = await client.query(
                `INSERT INTO subscriptions (subscription_code, quotation_id, customer_id, plan_name, billing_cycle, recurring_amount, next_bill_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'Active')
                 RETURNING id, subscription_code AS "subscriptionCode"`,
                [`SUB-${String(quote.quote_code).replace(/^Q-/, "")}`, quote.id, quote.customer_id, recurringItems.map((item) => item.itemName).join(", "), cycle, recurringAmount]
            );
            subscription = subscriptionInsert.rows[0];
        }
        generated.subscription = subscription.subscriptionCode;

        const scheduleExists = await client.query("SELECT 1 FROM billing_schedules WHERE subscription_id = $1 LIMIT 1", [subscription.id]);
        if (!scheduleExists.rows[0]) {
            await client.query(
                `INSERT INTO billing_schedules (subscription_id, billing_date, cycle_label, amount, status)
                 VALUES ($1, CURRENT_DATE, $2, $3, 'Scheduled')`,
                [subscription.id, cycle, recurringAmount]
            );
        }

        const existingRecurringInvoice = await client.query(
            `SELECT invoice_code AS "invoiceCode" FROM invoices WHERE quotation_id = $1 AND invoice_type = 'Recurring' LIMIT 1`,
            [quote.id]
        );
        if (existingRecurringInvoice.rows[0]) {
            generated.invoices.push(existingRecurringInvoice.rows[0].invoiceCode);
            await ensureInvoiceItems(client, existingRecurringInvoice.rows[0].invoiceCode, recurringItems);
        } else {
            const invoice = await client.query(
                `INSERT INTO invoices (invoice_code, quotation_id, customer_id, invoice_type, amount, currency, status, due_date)
                 VALUES ($1, $2, $3, 'Recurring', $4, $5, 'Unpaid', CURRENT_DATE)
                 RETURNING invoice_code AS "invoiceCode"`,
                [`INV-${String(quote.quote_code).replace(/^Q-/, "")}-R`, quote.id, quote.customer_id, recurringAmount, quote.currency || "USD"]
            );
            generated.invoices.push(invoice.rows[0].invoiceCode);
            await ensureInvoiceItems(client, invoice.rows[0].invoiceCode, recurringItems);
        }
    }

    return generated;
};

export const generateInvoicesForQuotation = async (quoteCodeOrId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const quoteResult = await client.query(
            `SELECT q.*, c.currency FROM quotations q JOIN customers c ON c.id = q.customer_id
             WHERE q.quote_code = $1 OR q.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
             FOR UPDATE`,
            [quoteCodeOrId]
        );
        const quote = quoteResult.rows[0];
        if (!quote) throw new Error("Quotation not found");
        if (quote.status !== "Confirmed") throw new Error("Invoices can only be generated for confirmed quotations");
        const generated = await generateBillingForQuotation(client, quote);
        await client.query("COMMIT");
        return generated;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export { generateBillingForQuotation };

export const getAllSubscriptions = async () => {
    const res = await pool.query(`
        SELECT 
            s.id,
            s.subscription_code AS "subscriptionId",
            s.plan_name AS "plan",
            c.company_name AS "customer",
            s.billing_cycle AS "cycle",
            s.recurring_amount AS "mrr",
            s.status,
            to_char(s.next_bill_date, 'Mon DD, YYYY') AS "nextBilling",
            q.quote_code AS "quotationId"
        FROM subscriptions s
        INNER JOIN customers c ON s.customer_id = c.id
        LEFT JOIN quotations q ON s.quotation_id = q.id
        ORDER BY s.id DESC
    `);

    return res.rows.map((r) => ({
        id: r.subscriptionId,
        dbId: r.id,
        customer: r.customer,
        plan: r.plan,
        cycle: r.cycle,
        mrr: Number(r.mrr),
        mrrFormatted: `$${Number(r.mrr).toLocaleString()}`,
        status: r.status,
        nextBilling: r.nextBilling || "Active"
    }));
};

export const getSubscriptionDetail = async (subCodeOrId) => {
    let subRes = await pool.query(
        `
        SELECT 
            s.*,
            c.company_name AS "customerName",
            c.customer_code AS "customerCode",
            q.quote_code AS "quoteCode"
        FROM subscriptions s
        INNER JOIN customers c ON s.customer_id = c.id
        LEFT JOIN quotations q ON s.quotation_id = q.id
        WHERE s.subscription_code = $1 OR s.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
        LIMIT 1
        `,
        [subCodeOrId]
    );

    if (subRes.rows.length === 0) return null;

    const sub = subRes.rows[0];

    let oneTimeLines = [];
    if (sub.quotation_id) {
        const linesRes = await pool.query(
            `
            SELECT id, item_name AS product, quantity, line_total AS amount
            FROM quotation_items
            WHERE quotation_id = $1 AND is_recurring = FALSE
            ORDER BY id ASC
            `,
            [sub.quotation_id]
        );
        oneTimeLines = linesRes.rows.map((r, i) => ({
            id: `LINE-${r.id || i + 1}`,
            product: r.product,
            quantity: Number(r.quantity),
            amount: Number(r.amount)
        }));
    }

    const recurringLines = [
        {
            id: `REC-${sub.id}`,
            plan: sub.plan_name,
            cycle: sub.billing_cycle,
            nextBillDate: sub.next_bill_date ? new Date(sub.next_bill_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
            amount: Number(sub.recurring_amount)
        }
    ];

    const schedRes = await pool.query(
        `
        SELECT id, to_char(billing_date, 'Mon DD, YYYY') AS "billingDate", cycle_label AS "cycleLabel", amount, status
        FROM billing_schedules
        WHERE subscription_id = $1
        ORDER BY billing_date ASC
        `,
        [sub.id]
    );

    return {
        subscriptionId: sub.subscription_code,
        dbId: sub.id,
        customerId: sub.customerCode,
        customerName: sub.customerName,
        planName: sub.plan_name,
        status: sub.status,
        oneTimeLines,
        recurringLines,
        billingSchedules: schedRes.rows
    };
};

export const modifySubscription = async (subCodeOrId, { newPlanName, newAmount } = {}) => {
    const sub = await getSubscriptionDetail(subCodeOrId);
    if (!sub) throw new Error("Subscription not found");

    const updateRes = await pool.query(
        `
        UPDATE subscriptions
        SET plan_name = COALESCE($1, plan_name),
            recurring_amount = COALESCE($2, recurring_amount),
            status = 'Modified',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
        [newPlanName, newAmount, sub.dbId]
    );

    return getSubscriptionDetail(sub.subscriptionId);
};

export const cancelSubscription = async (subCodeOrId, { reason = "Customer request" } = {}) => {
    const sub = await getSubscriptionDetail(subCodeOrId);
    if (!sub) throw new Error("Subscription not found");

    await pool.query(
        `
        UPDATE subscriptions
        SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [sub.dbId]
    );

    return getSubscriptionDetail(sub.subscriptionId);
};

export const getAllInvoices = async () => {
    const res = await pool.query(`
        SELECT 
            i.id,
            i.invoice_code AS "invoiceId",
            c.company_name AS "customer",
            q.quote_code AS "order",
            i.invoice_type AS "type",
            i.amount,
            i.currency,
            i.status,
            to_char(i.due_date, 'Mon DD, YYYY') AS "dueDate",
            to_char(i.paid_at, 'Mon DD, YYYY') AS "paidAt"
        FROM invoices i
        INNER JOIN customers c ON i.customer_id = c.id
        LEFT JOIN quotations q ON i.quotation_id = q.id
        ORDER BY i.id DESC
    `);

    return res.rows.map((r) => ({
        id: r.invoiceId,
        dbId: r.id,
        invoiceId: r.invoiceId,
        customer: r.customer,
        customerName: r.customer,
        order: r.order,
        type: r.type,
        amount: Number(r.amount),
        amountFormatted: `$${Number(r.amount).toLocaleString()}`,
        status: r.status,
        dueDate: r.dueDate
    }));
};

export const getInvoiceDetail = async (invoiceCodeOrId) => {
    const res = await pool.query(
        `
        SELECT 
            i.*,
            c.company_name AS "customerName",
            c.customer_code AS "customerCode"
        FROM invoices i
        INNER JOIN customers c ON i.customer_id = c.id
        WHERE i.invoice_code = $1 OR i.id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE NULL END
        LIMIT 1
        `,
        [invoiceCodeOrId]
    );

    if (res.rows.length === 0) return null;

    const inv = res.rows[0];

    const isPaid = inv.status === "Paid";
    const timeline = [
        { id: "order-confirmed", label: "Order Confirmed", status: "completed" },
        { id: "shipped", label: "Shipped", status: "completed" },
        { id: "invoiced", label: "Invoiced", status: isPaid ? "completed" : "current" },
        { id: "paid", label: "Paid", status: isPaid ? "completed" : "pending" }
    ];

    const relRes = await pool.query(
        `
        SELECT 
            invoice_code AS "invoiceId",
            invoice_type AS "type",
            amount,
            currency,
            status,
            to_char(due_date, 'Mon DD') AS "dueDate"
        FROM invoices
        WHERE customer_id = $1
        ORDER BY id ASC
        `,
        [inv.customer_id]
    );

    return {
        id: inv.invoice_code,
        dbId: inv.id,
        invoiceId: inv.invoice_code,
        customerId: inv.customerCode,
        customerName: inv.customerName,
        amount: Number(inv.amount),
        currency: inv.currency || "USD",
        status: inv.status,
        dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
        timeline,
        relatedInvoices: relRes.rows.map((r) => ({
            invoiceId: r.invoiceId,
            type: r.type,
            amount: Number(r.amount),
            currency: r.currency || "USD",
            status: r.status,
            dueDate: r.dueDate
        }))
    };
};

export const recordPayment = async (invoiceCodeOrId, { amount, paymentMethod = "Credit Card", referenceCode } = {}) => {
    const inv = await getInvoiceDetail(invoiceCodeOrId);
    if (!inv) throw new Error("Invoice not found");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const payAmount = amount ? Number(amount) : inv.amount;
        const refCode = referenceCode || `PAY-REF-${Math.floor(10000 + Math.random() * 90000)}`;

        await client.query(
            `
            INSERT INTO payments (invoice_id, amount, payment_method, reference_code)
            VALUES ($1, $2, $3, $4)
            `,
            [inv.dbId, payAmount, paymentMethod, refCode]
        );

        await client.query(
            `
            UPDATE invoices
            SET status = 'Paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [inv.dbId]
        );

        await client.query("COMMIT");
        return getInvoiceDetail(inv.invoiceId);
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
