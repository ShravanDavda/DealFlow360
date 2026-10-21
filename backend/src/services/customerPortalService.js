import pool from "../config/db.js";
import { getQuotationByCodeOrId } from "./quotationService.js";
import { calculateQuotation } from "./quotationCalculationService.js";
import { createApprovalCycle } from "./approvalService.js";
import { generateBillingForQuotation } from "./billingService.js";
import { fulfillFulfillmentOrder } from "./fulfillmentService.js";
import { createNotification, notifyStageApprovers } from "./notificationService.js";

export const getCustomerQuotes = async (customerId, userRole = "customer") => {
    if (!customerId && userRole === "customer") {
        throw new Error("Customer identity could not be resolved");
    }

    let query = `
        SELECT 
            q.id,
            q.customer_id AS "customerId",
            q.quote_code AS "quoteId",
            q.quote_code AS "quoteCode",
            q.quote_code AS "quotationNumber",
            c.company_name AS "customerName",
            q.status,
            q.subtotal,
            q.total_discount AS "totalDiscount",
            q.tax_amount AS "taxAmount",
            q.total_amount AS "totalAmount",
            c.currency,
            q.requested_delivery_date AS "requestedDeliveryDate",
            q.created_at AS "createdAt",
            q.updated_at AS "updatedAt",
            COUNT(qi.id) AS "itemCount"
        FROM quotations q
        INNER JOIN customers c ON q.customer_id = c.id
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    `;

    const params = [];
    if (userRole === "customer") {
        params.push(Number(customerId));
        query += ` WHERE q.customer_id = $1`;
    }

    query += ` GROUP BY q.id, c.company_name, c.currency ORDER BY q.id DESC`;

    const { rows } = await pool.query(query, params);

    return rows.map((r) => ({
        id: r.id,
        quoteId: r.quoteId,
        quoteCode: r.quoteCode,
        quotationNumber: r.quotationNumber,
        customerId: r.customerId,
        customerName: r.customerName,
        status: r.status,
        subtotal: Number(r.subtotal || 0),
        totalDiscount: Number(r.totalDiscount || 0),
        taxAmount: Number(r.taxAmount || 0),
        totalAmount: Number(r.totalAmount || 0),
        currency: r.currency || "USD",
        itemCount: Number(r.itemCount || 0),
        requestedDeliveryDate: r.requestedDeliveryDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isConfirmable: r.status === "Approved",
        isNegotiable: !["Confirmed", "Rejected"].includes(r.status)
    }));
};

