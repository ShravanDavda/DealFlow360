# DealFlow360

**A Full-Stack Deal Management & Sales Workflow Platform**

DealFlow360 is a full-stack business application designed to manage the complete sales deal lifecycle, from customer and product management to quotation creation, discount governance, approval workflows, negotiation, and fulfillment.

The platform centralizes deal-related operations, enforces role-based access, and provides structured workflows that improve visibility, accountability, and control across sales and finance teams.

Developed as a **hackathon project**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Core Business Workflow](#core-business-workflow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Security](#security)
- [Development Notes](#development-notes)
- [Future Improvements](#future-improvements)

---

## Overview

Managing business deals involves multiple interconnected activities, including maintaining product prices, preparing quotations, evaluating discounts, obtaining approvals, communicating with customers, and fulfilling orders.

DealFlow360 brings these activities into a unified application.

The platform is designed around three principles:

- **Workflow automation:** Reduce unnecessary manual coordination through structured business processes.
- **Role-based access:** Ensure users can access the features and operations appropriate to their roles.
- **Business rule enforcement:** Apply server-side validation to critical operations such as quotation calculations, discount limits, and approval decisions.

## Key Features

### 1. Authentication & User Management
- User authentication and protected application routes.
- Role-based access control.
- Google authentication integration.
- Password recovery functionality.
- Customer account management and activation workflows.

### 2. Customer Management
- Centralized customer information.
- Customer-tier-based discount policies.
- Customer access to relevant deal and negotiation workflows.
- Role-appropriate customer information and actions.

### 3. Product & Pricing Management
- Product catalog management.
- Product pricing and price list management.
- Price list item-level management.
- Category-based discount ceilings.
- Customer-tier discount ceilings.

### 4. Quotation Management
- Create and manage quotations.
- Calculate quotation totals and discounts.
- Evaluate applicable discount ceilings.
- Recalculate critical quotation information on the backend.
- Track quotation status throughout the business workflow.

### 5. Discount Governance & Risk Assessment
- Evaluate discounts against applicable business rules.
- Apply the strictest applicable discount ceiling.
- Assess quotation risk using the application's risk-calculation logic.
- Support configurable discount and risk-based approval policies.

### 6. Configurable Approval Workflows
- Configure approval chains and sequential approval steps.
- Assign approval responsibilities to appropriate roles.
- Support different approval requirements based on configured rules.
- Track pending, completed, and returned approval requests.
- Prevent unauthorized approval actions through backend validation.

### 7. Customer Negotiation
- Support quotation negotiation between sales representatives and customers.
- Enable two-way negotiation communication.
- Track negotiation-related updates.
- Integrate negotiation with the existing quotation workflow.

### 8. Order Fulfillment
- Support fulfillment-related workflows for authorized roles.
- Track relevant fulfillment activities and statuses.
- Maintain separation between sales, finance, and fulfillment responsibilities.

### 9. Dashboards & Operational Visibility
- Role-specific dashboards and navigation.
- Access to relevant sales and operational information.
- Deal-related summaries and workflow visibility according to user permissions.

### 10. Currency Formatting
- Standardized monetary presentation across the user interface.
- Consistent formatting of displayed financial values.

---

## User Roles

DealFlow360 uses role-based permissions to separate responsibilities across the business workflow.

| Role | Primary Responsibilities |
|---|---|
| Admin | Manage users, customers, products, pricing, discount policies, and approval configuration. |
| Sales Representative | Manage sales activities, prepare quotations, and coordinate customer negotiations. |
| Sales Manager | Review and approve quotations requiring managerial approval. |
| Finance / Operator | Perform assigned finance-related operations and handle finance approval steps where authorized. |
| Warehouse / Fulfillment | Perform authorized fulfillment and order-processing activities. |
| Customer | Access permitted customer-facing features, including relevant quotation and negotiation workflows. |

Actual permissions depend on the application's configured role identifiers and backend authorization rules.

---

## Core Business Workflow

A typical deal progresses through the following stages:

1. **Customer and product selection** — The sales representative selects the relevant customer and products.
2. **Quotation preparation** — Quotation line items, prices, quantities, and discounts are entered.
3. **Business rule validation** — The backend recalculates quotation values and evaluates applicable discount limits.
4. **Risk assessment** — The quotation is evaluated using the configured risk-calculation logic.
5. **Approval routing** — The system determines whether the quotation can be approved automatically or requires an approval chain.
6. **Sequential approvals** — Required approvers review the quotation in the configured order.
7. **Customer negotiation** — The sales representative and customer communicate through the supported negotiation workflow.
8. **Order processing and fulfillment** — Authorized users perform the subsequent operations when the workflow permits them.

The exact path depends on quotation risk, configured approval chains, customer interactions, and the application's business rules.

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- JavaScript (ES modules)

### Database
- PostgreSQL

### Authentication & Integrations
- JSON Web Tokens (JWT)
- Google OAuth
- Email-based password recovery

The stack listed above reflects the project's established architecture. Confirm exact package versions and any additional libraries from the repository's package manifests.

---

## Project Structure

The repository contains separate frontend and backend applications.

```text
DealFlow360/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── utils/
│   │   └── ...
│   ├── package.json
│   └── ...
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── ...
│   ├── package.json
│   └── ...
└── README.md
```

*Note: This is a high-level overview. Refer to the actual repository for the complete directory structure.*

---

## Getting Started

### Prerequisites

Install the following before running the application:

- Node.js and npm.
- PostgreSQL.
- Git.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DealFlow360
```

Replace `<repository-url>` with the actual repository URL.

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../backend
npm install
```

### 4. Configure PostgreSQL

Create a PostgreSQL database and configure the backend connection using the environment variables expected by the project.

Apply the project's existing database schema and migrations, if applicable, before starting the application.

Do not assume that starting the backend will create every required table or database function.

### 5. Configure Environment Variables

Create the appropriate local environment files using the project's existing environment variable names and configuration.

See [Environment Configuration](#environment-configuration).

### 6. Start the Application

Start the backend and frontend using the scripts defined in their respective `package.json` files.

See [Running the Application](#running-the-application).

---

## Environment Configuration

The application may require configuration for:

| Configuration | Purpose |
|---|---|
| PostgreSQL connection | Connect the backend to the database. |
| Server port | Configure the backend listening port. |
| JWT secret | Sign and verify authentication tokens. |
| Google OAuth credentials | Enable Google authentication. |
| Frontend application URL | Configure permitted frontend origins and redirects. |
| Email service credentials | Support password recovery and related email workflows. |

Use the exact variable names required by the existing source code and environment configuration files.

**Security guidelines:**
- Never commit `.env` files containing secrets.
- Do not expose backend credentials or JWT secrets in frontend variables.
- Keep OAuth credentials and email-service credentials private.
- Provide a sanitized `.env.example` containing variable names and placeholder values, not real secrets.

---

## Running the Application

Open separate terminals from the repository root.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

Use this command only if the backend package defines a `dev` script. Otherwise, use the existing development or start script.

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite in the terminal.

For production build verification, run:

```bash
cd frontend
npm run build
```

Use the scripts actually defined in each package manifest if they differ from these examples.

---

## Security

DealFlow360 incorporates security measures appropriate to a role-based business application, including:

- Server-side authentication and authorization checks.
- Protected application routes.
- Backend validation of critical business operations.
- Server-side quotation recalculation during submission.
- Approval-stage and approver-role enforcement.
- Environment-based management of sensitive credentials.

Client-side navigation restrictions are not a substitute for backend authorization. Critical business rules must be enforced on the server.

---

## Development Notes

- Keep frontend and backend responsibilities clearly separated.
- Preserve the existing JavaScript and Express architecture when extending the application.
- Use the existing database schema and migration conventions.
- Validate approval and pricing changes against existing business rules.
- Preserve access for other authorized roles when modifying role-specific features.
- Verify changes with the available build and regression checks before release.

## Future Improvements

Potential areas for future development include:

- Expanded automated regression and end-to-end test coverage.
- More detailed audit trails for quotation and approval decisions.
- Enhanced workflow reporting and analytics.
- Improved operational monitoring and error reporting.
- Additional integration and deployment automation.

These are potential enhancements, not claims that the features are currently implemented.

---

## Project Status

DealFlow360 is a hackathon-developed full-stack business application focused on sales deal management, quotation processing, configurable approvals, customer negotiation, and operational workflows.

The repository's current source code and database configuration are the authoritative references for implemented features and supported deployment procedures.

---

**DealFlow360 — Bringing deal management and business workflows together.**
