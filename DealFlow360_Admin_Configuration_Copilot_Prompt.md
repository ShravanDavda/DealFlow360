You are working on the EXISTING DealFlow360 application.

I want you to FINALIZE the Sales Manager role.

IMPORTANT:
The Sales Manager implementation already exists.
DO NOT create duplicate dashboards, pages, APIs, components, or business logic.
Modify/reorganize the EXISTING implementation.

Reuse the existing authentication, JWT, RBAC, quotation, pricing, discount/risk, approval, Deal Health, and reporting systems.

==================================================
FINAL SALES MANAGER NAVIGATION
==================================================

When a user with role:

sales_manager

logs in, show:

Dashboard
Approval Queue
Quotations
Deal Health
Reports
Profile
Logout

DO NOT show:

- Products Management
- Configuration
- User Registrations
- Customer Management
- Price Lists
- Discount Tiers
- Approval Chain Configuration
- Warehouse Management
- Subscription Plan Configuration

IMPORTANT:
"Discount & Approval Rules" is ADMIN configuration.
REMOVE it from the Sales Manager navigation.

Do NOT delete the underlying discount/approval rules functionality because the approval engine still uses it.

==================================================
1. SALES MANAGER DASHBOARD
==================================================

Use the existing Admin/Sales Rep dashboard design language, but create a Sales Manager-specific dashboard.

Header:

Sales Manager Dashboard

Subtitle:

Monitor team quotations, approvals, deal health and sales performance.

--------------------------------------------------
KPI CARDS
--------------------------------------------------

Display real data:

1. Pending Approvals
2. Team Open Quotations
3. At-Risk Deals
4. Team Approved Quotations

Use REAL backend data.

Do NOT hardcode numbers.

--------------------------------------------------
APPROVAL OVERVIEW
--------------------------------------------------

Show:

Pending
Approved
Returned

These should represent quotation approval activity relevant to the Sales Manager.

Add:

Review Approval Queue

which opens:

Approval Queue

--------------------------------------------------
TEAM SALES PIPELINE
--------------------------------------------------

Show a summary of the sales team's quotation pipeline:

Draft
Pending Approval
Approved
Negotiation
Confirmed

This is TEAM data, not only the Sales Manager's own quotations.

--------------------------------------------------
RECENT TEAM QUOTATIONS
--------------------------------------------------

Show recent quotations from Sales Representatives under the Sales Manager.

Fields:

Quotation
Sales Rep
Customer
Amount
Status
Risk

Clicking a quotation opens the existing quotation detail page.

--------------------------------------------------
DEAL HEALTH SUMMARY
--------------------------------------------------

Show a compact summary:

Stalled Deals
Discount Anomalies
Delivery Slippage

Add:

View Deal Health

which opens the existing Deal Health page.

Do NOT create a second Deal Health implementation.

--------------------------------------------------
TEAM SALES ACTIVITY
--------------------------------------------------

Show useful existing team metrics such as:

Quotes Created
Quotes Approved
Average Approval Time
Top Sales Rep

Only use metrics supported by the existing backend/data.

Do NOT fabricate metrics.

--------------------------------------------------
QUICK ACTIONS
--------------------------------------------------

Provide:

Review Approval Queue
View Quotations
View Deal Health
View Reports

==================================================
2. APPROVAL QUEUE — SEPARATE PAGE
==================================================

Approval Queue must be a separate top-level page.

Purpose:

Allow Sales Manager to review quotations requiring Sales Manager approval.

Show REAL pending approval requests.

Each approval item should show:

Quotation Number
Sales Representative
Customer
Amount
Risk Rating
Discount Information
Current Approval Step
Submitted Date

Clicking an item opens the existing Approval Detail page.

==================================================
3. APPROVAL DETAIL
==================================================

Reuse the existing Approval Detail page.

Sales Manager must be able to:

- Review quotation
- See customer tier
- See blended risk
- See discount violations
- See affected quotation lines
- See approval workflow
- See audit trail
- Approve
- Reject
- Return for Revision

