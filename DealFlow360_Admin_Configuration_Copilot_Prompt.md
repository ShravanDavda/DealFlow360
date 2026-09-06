You are working on the existing DealFlow360 project.

TASK:
Fix the UPSSELL / CROSS-SELL responsibility and quotation workflow inconsistency.

IMPORTANT:
Do NOT redesign the application.
Do NOT create a new upsell/cross-sell system.
Do NOT modify the database schema unless absolutely necessary.
Do NOT add hardcoded/mock business data.
Do NOT change authentication architecture.
Do NOT give Admin unnecessary quotation-editing permissions.

The intended responsibility model is:

ADMIN
→ configures product pairing/recommendation rules

SALES REPRESENTATIVE
→ uses those recommendations while creating/editing a quotation

SALES MANAGER
→ reviews/approves quotations

FINANCE / OPERATIONS
→ handles fulfillment and billing

CUSTOMER
→ negotiates/confirms quotation

==================================================
1. FIRST INSPECT THE EXISTING IMPLEMENTATION
==================================================

Inspect the current implementation of:

- QuotationDetail.jsx
- QuotationBoard / quotation pages
- UpsellSuggestions component
- AdminProductPairings.jsx
- productPairingService.js
- productPairingController.js
- productPairingRoutes.js
- quotation service/controller/routes
- authentication/RBAC
- RoleGuard
- current user/role handling

Trace exactly how:

- product pairings are configured
- recommendations are fetched
- recommendations are displayed
- clicking + adds a product
- quotation changes are saved
- quotation submission works
- quotation ownership/creator checks work

Do not assume the current implementation is correct.

==================================================
2. CORRECT BUSINESS RESPONSIBILITY
==================================================

Implement/maintain this responsibility model:

ADMIN:

Can:
- create product pairings
- edit product pairings
- activate/deactivate product pairings
- configure upsell relationships
- configure cross-sell relationships

Admin should NOT:
- edit another user's quotation
- add products to another user's quotation
- change quotation quantities
- change quotation discounts
- submit another user's quotation
- approve another user's quotation unless the existing Manager role explicitly provides that permission

SALES REPRESENTATIVE:

Can, according to existing permissions:
- create quotation
- edit own quotation
- add products
- use upsell recommendations
- use cross-sell recommendations
- adjust quantity
- apply allowed discount
- save quotation
- submit quotation for approval

SALES MANAGER:

Can:
- review quotations requiring approval
- approve
- reject
- return according to existing workflow

FINANCE / OPERATIONS:

Can:
- perform permitted fulfillment
- warehouse allocation
- backorder processing
- billing/invoice operations

CUSTOMER:

Can:
- view own quotations
- negotiate
- submit counter-offers/questions
- confirm own quotation

==================================================
3. FIX ADMIN QUOTATION DETAIL UI
==================================================

Current problem:

When Admin opens a quotation created by a Sales Representative, the quotation detail page shows:

"Upsell and Cross-Sell Suggestions"

with clickable + buttons.

But the page correctly says:

"Read-only view. Only the quotation creator can edit or submit this quotation."

This is inconsistent.

Fix this.

For a user who is NOT the quotation creator and does NOT have quotation-editing permission:

- quotation remains read-only
- recommendation cards must NOT have active add buttons
- do NOT allow the Admin to add recommendations to the quotation
- do NOT allow local state changes that imply the quotation was modified
- do NOT show Save Draft
- do NOT show Submit for Approval

Instead, either:

A. Hide the interactive recommendation section completely,

OR preferably:

B. Show recommendations as READ-ONLY information without + buttons, with a small explanatory message such as:

"Upsell and cross-sell recommendations are configured by Admin and applied by the Sales Representative while editing a quotation."

Use the existing UI design language.

Do not redesign the page.

==================================================
4. SALES REP QUOTATION FLOW
==================================================

For the quotation creator / authorized Sales Representative, recommendations should remain interactive.

Example:

Existing quotation:

Laptop Pro 14 × 1

Recommendations:

+ Docking Station
+ Wireless Mouse
+ Care Plan 2yr

When Sales Rep clicks:

+ Docking Station

the product should be added to the quotation's working state.

Then:

quantity/price/discount/margin/risk
must be recalculated using existing quotation logic.

The recommendation itself is NOT a separate approval request.

The correct workflow is:

Recommendation
    ↓
Sales Rep accepts
    ↓
Product becomes quotation line
    ↓
Quotation recalculates
    ↓
Sales Rep saves
    ↓
Sales Rep submits quotation
    ↓
Approval workflow if required

Do NOT create a separate:

"Submit Upsell Request"

mechanism.

==================================================
5. SAVE / SUBMIT FLOW
==================================================

Verify that after accepting an upsell/cross-sell recommendation:

Sales Rep can:

1. Add recommended product.
2. See it as a quotation line.
3. See updated subtotal.
4. See updated discount.
5. See updated tax.
6. See updated total.
7. See updated margin.
8. See updated risk.
9. Save Draft.
10. Submit for Approval.

If the new product/discount causes an approval requirement, the normal quotation approval workflow must handle it.

Do not create a separate approval system for upsell/cross-sell.

==================================================
6. DO NOT BYPASS BACKEND AUTHORIZATION
==================================================

The frontend visibility check is NOT sufficient.

Verify backend APIs also enforce:

- Admin cannot modify another user's quotation.
- Non-creators cannot save another user's quotation through direct API calls.
- Non-creators cannot submit another user's quotation.
- Customer cannot modify quotation lines directly.
- Customer can only use the existing negotiation workflow.
- Sales Rep can only modify quotations allowed by existing ownership/permission rules.

