import { resolveQuotationLines } from "./pricingService.js";

export const matchesDiscountRange = (chain, val) => {
    const min = Number(chain.minDiscountPercent ?? chain.min_discount_percent ?? 0);
    const rawMax = chain.maxDiscountPercent ?? chain.max_discount_percent;
    const max = rawMax !== null && rawMax !== undefined && rawMax !== "" ? Number(rawMax) : null;
    if (min === 0) {
        if (val < 0) return false;
        if (max !== null && val > max) return false;
        return true;
    }
    if (val <= min) return false;
    if (max !== null && val > max) return false;
    return true;
};

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
        const allowedDiscount = applicableCeilings.length > 0 ? Math.min(...applicableCeilings) : 0;
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
    const overallDiscountPercent = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
    const maxSingleDiscount = Math.max(0, ...evaluatedItems.map((item) => Number(item.discountGiven || 0)));
    const governanceDiscount = Math.max(maxSingleDiscount, overallDiscountPercent);

    // Extract dynamic policy thresholds from configured approval chains if present
    const activeChains = (approvalChains || []).filter((c) => c.isActive !== false && c.is_active !== false);
    const highChainCandidate = activeChains.find((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "HIGH");
    const medChainCandidate = activeChains.find((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "MEDIUM");
    const highThreshold = highChainCandidate ? Number(highChainCandidate.minDiscountPercent ?? highChainCandidate.min_discount_percent ?? 10) : 10;
    const medThreshold = medChainCandidate ? Number(medChainCandidate.minDiscountPercent ?? medChainCandidate.min_discount_percent ?? 5) : 5;

    // Blended risk evaluates BOTH ceiling violations AND governed discount thresholds:
    // - Severe single line violation (>= 6pt), high cumulative violations (>= 8pt), or discount exceeding high threshold (> 10%) => HIGH
    // - Any ceiling violation, or discount exceeding medium threshold (> 5%) => MEDIUM
    // - Fully within all discount ceilings AND within low threshold (0 - 5%) => LOW
    let blendedRisk = "LOW";
    if (maxSingleViolation >= 6 || totalViolationPoints >= 8 || governanceDiscount > highThreshold) {
        blendedRisk = "HIGH";
    } else if (hasAnyViolation || governanceDiscount > medThreshold) {
        blendedRisk = "MEDIUM";
    }

    let matchingChain = null;
    if (blendedRisk === "HIGH") {
        matchingChain = activeChains
            .filter((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "HIGH" && matchesDiscountRange(c, governanceDiscount))
            .sort((a, b) => Number(b.minDiscountPercent ?? b.min_discount_percent ?? 0) - Number(a.minDiscountPercent ?? a.min_discount_percent ?? 0))[0]
            || activeChains.find((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "HIGH")
            || activeChains.filter((c) => (c.steps || []).length >= 2)[0];
    } else if (blendedRisk === "MEDIUM") {
        matchingChain = activeChains
            .filter((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "MEDIUM" && matchesDiscountRange(c, governanceDiscount))
            .sort((a, b) => Number(b.minDiscountPercent ?? b.min_discount_percent ?? 0) - Number(a.minDiscountPercent ?? a.min_discount_percent ?? 0))[0]
            || activeChains.find((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "MEDIUM")
            || activeChains.filter((c) => (c.steps || []).length === 1)[0];
    } else {
        matchingChain = activeChains.find((c) => String(c.minRisk || c.min_risk || "").toUpperCase() === "LOW" && matchesDiscountRange(c, governanceDiscount))
            || activeChains.find((c) => matchesDiscountRange(c, governanceDiscount) && (c.steps || []).length === 0);
    }

    const requiredApproval = (blendedRisk === "LOW" && !hasAnyViolation && (!matchingChain || (matchingChain.steps || []).length === 0))
        ? "None"
        : (matchingChain?.steps?.length > 0
            ? matchingChain.steps.map((step) => step.approverRole || step.role).join(" then ")
            : (blendedRisk === "HIGH" ? "Sales Manager then Finance" : "Sales Manager"));

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
        maxSingleViolation,
        maxSingleDiscount,
        governanceDiscount,
        hasAnyViolation
    };
};