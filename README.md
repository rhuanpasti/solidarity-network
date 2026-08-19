# Solidarity Network

Solidarity Network is an open-source full-stack starter for organizations that coordinate charity programs, administrators, beneficiaries, benefits, and benefit deliveries.

It provides a practical operational workspace that can be forked and adapted to a nonprofit, community initiative, or other social-impact program. The domain model, workflows, visual identity, integrations, deployment model, and policies are intentionally customizable.

In Portuguese, the interface uses the institutional name **Rede Solidaria**.

## Project status and production guidance

This repository is a working application and a reusable foundation, not a turnkey compliance solution. Review the authorization rules, privacy requirements, retention policies, infrastructure, and operational processes before using it with real personal data.

The application includes username/email authentication, password hashing, protected sessions, password recovery, first-access password changes, rate limiting, and role-based authorization. For a production deployment, consider replacing or integrating the built-in authentication with a dedicated identity provider that supports the account protection, MFA, auditability, and recovery requirements of your organization.

## What it includes

- An administrator workspace for programs, administrators, beneficiaries, benefits, and deliveries.
- A beneficiary portal for linked programs, household dependents, upcoming deliveries, and delivery history.
- Role-aware access for super administrators, program managers, and case workers.
- Runtime English and Portuguese translations.
- Postal-code address lookup for Brazilian beneficiary addresses.
- Temporary access credentials, first-access password changes, password reset emails, and delivery notifications through optional Brevo integration.
- Audit trails, entity version snapshots, request IDs, structured logging, and normalized API errors.
- OpenAPI/Swagger documentation during non-production backend runs.

## Accounts, roles, and authorization

The system has two account types: `administrator` and `beneficiary`. Administrator accounts have one of three roles. The frontend displays administrator accounts with the generic `Admin` label, but the permission role remains unchanged in the database and API.

| Account or role | Access scope | Allowed | Blocked |
| --- | --- | --- | --- |
| `super_admin` | Global | Full administrator workspace access; create and manage charity programs, administrators, beneficiaries, benefits, and deliveries; assign programs and roles; view all records | The protected root administrator account cannot be modified or removed through the administrator workflow |
| `program_manager` | Assigned charity programs only | View and update assigned programs; manage beneficiaries and deliveries within the assigned program scope; manage the shared benefit catalog; view administrators visible within that scope | Creating programs, creating or editing administrators, resending administrator access, changing roles, and accessing other programs |
| `case_worker` | No operational route access currently granted | Authenticate, maintain the account session, and complete a required password change | Administrator workspace, program management, beneficiary records, benefits, deliveries, and the beneficiary portal |
| `beneficiary` | Own beneficiary account | Read-only beneficiary portal with linked programs, dependents, upcoming deliveries, and delivery history; password and session management | Administrator workspace and all administrator CRUD or delivery-management endpoints |
| Unauthenticated visitor | Public endpoints only | Login, password recovery/reset, and public login metrics | All protected application and API resources |

Authorization is enforced in the backend API; hidden frontend navigation is only a usability feature and is not the security boundary. Requests from an authenticated account with the wrong account type or role receive `403 Forbidden`, while requests without valid authentication receive `401 Unauthorized`.

Additional access rules:

- Non-super administrators are restricted to records associated with their assigned charity programs.
- A beneficiary can access only their own portal summary; the portal does not expose administrator CRUD operations.
- Accounts created with a temporary password must complete the first-access password change before accessing protected operational resources.
- The system root administrator is immutable through the administrator management workflow.

## Technology

- `Angular 21` with standalone components, Signals, typed reactive forms, lazy routes, and runtime i18n.
- `NestJS 11` with controllers, services, repositories, DTO validation, authorization guards, and global error handling.
- `Prisma 6` with `PostgreSQL 16`.
- `TypeScript 5.9` across the stack.
- `Docker Compose` for local PostgreSQL and containerized application runs.
- `npm workspaces` for the monorepo.

## Repository structure

```text
solidarity-network/
|- apps/
|  |- backend/       NestJS API and Prisma schema
|  \- frontend/      Angular application
|- packages/
|  \- shared/        Shared enums, contracts, and view models
|- docs/
|  \- observability.md
|- docker-compose.yml
\- README.md
```

## Architecture

### Backend

- `src/common`: global filters, interceptors, DTO helpers, and validation.
- `src/config`: environment parsing and validation.
- `src/prisma`: Prisma client module.
- `src/modules/auth`: authentication, sessions, password changes, and recovery.
- `src/modules/authorization`: account and role policies.
- `src/modules/observability`: request tracing, structured logs, audit trails, and entity versions.
- `src/modules/*`: domain modules organized around controllers, services, and repositories.

### Frontend

- `src/app/core`: application shell, auth, HTTP configuration, layout, i18n, and interceptors.
- `src/app/shared`: reusable UI components, utilities, and types.
- `src/app/features`: lazy-loaded pages for each operational area.
- Standalone components, Signals for local state, and typed reactive forms.

New UI work should use the repository's shared components and Tailwind utilities where available. Keep component-specific styling limited to cases that shared utilities cannot express.

### Shared package

The shared package contains domain enums, API contracts, pagination types, filters, and view models consumed by both applications.

## Main features

### Charity programs

- Create, update, list, view, activate, and deactivate programs.
- Link administrators and beneficiaries through many-to-many relationships.

### Administrators

- Create, update, list, and view administrators.
- Assign roles and program access.
- Resend temporary access credentials.

### Beneficiaries

- Create, update, list, and view beneficiary records.
- Filter by program, status, and name.
- Store optional email, address, notes, and dependents.
- Look up Brazilian addresses by postal code.