If backend authorization is already correct, preserve it.

If there is a gap, fix only that gap.

Never rely solely on hiding a button.

==================================================
7. PRODUCT PAIRING ADMIN FLOW
==================================================

Ensure Admin's actual upsell/cross-sell responsibility remains functional.

Admin should be able to go to:

Configuration
→ Product Pairings

and manage:

- source product
- recommended product
- relationship type
- priority/ranking if supported
- active/inactive state
- other existing pairing fields

These configurations must be stored in PostgreSQL through the existing API.

Do NOT hardcode pairings.

==================================================
8. RECOMMENDATION DATA
==================================================

Recommendations shown to Sales Rep must come from:

PostgreSQL
→ product_pairings
→ backend API
→ frontend

Do not introduce:

const recommendations = [...]
or:

MOCK_RECOMMENDATIONS

or hardcoded product names.

Use existing product pairing endpoints.

==================================================
9. ADMIN QUOTATION VIEW
==================================================

When Admin opens:

Quotation created by Sales Rep

Admin should be able to REVIEW the quotation.

Admin should be able to see:

- customer
- products
- quantities
- pricing
- discount
- margin/risk information according to existing permissions
- quotation status
- approval state
- audit/history where already supported

But Admin should not gain edit/submit controls merely because recommendations are visible.

==================================================
10. IMPORTANT: DO NOT CHANGE ROLE DEFINITIONS
==================================================

Do not introduce a new role.

Do not rename existing roles.

Use the current:

- admin
- sales representative
- sales manager/approver
- finance/operations
- customer

role architecture.

==================================================
11. CHECK ALL QUOTATION DETAIL ENTRY POINTS
==================================================

There may be multiple pages/components that display quotation details.

Search the entire frontend for:

- UpsellSuggestions
- Upsell
- CrossSell
- productPairing
- recommendations
- quotation detail
- add product to quotation

Make sure the same incorrect behavior does not exist elsewhere.

If the same quotation-detail component is reused across roles, implement the permission behavior centrally rather than duplicating logic.

==================================================
12. PRESERVE EXISTING UI
==================================================

Do not redesign.

Do not change:

- navigation
- colors
- layout
- typography
- existing cards
- existing dashboard structure

Only change:

- visibility
- interaction permissions
- explanatory text
- quotation editing behavior where required

==================================================
13. TEST CASES
==================================================

Test at minimum:

TEST 1 — ADMIN

Login as Admin.

Open a Sales Rep quotation.

Expected:

- quotation visible
- quotation is read-only
- no editable quantity controls
- no editable discount controls
- no Save Draft
- no Submit for Approval
- upsell/cross-sell recommendations are read-only OR hidden
- Admin cannot add recommended products

Also attempt direct API modification.

Expected:
403/appropriate authorization failure.

--------------------------------------------------

TEST 2 — SALES REP

Login as Sales Rep who owns quotation.

Open own quotation.

Expected:

- recommendations visible
- + buttons available
- click + on recommendation
- product added to working quotation
- totals recalculate
- margin/risk recalculate
- Save Draft works
- Submit for Approval works

--------------------------------------------------

TEST 3 — SALES REP SUBMISSION

After adding an upsell/cross-sell product:

Submit quotation.

Expected:

normal quotation submission workflow occurs.

If approval is required:

quotation enters existing approval workflow.

No separate upsell approval request is created.

--------------------------------------------------

TEST 4 — MANAGER

Login as Sales Manager.

Open quotation requiring approval.

Expected:

Manager sees quotation and approval controls according to existing permissions.

Manager does not see Sales Rep-only edit controls.

--------------------------------------------------

TEST 5 — ADMIN PAIRING CONFIGURATION

Login as Admin.

Go to:

Configuration
→ Product Pairings

Create/update/deactivate a pairing.

Then open a Sales Rep quotation containing the source product.

Expected:

recommendation comes from the updated database pairing.

No frontend hardcoded pairing is involved.

==================================================
14. REGRESSION CHECK
==================================================

After the change, verify that these existing features still work:

- Admin Product Pairings
- Sales Rep quotation creation
- Sales Rep quotation editing
- quotation calculation
- discount limit checking
- margin calculation
- risk calculation
- approval routing
- customer negotiation
- customer confirmation
- fulfillment
- billing

Do not modify unrelated functionality.

==================================================
15. FINAL CODE SEARCH
==================================================

Search for:

- MOCK_
- mockRecommendations
- hardcoded product names
- hardcoded pairing data
- hardcoded customer data
- hardcoded quotation data

Do not leave runtime business data hardcoded.

Seed/demo data belongs in PostgreSQL seed.sql.

==================================================
16. ACCEPTANCE CRITERIA
==================================================

The fix is COMPLETE only when:

ADMIN:

Configuration
→ Product Pairings
→ manages recommendation rules

SALES REP:

Quotation
→ sees recommendations
→ clicks +
→ product added
→ quotation recalculates
→ saves
→ submits

MANAGER:

Approval Queue
→ reviews
→ approves/rejects/returns

FINANCE/OPS:

Fulfillment
→ inventory
→ backorder
→ billing

CUSTOMER:

Portal
→ negotiation
→ confirmation

There must be NO situation where:

Admin sees an interactive + recommendation button
BUT
Admin is told the quotation is read-only.

That inconsistency must be eliminated.

==================================================
17. FINAL REPORT
==================================================

Report:

1. Files changed
2. Components changed
3. Backend authorization changes, if any
4. Exact Admin behavior
5. Exact Sales Rep behavior
6. Product pairing behavior
7. Tests performed
8. Test results
9. Any remaining issues

Do NOT claim completion unless all acceptance tests pass.