export const getCustomerQuote = async (quoteCodeOrId, customerId, userRole = "customer") => {
    const quote = await getQuotationByCodeOrId(quoteCodeOrId);
    if (!quote) {
        const error = new Error("Quotation not found");
        error.statusCode = 404;
        throw error;
    }

    if (userRole === "customer" && Number(quote.customerId) !== Number(customerId)) {
        const error = new Error("You are not authorized to access this quotation");
        error.statusCode = 403;
        throw error;
    }

    const customerProducts = (quote.products || []).map((p) => ({
        id: p.id,
        productId: p.productId,
        name: p.name,
        productName: p.name,
        sku: p.sku || `PROD-${p.productId}`,
        quantity: p.quantity,
        unitPrice: Number(p.price || 0),
        discount: Number(p.discount || 0),
        discountPercent: Number(p.discount || 0),
        taxPercent: Number(p.taxPercent || 0),
        lineTotal: Number(p.lineTotal || 0),
        isRecurring: Boolean(p.isRecurring),
        recurringCycle: p.recurringCycle || null
    }));

    const negRes = await pool.query(
        `SELECT id, product_name AS "productName", customer_comment AS "customerComment",
                COALESCE(message, customer_comment) AS "message",
                sender_id AS "senderId", sender_role AS "senderRole", sender_name AS "senderName",
                requested_discount AS "requestedDiscount", status, created_at AS "createdAt"
         FROM quotation_negotiation_lines
         WHERE quotation_id = $1
         ORDER BY created_at ASC, id ASC`,
        [quote.dbId]
    );

    let negotiationLines = negRes.rows;
    if (negotiationLines.length === 0) {
        negotiationLines = customerProducts.map((p, i) => ({
            id: `LINE-${i + 1}`,
            productName: p.name,
            customerComment: `Line terms: ${p.discount}% discount applied`,
            message: `Line terms: ${p.discount}% discount applied`,
            status: "Standard"
        }));
    }

    const historyRes = await pool.query(
        `SELECT id, product_name, customer_comment, COALESCE(message, customer_comment) AS message,
                requested_discount, status, sender_id, sender_role, sender_name, created_at
         FROM quotation_negotiation_lines
         WHERE quotation_id = $1
         ORDER BY created_at ASC, id ASC`,
        [quote.dbId]
    );

    return {
        id: quote.dbId,
        quoteId: quote.quoteCode,
        quoteCode: quote.quoteCode,
        quotationNumber: quote.quoteCode,
        customerName: quote.customerName,
        customerId: quote.customerId,
        status: quote.status,
        subtotal: Number(quote.subtotal || 0),
        totalDiscount: Number(quote.totalDiscount || 0),
        discountAmount: Number(quote.totalDiscount || 0),
        taxAmount: Number(quote.taxAmount || 0),
        totalAmount: Number(quote.totalAmount || 0),
        currency: quote.currency || "USD",
        requestedDeliveryDate: quote.requestedDeliveryDate,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        products: customerProducts,
        lineItems: customerProducts,
        negotiationLines,
        negotiationHistory: historyRes.rows.map((row) => ({
            id: row.id,
            productName: row.product_name,
            comment: row.customer_comment,
            message: row.message,
            requestedDiscount: row.requested_discount ? Number(row.requested_discount) : null,
            status: row.status,
            senderId: row.sender_id,
            senderRole: row.sender_role,
            senderName: row.sender_name,
            createdAt: row.created_at
        })),
        isConfirmable: quote.status === "Approved",
        isNegotiable: !["Confirmed", "Rejected"].includes(quote.status)
    };
};

export const getNegotiationHistory = async (quoteCodeOrId, customerId, userRole = "customer") => {
    const quote = await getQuotationByCodeOrId(quoteCodeOrId);
    if (!quote) {
        const error = new Error("Quotation not found");
        error.statusCode = 404;
        throw error;
    }

    if (userRole === "customer" && Number(quote.customerId) !== Number(customerId)) {
        const error = new Error("You are not authorized to access this quotation");
        error.statusCode = 403;
        throw error;
    }

    const lines = await pool.query(
        `SELECT id, product_name AS "productName", customer_comment AS "customerComment",
                COALESCE(message, customer_comment) AS "message",
                sender_id AS "senderId", sender_role AS "senderRole", sender_name AS "senderName",
                requested_discount AS "requestedDiscount", status, created_at AS "createdAt"
         FROM quotation_negotiation_lines
         WHERE quotation_id = $1
         ORDER BY created_at ASC, id ASC`,
        [quote.dbId]
    );

    const audit = await pool.query(
        `SELECT id, action, note, user_name AS "userName", user_role AS "userRole", created_at AS "createdAt"
         FROM quotation_audit_trail
         WHERE quotation_id = $1 AND action IN ('Negotiation Request', 'RE_APPROVAL_STARTED', 'Confirmed', 'APPROVAL_STEP_APPROVED', 'APPROVAL_STEP_REJECTED', 'APPROVAL_RETURNED', 'QUOTATION_APPROVED')
         ORDER BY created_at DESC`,
        [quote.dbId]
    );

    return {
        quoteId: quote.quoteCode,
        negotiationLines: lines.rows,
        auditTrail: audit.rows
    };
};

