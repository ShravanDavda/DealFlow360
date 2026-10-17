# DealFlow360

### Sales Operations & Deal Management Platform

DealFlow360 is a full-stack sales operations platform designed to centralize deal management, user workflows, and role-based business operations in a single application.

The project is built with a modern React frontend and a Node.js/Express backend backed by PostgreSQL, with authentication (Email/Password, Google OAuth 2.0, and Password Recovery via Email OTP) and API-driven communication between the client and server.

> **Built for:** Odoo Hackathon 2026
> **Project Type:** Full-Stack Web Application

---

## Customer Activation & Password Recovery Email

Customer activation tokens and password reset OTPs are generated securely by the backend, stored only as hashes, and expire automatically. Configure email delivery with these backend environment variables:

```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@dealflow360.com
BREVO_SENDER_NAME=DealFlow360
```

When email delivery is not configured or fails, the Admin still receives the raw token from the Admin-only customer activation response and the UI clearly reports that email delivery failed.
---

## Overview

Sales teams often work across disconnected tools for managing deals, tracking business activity, coordinating different roles, and accessing operational information.

**DealFlow360** brings these workflows into one platform with a role-oriented architecture and a dedicated backend API.

The application follows a client-server architecture:

```text
┌──────────────────────────────┐
│        React Frontend        │
│                              │
│ React • Vite • Tailwind CSS  │
│ React Router • Axios         │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       Node.js Backend        │
│                              │
│ Express • JWT • bcrypt       │
│ Authentication & Business    │
│ Logic                        │
└──────────────┬───────────────┘
               │
               │ PostgreSQL
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
│                              │
│ Relational Data & Persistence│
└──────────────────────────────┘
```

---

## Key Highlights

- Full-stack React + Node.js application
- REST API based frontend-backend communication
- PostgreSQL relational database
- JWT-based authentication
- Password hashing with bcrypt
- Role-oriented application workflows
- Responsive React interface
- Client-side routing with React Router
- Axios-based API integration
- Tailwind CSS based UI
- Modular frontend and backend separation

---

## User Roles

DealFlow360 is designed around role-specific business workflows.

The platform supports:

- **Admin**
- **Sales Representative**
- **Manager**
- **Finance Manager**

Each role can interact with the application according to its responsibilities and permissions.

This role-oriented structure allows business workflows to be separated while keeping the underlying platform centralized.

---

## Core Architecture

DealFlow360 follows a conventional three-layer web application architecture:

### Frontend

The frontend is built with React and Vite.

Responsibilities include:

- User interface
- Client-side routing
- Form handling
- API communication
- Application state
- Role-based views
- Responsive UI

### Backend

The backend is implemented using Node.js and Express.

Responsibilities include:

- HTTP request handling
- REST API endpoints
- Authentication
- Authorization logic
- Business logic
- Database interaction
- Error handling

### Database

PostgreSQL provides persistent relational storage for application data.

The backend communicates with PostgreSQL using the Node.js `pg` driver.

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI development |
| Vite | Frontend tooling and development server |
| React Router | Client-side routing |
| Axios | HTTP/API communication |
| Tailwind CSS | Styling |
| Lucide React | UI icons |
| jsPDF | PDF generation |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Server-side JavaScript runtime |
| Express 5 | REST API framework |
| JSON Web Tokens | Authentication |
| bcrypt | Password hashing |
| CORS | Cross-origin request handling |
| dotenv | Environment configuration |

### Database

| Technology | Purpose |
|---|---|
| PostgreSQL | Relational database |
| `pg` | PostgreSQL client for Node.js |

### Development

- Git
- GitHub
- npm
- VS Code

---

## Project Structure

```text
DealFlow360/
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
├── DealFlow360_Admin_Configuration_Copilot_Prompt.md
├── svgdealflow360_test_report.md
└── README.md
```

The frontend and backend are maintained as separate applications, allowing each layer to be developed, tested, and deployed independently.

---

## Authentication

DealFlow360 uses token-based authentication.

The authentication flow follows the general pattern:

```text
User
  │
  │ Login credentials
  ▼
React Frontend
  │
  │ HTTP request
  ▼
Express API
  │
  ├── Validate credentials
  ├── Verify password
  └── Generate JWT
  │
  ▼
Authenticated Session
```

Passwords are protected using **bcrypt**, while authenticated requests use **JSON Web Tokens (JWT)**.

---

## API-Driven Architecture

The frontend communicates with the backend through HTTP APIs.

```text
React UI
   │
   │ Axios
   ▼
Express REST API
   │
   ├── Authentication
   ├── Business Logic
   └── Data Access
   │
   ▼
PostgreSQL
```

This separation keeps presentation logic independent from backend business logic and database operations.

---

## Local Development

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ShravanDavda/DealFlow360.git

cd DealFlow360
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create the required environment configuration:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
npm run dev
```

The backend uses Node.js with Express and connects to PostgreSQL.

### 3. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will provide the local development URL.

---

## Environment Variables

Sensitive configuration should never be committed to the repository.

Use environment variables for values such as:

```env
DATABASE_URL=
JWT_SECRET=
PORT=
```

For production deployments, configure these variables through the hosting platform rather than committing secrets to Git.

---

## Engineering Decisions

### Why React?

React provides a component-based architecture that makes it easier to build reusable UI elements and role-specific application views.

### Why Express?

Express provides a lightweight backend framework for building REST APIs and organizing server-side business logic.

### Why PostgreSQL?

DealFlow360 uses a relational database because sales and operational workflows naturally involve structured entities and relationships.

### Why JWT?

JWT provides a stateless mechanism for carrying authenticated user information between the client and API.

### Why bcrypt?

Passwords should never be stored as plain text. bcrypt provides password hashing before credentials are persisted.

---

## Security Considerations

The application incorporates several basic security practices:

- Password hashing with bcrypt
- JWT-based authentication
- Environment-based secret configuration
- CORS configuration
- Separation of frontend and backend
- Database credentials kept outside source code

> Production deployments should additionally use HTTPS, strong secret management, request validation, rate limiting, secure cookie/token handling where appropriate, and centralized error handling.

---

## Development Workflow

The repository is organized as a separate frontend/backend codebase to keep responsibilities clear:

```text
Frontend
   ↓
API Contract
   ↓
Backend
   ↓
Database
```

This structure also makes it easier to independently evolve the UI, API layer, and persistence layer.

---

## Screenshots

Add screenshots of the major application workflows here.

### Login

_Add screenshot_

### Dashboard

_Add screenshot_

### Deal Management

_Add screenshot_

### Role-Specific Views

_Add screenshot_

---

## Project Status

**Status:** Hackathon project / actively maintainable

The core application is structured as a full-stack web platform with separate frontend and backend services.

Future improvements can include:

- Automated testing
- API documentation
- Advanced filtering and search
- Pagination
- Audit logging
- Improved observability
- CI/CD automation
- Production deployment
- More granular role and permission management

---

## What This Project Demonstrates

DealFlow360 demonstrates practical experience with:

- Full-stack application development
- React component architecture
- REST API integration
- Node.js and Express backend development
- PostgreSQL database integration
- Authentication
- Password security
- Role-oriented application design
- Frontend/backend separation
- Git-based development workflow

---

## Hackathon

Built as part of **Odoo Hackathon 2026**.

The project was developed under hackathon constraints with a focus on rapidly translating a business workflow into a working full-stack application.

---

## License

This project is intended for educational and hackathon purposes.

---

## Author

**Shravan Davda**

GitHub: [@ShravanDavda](https://github.com/ShravanDavda)