Do NOT create a new approval system.

Use the existing Approval Engine.

==================================================
4. APPROVAL WORKFLOW
==================================================

The Sales Manager should only be able to act when the current approval step belongs to Sales Manager.

Example:

HIGH RISK

Sales Manager
      ↓
Approve
      ↓
Finance
      ↓
Approve
      ↓
Approved

If the current step is Finance:

Sales Manager must NOT be able to approve it.

Backend authorization must enforce this.

Do NOT rely only on hiding buttons.

==================================================
5. QUOTATIONS PAGE
==================================================

Quotations is a separate top-level page.

IMPORTANT:

Unlike Sales Representative:

Sales Manager should see the quotations relevant to their SALES TEAM.

Do NOT limit the Sales Manager to only their own quotations.

Use the existing organizational/team relationship if one already exists.

Do NOT invent a new team structure if the database already has an existing relationship.

--------------------------------------------------
QUOTATION VIEWS
--------------------------------------------------

Preserve existing Board/Table functionality.

Possible statuses:

Draft
Pending Approval
Approved
Negotiation
Confirmed

Use the existing quotation statuses.

--------------------------------------------------
QUOTATION INFORMATION
--------------------------------------------------

Show:

Quotation
Sales Representative
Customer
Amount
Status
Risk
Updated

Click → existing quotation detail/builder.

==================================================
6. DEAL HEALTH
==================================================

Deal Health belongs to Sales Manager.

KEEP the existing Deal Health feature.

Sales Manager should be able to view:

- Stalled deals
- Discount anomalies
- Delivery slippage
- At-risk deals
- Relevant deal/quotation information
- Existing nudges/escalation functionality

Do NOT create another Deal Health engine.

Use the existing Deal Health backend/API.

==================================================
7. REPORTS
==================================================

Sales Manager can access the existing Reports functionality where it supports sales/team oversight.

Do NOT expose Admin configuration functionality through Reports.

Use existing reports.

Do not create a new reporting engine.

==================================================
8. DISCOUNT & APPROVAL RULES
==================================================

REMOVE this from Sales Manager navigation:

Discount & Approval Rules

Sales Manager can VIEW the discount/risk information attached to quotations.

Sales Manager must NOT configure:

- Discount tiers
- Discount rules
- Customer tier ceilings
- Category discount ceilings
- Approval chains
- Approval thresholds

Those remain Admin configuration responsibilities.

==================================================
9. CUSTOMER ACCESS
==================================================

Sales Manager may VIEW customer information associated with quotations.

Sales Manager must NOT create/edit/delete customer master records.

Customer management remains Admin-only.

==================================================
10. PRODUCT ACCESS
==================================================

Sales Manager may VIEW products through quotation/review workflows.

Sales Manager must NOT:

- Create products
- Edit products
- Delete products
- Configure product catalog

Product management remains Admin functionality.

==================================================
11. WAREHOUSE / FULFILLMENT
==================================================

Sales Manager can view relevant fulfillment/deal progress if already supported.

Sales Manager must NOT manage:

- Warehouse configuration
- Inventory configuration
- Warehouse allocation
- Shipping weights
- Fulfillment overrides

Those belong to Admin/Finance/Operations.

==================================================
12. SALES MANAGER DATA SCOPE
==================================================

CRITICAL:

Sales Manager should see the quotations/deals belonging to the Sales Representatives they are responsible for.

Do NOT simply fetch all quotations.

First inspect the existing database for how Sales Representatives and Sales Managers are related.

If an existing team/manager relationship exists, use it.

If there is currently no such relationship, DO NOT invent a complicated new organization system without first checking the existing architecture.

The backend must enforce data scope.

Do not rely on React filtering.

==================================================
13. APPROVAL SECURITY
==================================================

Only authorized Sales Managers can perform Sales Manager approval actions.

Backend must verify:

- authenticated user
- role = sales_manager
- approval request exists
- approval request is pending
- current approval step belongs to Sales Manager
- request has not already been processed

Use the existing authentication/RBAC middleware.

==================================================
14. DASHBOARD DATA
==================================================

All dashboard metrics must come from real backend/database data.

Do NOT hardcode:

Pending Approvals = 5
At-Risk Deals = 7
Approved = 20

etc.

Use existing dashboard services where possible.

If an existing dashboard endpoint already provides the required data, reuse it.

Only create a new Sales Manager dashboard endpoint if genuinely necessary.

==================================================
15. NO DUPLICATE SYSTEMS
==================================================

Do NOT create:

- another Approval Engine
- another Deal Health engine
- another quotation system
- another reporting engine
- another authentication system
- another RBAC system
- another customer system
- another product system

Reuse existing implementations.

==================================================
16. SALES MANAGER NAVIGATION — FINAL
==================================================

FINAL NAVIGATION MUST BE:

DealFlow360
[SALES MANAGER]

Dashboard
Approval Queue
Quotations
Deal Health
Reports

Profile
Logout

NOT:

Discount & Approval Rules

NOT:

Configuration

==================================================
17. ROLE COMPARISON
==================================================

Ensure the final role separation is:

ADMIN
→ Platform administration/configuration

SALES REPRESENTATIVE
→ Own quotations + own pipeline + upsells + quotation execution

SALES MANAGER
→ Team quotations + approval queue + Deal Health + sales oversight

FINANCE/OPERATIONS
→ Finance approval + fulfillment + billing

Do not mix these responsibilities.

==================================================
18. EXISTING DESIGN
==================================================

Use the existing DealFlow360 design system.

Use:

React
Vite
JavaScript/JSX
Tailwind CSS
shadcn/ui
Lucide React
React Router
Axios

Do NOT use TypeScript.

Do NOT introduce another UI framework.

Make the Sales Manager dashboard visually consistent with the existing Admin/Sales Rep dashboards.

==================================================
19. DO NOT CHANGE OTHER ROLES
==================================================

This task is primarily for Sales Manager.

Do NOT redesign:

- Sales Representative dashboard
- Finance/Operations dashboard
- Customer Portal

The ONLY related change outside Sales Manager is:

Remove "Deal Health" from Admin navigation if it is still present.

Do not delete the Deal Health feature.

==================================================
20. TESTING
==================================================

Test Sales Manager login.

Expected navigation:

Dashboard
Approval Queue
Quotations
Deal Health
Reports
Profile
Logout

Verify:

1. Sales Manager dashboard loads.
2. Dashboard uses real data.
3. Approval Queue shows relevant pending approvals.
4. Sales Manager can open Approval Detail.
5. Sales Manager can Approve.
6. Sales Manager can Reject.
7. Sales Manager can Return for Revision.
8. Sales Manager cannot approve Finance-level requests.
9. Sales Manager can view team quotations.
10. Sales Manager can access Deal Health.
11. Sales Manager can access Reports.
12. Sales Manager cannot access Admin Configuration.
13. Sales Manager cannot configure discount rules.
14. Sales Manager cannot configure approval chains.
15. Sales Manager cannot create customers.
16. Sales Manager cannot manage products.
17. Sales Manager cannot manage warehouses.
18. Sales Manager cannot manage subscription plans.
19. Sales Representative functionality remains unchanged.
20. Admin functionality remains unchanged except Deal Health removal.

==================================================
FINAL REQUIREMENT
==================================================

The Sales Manager is a MANAGEMENT + APPROVAL workspace.

Final structure:

Dashboard
→ Team overview

Approval Queue
→ Review and act on quotation approvals

Quotations
→ View/review team quotations

Deal Health
→ Monitor stalled/risky/problematic deals

Reports
→ Team sales/performance reporting

Profile
→ Account information

Logout
→ Sign out

Do NOT add unnecessary pages or features.
Do NOT duplicate existing functionality.