export const submitCustomerNegotiation = async (
    quoteCodeOrId,
    customerId,
    userRole = "customer",
    { counterDiscount, requestedDeliveryDate, message, comment, customerComment, lineComments = [], senderId, senderRole, senderName } = {}
) => {
    const quote = await getQuotationByCodeOrId(quoteCodeOrId);
    if (!quote) {
        const error = new Error("Quotation not found");
        error.statusCode = 404;
        throw error;
    }

    if (userRole === "customer" && Number(quote.customerId) !== Number(customerId)) {
        const error = new Error("You are not authorized to negotiate this quotation");
        error.statusCode = 403;
        throw error;
    }

    if (quote.status === "Confirmed") {
        const error = new Error("Cannot negotiate an already confirmed quotation");
        error.statusCode = 400;
        throw error;
    }
    if (quote.status === "Rejected") {
        const error = new Error("Cannot negotiate a rejected quotation");
        error.statusCode = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM quotations WHERE id = $1 FOR UPDATE", [quote.dbId]);

        const hasDiscountProposal = counterDiscount !== undefined && counterDiscount !== null && counterDiscount !== "";
        const discountNum = hasDiscountProposal ? Number(counterDiscount) : NaN;

        if (hasDiscountProposal && (isNaN(discountNum) || discountNum < 0 || discountNum > 100)) {
            const error = new Error("Counter discount percentage must be a valid number between 0% and 100%");
            error.statusCode = 400;
            throw error;
        }

        let nextStatus = quote.status;
        let nextStage = quote.approvalStage;
        let blendedRisk = quote.blendedRisk;
        let reEnteredApproval = false;
        let calculation = null;
        let chain = null;

        if (hasDiscountProposal) {
            calculation = await calculateQuotation({
                client,
                customerId: quote.customerId,
                priceListId: quote.priceListId,
                items: quote.products.map((item) => ({
                    productId: item.productId,
                    productVariantId: item.productVariantId,
                    quantity: item.quantity,
                    discountPercent: discountNum
                }))
            });

            blendedRisk = calculation.blendedRisk;

            if (blendedRisk !== "LOW") {
                nextStatus = "Pending Approval";
                reEnteredApproval = true;
                try {
                    chain = await createApprovalCycle(client, {
                        quote: { id: quote.dbId, user_id: quote.userId },
                        calculation,
                        submittedBy: quote.userId
                    });
                    if (chain && chain.steps?.[0]) {
                        nextStage = chain.steps[0].approverRole;
                    }
                } catch (cycleErr) {
                    if (cycleErr.message && cycleErr.message.includes("No active approval chain configured")) {
                        const error = new Error("The proposed discount exceeds the maximum allowable discount limit configured for management review. Please propose a lower discount.");
                        error.statusCode = 400;
                        throw error;
                    }
                    throw cycleErr;
                }
            } else {
                nextStatus = "Approved";
                nextStage = "Auto-Approved";
                reEnteredApproval = false;
                await client.query(
                    `UPDATE quotation_approval_requests
                     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
                     WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')`,
                    [quote.dbId]
                );
            }
        } else {
            nextStatus = "Under Negotiation";
            nextStage = "None";
            reEnteredApproval = false;
            await client.query(
                `UPDATE quotation_approval_requests
                 SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
                 WHERE quotation_id = $1 AND status IN ('PENDING', 'RETURNED')`,
                [quote.dbId]
            );
        }

        await client.query(
            `
            UPDATE quotations
            SET status = $1,
                approval_stage = $2,
                blended_risk_score = $3,
                subtotal = COALESCE($4, subtotal),
                total_discount = COALESCE($5, total_discount),
                tax_amount = COALESCE($6, tax_amount),
                total_amount = COALESCE($7, total_amount),
                overall_margin = COALESCE($8, overall_margin),
                requested_delivery_date = COALESCE($9, requested_delivery_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            `,
            [
                nextStatus,
                nextStage,
                blendedRisk,
                calculation?.subtotal,
                calculation?.totalDiscount,
                calculation?.taxAmount,
                calculation?.totalAmount,
                calculation?.overallMargin,
                requestedDeliveryDate || null,
                quote.dbId
            ]
        );

        if (calculation) {
            for (const [index, item] of calculation.items.entries()) {
                await client.query(
                    `UPDATE quotation_items
                     SET discount_percent = $1,
                         discount_limit = $2,
                         line_total = $3,
                         margin_percent = $4,
                         risk_status = $5
                     WHERE id = $6 AND quotation_id = $7`,
                    [
                        item.discountGiven,
                        item.discountLimit,
                        item.lineTotal,
                        item.marginPercent,
                        item.riskStatus,
                        quote.products[index]?.dbId,
                        quote.dbId
                    ]
                );
            }
        }

        const customerNote = customerComment || message || comment || (hasDiscountProposal
            ? `Customer proposed ${discountNum}% discount (Target Delivery: ${requestedDeliveryDate || "Standard"})`
            : `Customer requested terms change: ${requestedDeliveryDate ? `Delivery ${requestedDeliveryDate}` : "Terms review"}`);

        let resolvedSenderId = senderId;
        let resolvedSenderName = senderName;
        if (!resolvedSenderId || !resolvedSenderName) {
            const custUserRes = await client.query(
                `SELECT id, COALESCE(NULLIF(CONCAT(first_name, ' ', last_name), ' '), username) AS name
                 FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1`,
                [quote.customerId]
            );
            if (custUserRes.rows[0]) {
                resolvedSenderId = resolvedSenderId || custUserRes.rows[0].id;
                resolvedSenderName = resolvedSenderName || custUserRes.rows[0].name;
            }
        }
        resolvedSenderName = resolvedSenderName || quote.customerName || "Customer";

        await client.query(
            `
            INSERT INTO quotation_negotiation_lines (
                quotation_id,
                product_name,
                customer_comment,
                message,
                requested_discount,
                status,
                sender_id,
                sender_role,
                sender_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
                quote.dbId,
                hasDiscountProposal ? "Order Counter-Offer" : "Customer Question / Change Request",
                customerNote,
                customerNote,
                hasDiscountProposal ? discountNum : null,
                hasDiscountProposal ? (reEnteredApproval ? "Under Review" : "Approved") : "Under Review",
                resolvedSenderId || null,
                senderRole || "customer",
                resolvedSenderName
            ]
        );

        const auditNote = reEnteredApproval
            ? `Customer counter discount of ${discountNum}% exceeds limit; re-entered approval flow (${nextStage})`
            : hasDiscountProposal
            ? `Customer counter discount of ${discountNum}% is within allowed limits; auto-approved`
            : `Customer submitted terms request: ${customerNote}`;

        await client.query(
            `
            INSERT INTO quotation_audit_trail (quotation_id, user_name, action, note, previous_status, new_status)
            VALUES ($1, 'Customer (Portal)', 'Negotiation Request', $2, $3, $4)
            `,
            [quote.dbId, auditNote, quote.status, nextStatus]
        );

        if (reEnteredApproval) {
            await client.query(
                `
                INSERT INTO quotation_audit_trail (quotation_id, user_name, user_role, action, note, previous_status, new_status)
                VALUES ($1, 'Customer (Portal)', 'customer', 'RE_APPROVAL_STARTED', $2, $3, $4)
                `,
                [quote.dbId, `New approval cycle created for ${blendedRisk} risk`, quote.status, nextStatus]
            );
        }

        // Notification triggers within the same logical business operation
        if (!hasDiscountProposal) {
            await createNotification(client, {
                userId: quote.userId,
                title: `Quotation ${quote.quoteCode}: Negotiation Message Received`,
                message: `Customer ${quote.customerName} sent a negotiation message: "${customerNote.slice(0, 140)}"`,
                type: "NEGOTIATION_MESSAGE",
                quotationId: quote.dbId,
                link: `/quotations/${quote.quoteCode}`
            });
        } else if (reEnteredApproval) {
            await createNotification(client, {
                userId: quote.userId,
                title: `Quotation ${quote.quoteCode}: Customer Counter-Offer Submitted`,
                message: `Customer ${quote.customerName} submitted a counter-offer (${discountNum}% discount). Action required: quotation re-entered approval pipeline at ${nextStage} stage.`,
                type: "COUNTER_OFFER",
                quotationId: quote.dbId,
                link: `/quotations/${quote.quoteCode}`
            });
            await notifyStageApprovers(client, {
                quotationId: quote.dbId,
                stage: nextStage,
                title: `Approval Required: Quotation ${quote.quoteCode}`,
                message: `Quotation ${quote.quoteCode} (${quote.customerName}) requires your approval for a ${discountNum}% counter-discount (${blendedRisk} Risk).`,
                type: "APPROVAL_REQUIRED",
                link: `/approvals/${quote.quoteCode}`
            });
        } else {
            await createNotification(client, {
                userId: quote.userId,
                title: `Quotation ${quote.quoteCode}: Counter-Offer Auto-Approved`,
                message: `Customer ${quote.customerName} submitted a counter-offer (${discountNum}% discount) which was auto-approved within allowed limits.`,
                type: "COUNTER_OFFER",
                quotationId: quote.dbId,
                link: `/quotations/${quote.quoteCode}`
            });
        }

        await client.query("COMMIT");

        return {
            quoteId: quote.quoteCode,
            customerName: quote.customerName,
            status: nextStatus,
            reEnteredApproval,
            message: reEnteredApproval
                ? `Counter discount (${discountNum}%) exceeds the configured discount limit. Quotation has been submitted for management review.`
                : hasDiscountProposal
                ? `Counter discount (${discountNum}%) is within allowed limits and has been applied. You may now confirm the quotation.`
                : "Your request has been submitted successfully."
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const confirmCustomerQuote = async (quoteCodeOrId, customerId, userRole = "customer") => {
    const quote = await getQuotationByCodeOrId(quoteCodeOrId);
    if (!quote) {
        const error = new Error("Quotation not found");
        error.statusCode = 404;
        throw error;
    }

    if (userRole === "customer" && Number(quote.customerId) !== Number(customerId)) {
        const error = new Error("You are not authorized to confirm this quotation");
        error.statusCode = 403;
        throw error;
    }

    if (quote.status === "Confirmed") {
        const error = new Error("Quotation has already been confirmed");
        error.statusCode = 400;
        throw error;
    }
    if (quote.status === "Rejected") {
        const error = new Error("Cannot confirm a rejected quotation");
        error.statusCode = 400;
        throw error;
    }
    if (quote.status === "Pending Approval") {
        const error = new Error("Quotation is pending internal approval and cannot be confirmed yet");
        error.statusCode = 400;
        throw error;
    }
    if (quote.status !== "Approved") {
        const error = new Error(`Quotation in status '${quote.status}' cannot be confirmed. Only approved quotations can be confirmed.`);
        error.statusCode = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM quotations WHERE id = $1 FOR UPDATE", [quote.dbId]);

        await client.query(
            `UPDATE quotations
             SET status = 'Confirmed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [quote.dbId]
        );

        let orderId;
        const foRes = await client.query("SELECT id FROM fulfillment_orders WHERE quotation_id = $1", [quote.dbId]);
        if (foRes.rows.length === 0) {
            const insFo = await client.query(
                `
                INSERT INTO fulfillment_orders (order_code, quotation_id, customer_name, status, total_shipments, estimated_shipping_cost)
                VALUES ($1, $2, $3, 'Pending Split', 0, 0)
                RETURNING id
                `,
                [`ORD-${quote.quoteCode.replace(/^Q-/, "")}`, quote.dbId, quote.customerName]
            );
            orderId = insFo.rows[0].id;
        } else {
            orderId = foRes.rows[0].id;
        }

        await generateBillingForQuotation(client, {
            id: quote.dbId,
            quote_code: quote.quoteCode,
            customer_id: quote.customerId,
            payment_terms: quote.paymentTerms,
            currency: quote.currency || "USD"
        });

        await fulfillFulfillmentOrder(client, orderId, quote.dbId);

        await client.query(
            `
            INSERT INTO quotation_audit_trail (quotation_id, user_name, action, note, previous_status, new_status)
            VALUES ($1, 'Customer (Portal)', 'Confirmed', 'Customer confirmed final terms online', 'Approved', 'Confirmed')
            `,
            [quote.dbId]
        );

        await client.query("COMMIT");

        return {
            quoteId: quote.quoteCode,
            status: "Confirmed",
            message: "Quotation confirmed successfully. Order created and moving to fulfillment and billing."
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
