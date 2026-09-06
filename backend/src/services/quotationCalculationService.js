import { resolveQuotationLines } from "./pricingService.js";

export const calculateQuotation = async ({ client, customerId, priceListId, items, approvalChains = [] }) => {
    const lines = await resolveQuotationLines({ client, customerId, priceListId, items });
    let subtotal = 0;
    let totalDiscount = 0;
    let taxAmount = 0;
    let totalCost = 0;
    let totalViolationPoints = 0;
    let maxSingleViolation = 0;
    let hasAnyViolation = false;

    const evaluatedItems = lines.map((line) => {
        const applicableCeilings = [line.customerTierCeiling, line.categoryCeiling, line.discountRuleCeiling]
            .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
            .map(Number);
        const allowedDiscount = Math.min(...applicableCeilings);
        const grossAmount = line.unitPrice * line.quantity;
        const discountAmount = grossAmount * line.discountPercent / 100;
        const netAmount = grossAmount - discountAmount;
        const cgstAmount = netAmount * Number(line.cgstPercent || 0) / 100;
        const sgstAmount = netAmount * Number(line.sgstPercent || 0) / 100;
        const lineTax = cgstAmount + sgstAmount;
        const lineCost = line.baseCost * line.quantity;
        const marginPercent = netAmount > 0 ? ((netAmount - lineCost) / netAmount) * 100 : 0;
        const overBy = Math.max(0, line.discountPercent - allowedDiscount);
        if (overBy > 0) {
            hasAnyViolation = true;
            totalViolationPoints += overBy;
            maxSingleViolation = Math.max(maxSingleViolation, overBy);
        }
        subtotal += grossAmount;
        totalDiscount += discountAmount;
        taxAmount += lineTax;
        totalCost += lineCost;
        return {
            ...line,
            itemName: line.productName,
            variantId: line.variantId,
            discountGiven: line.discountPercent,
            discountLimit: allowedDiscount,
            allowedDiscount,
            discountAmount,
            grossAmount,
            netAmount,
            cgstPercent: Number(line.cgstPercent || 0),
            sgstPercent: Number(line.sgstPercent || 0),
            cgstAmount,
            sgstAmount,
            taxPercent: Number(line.cgstPercent || 0) + Number(line.sgstPercent || 0),
            taxAmount: lineTax,
            lineTotal: netAmount + lineTax,
            marginPercent,
            overBy,
            riskStatus: overBy > 0 ? "OVER" : "OK"
        };
    });

    const netRevenue = subtotal - totalDiscount;
    const overallMargin = netRevenue > 0 ? ((netRevenue - totalCost) / netRevenue) * 100 : 0;
    let blendedRisk = "LOW";
    if (maxSingleViolation >= 6 || totalViolationPoints >= 8) blendedRisk = "HIGH";
    else if (hasAnyViolation) blendedRisk = "MEDIUM";

    const matchingChain = approvalChains
        .filter((chain) => !chain.minRisk || chain.minRisk === blendedRisk)
        .filter((chain) => Number(chain.minDiscountPercent || 0) <= maxSingleViolation)
        .filter((chain) => chain.maxDiscountPercent === null || maxSingleViolation <= Number(chain.maxDiscountPercent))
        .sort((a, b) => Number(b.minDiscountPercent || 0) - Number(a.minDiscountPercent || 0))[0];
    const requiredApproval = matchingChain?.steps?.map((step) => step.approverRole).join(" then ")
        || (blendedRisk === "LOW" ? "None" : "Configured approval chain required");

    return {
        items: evaluatedItems,
        subtotal,
        totalDiscount,
        taxAmount,
        totalAmount: netRevenue + taxAmount,
        totalNetRevenue: netRevenue,
        overallMargin,
        blendedRisk,
        requiredApproval,
        totalViolationPoints,
        maxSingleViolation
    };
};