### Benefits and deliveries

- Create, update, list, view, activate, and deactivate benefits.
- Register deliveries with beneficiary, program, benefit, quantity, date, notes, and a unique reference.
- Review delivery history and filter by beneficiary or program.

### Beneficiary portal

Beneficiaries can sign in through the same protected entry point and view their linked programs, dependents, upcoming deliveries, and past deliveries.

## Data model

Core entities:

- `CharityProgram`
- `Administrator`
- `AuthCredential`
- `Beneficiary`
- `BeneficiaryDependent`
- `Benefit`
- `BenefitDelivery`

Supporting entities:

- `AdministratorProgramLink`
- `BeneficiaryProgramLink`
- `AuditTrail`
- `EntityVersion`

Addresses are stored as structured JSON on beneficiary records. Statuses, roles, dependent relationships, and benefit categories use typed enums.

## API summary

The API uses the `/api/v1` global prefix. In development, interactive Swagger documentation is available at `http://localhost:3000/docs`.

### Authentication

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`

Sessions are issued as an HTTP-only cookie. The API also accepts a bearer token for documented API clients.

### Public

- `GET /api/v1/public/login-metrics`

### Charity programs

- `GET|POST /api/v1/charity-programs`
- `GET|PATCH /api/v1/charity-programs/:id`
- `PATCH /api/v1/charity-programs/:id/status`

### Administrators

- `GET|POST /api/v1/administrators`
- `GET|PATCH /api/v1/administrators/:id`
- `POST /api/v1/administrators/:id/resend-access`

### Beneficiaries

- `GET|POST /api/v1/beneficiaries`
- `GET|PATCH /api/v1/beneficiaries/:id`
- `GET /api/v1/beneficiaries/address-lookup`

### Beneficiary portal

- `GET /api/v1/beneficiary-portal/me`

### Benefits

- `GET|POST /api/v1/benefits`
- `GET|PATCH /api/v1/benefits/:id`
- `PATCH /api/v1/benefits/:id/status`

### Benefit deliveries

- `GET|POST /api/v1/benefit-deliveries`
- `GET /api/v1/benefit-deliveries/:id`

## Local development

### Prerequisites

- Node.js 24 or a compatible current Node.js release.
- npm.
- Docker Desktop or another Docker Engine with Compose support.

### 1. Install dependencies and configure the database

From the repository root:

```bash
npm install --workspaces
```

Create a root `.env` from `.env.example`, replace `POSTGRES_PASSWORD` and `JWT_SECRET` with strong values, and start PostgreSQL:

```bash
docker compose up -d postgres
```

Then create `apps/backend/.env` from `apps/backend/.env.example` and set its `DATABASE_URL` to match the local PostgreSQL credentials. The backend environment must contain a `JWT_SECRET` with at least 32 characters.

### 2. Prepare and seed the backend

```bash
npm --prefix apps/backend run prisma:generate
npm --prefix apps/backend run prisma:migrate
npm run seed:backend
```

The seed always creates demo data. It creates an administrator login only when both `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` are set in `apps/backend/.env`; there is no default password.

For macOS/Linux, the helper script can prepare the database before starting the API:

```bash
./scripts/dev-backend.sh --prepare-db
```

### 3. Start the applications

From the repository root, in separate terminals:

```bash
npm run start:backend
npm run start:frontend
```

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs` (development only)

The frontend's local API URL is configured in `apps/frontend/src/environments/environment.ts`.

### Docker Compose full stack

After configuring the root `.env`, start PostgreSQL, the backend, and the frontend together with:

```bash
docker compose up --build
```

The Compose backend applies migrations on startup. It does not run the seed automatically.

## Useful commands

```bash
npm run build
npm run lint
npm test
```

Frontend deployment commands are available for Firebase Hosting and Cloudflare Workers:

```bash
npm --prefix apps/frontend run deploy:firebase
npm run deploy:frontend:workers
```

## Transactional email

Brevo email delivery is disabled by default for development and tests. To enable password recovery, temporary-password messages, and delivery notifications, configure:

- `BREVO_ENABLED=true`
- `BREVO_API_KEY=<brevo-api-key>`
- `BREVO_FROM_EMAIL=<verified-sender-email>`
- `BREVO_FROM_NAME=<sender-name>`
- `APP_PUBLIC_URL=<frontend-origin>`

Optional: `PASSWORD_RESET_PATH=/reset-password`.

Never commit Brevo credentials. Treat credentials shared in chat, tickets, or logs as compromised and rotate them before production use. The sender address must be verified in Brevo; domain authentication is recommended for deliverability.

## Internationalization

Runtime translations are stored in:

- `apps/frontend/public/assets/i18n/en.json`
- `apps/frontend/public/assets/i18n/pt-br.json`

English is the default locale. Portuguese uses the institutional label `Rede Solidaria`.

## Observability

The backend adds request IDs, structured request logs, audit events, and entity-version snapshots. See [docs/observability.md](docs/observability.md) for event fields, error behavior, and operational guidance.

## Deployment and security checklist

- Do not commit secrets or use placeholder credentials in production.
- Set a unique `JWT_SECRET` with at least 32 characters.
- Restrict `CORS_ORIGIN` to the deployed frontend origins.
- Keep Swagger disabled in production; it is disabled automatically when `NODE_ENV=production`.
- Configure `APP_PUBLIC_URL` and Brevo sender settings when email is enabled.
- Provision bootstrap administrator credentials explicitly through `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD`, then rotate or replace them according to your operational policy.
- Review the authorization and privacy model before exposing real beneficiary data.

## License

This project is distributed under the license in [LICENSE](LICENSE).
