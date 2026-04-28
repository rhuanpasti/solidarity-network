# Solidarity Network

Solidarity Network is a production-oriented full stack platform for managing charity programs, administrators, beneficiaries, benefits, and benefit deliveries.

This is an open source project intended to serve as a practical starting point for social impact initiatives. If you need a base for a nonprofit, community, charity, or other social project, the idea is simple: fork this repository and adapt it to your reality.

From that point on, you can change anything you consider necessary, including the domain model, user flows, visual identity, integrations, deployment model, and operational rules.

Em portugues, a interface exibe o nome institucional **Rede Solidaria**.

## Open Source Usage Recommendation

The recommended workflow is to fork this project instead of treating it as a closed template. A fork gives you freedom to evolve the codebase according to your organization, region, policies, and service model while preserving the original structure as a reliable starting point.

## Security Recommendation

I strongly recommend using a dedicated authentication provider or identity service for user authentication instead of building and maintaining the full authentication flow yourself. This usually brings better security, more mature account protection features, and a lower long-term maintenance burden for the application.

Examples include managed identity providers, external OAuth/OIDC providers, or any equivalent service that offers secure session management, password policies, multi-factor authentication, auditability, and recovery flows.

## Technical Overview

This solution uses:

- `Angular 21` for a strongly typed frontend with standalone components, Signals, reactive forms, route-based feature separation, and runtime i18n.
- `NestJS` for a layered Node.js backend with controllers, services, repositories, DTO validation, and standardized error handling.
- `Prisma + PostgreSQL` for a typed relational model with safe schema evolution and a free-tier friendly deployment path.

NestJS was preferred over raw Express because the project needs consistent architecture, scalable module boundaries, validation, interceptors, and future authorization support without hand-rolling cross-cutting concerns.

## Technical Patterns And Technologies

This repository follows a full stack monorepo approach with clear separation of concerns across frontend, backend, and shared contracts.

Main technologies:

- `Angular 21` for the frontend application
- `NestJS` for the backend API
- `TypeScript` across the stack
- `Prisma` as the ORM
- `PostgreSQL` as the relational database
- `Docker Compose` for local infrastructure support
- `npm workspaces` for monorepo dependency management

Main patterns:

- monorepo organization with isolated applications and shared packages
- layered backend architecture with `controller -> service -> repository`
- DTO-based request validation and consistent API contracts
- reusable shared types and domain contracts across applications
- feature-oriented frontend structure for route and page isolation
- standalone Angular components to reduce module overhead
- Angular Signals for localized reactive state
- reactive forms with strong typing
- centralized error normalization and interceptor-based cross-cutting behavior
- environment-driven configuration for local and deployable setups

## Monorepo Structure

```text
solidarity-network/
|- apps/
|  |- backend/
|  \- frontend/
|- packages/
|  \- shared/
|- docker-compose.yml
\- README.md
```

## Architecture

### Backend

- `src/common`: global filters, interceptors, DTO helpers, and environment validation
- `src/prisma`: Prisma client module
- `src/modules/*`: feature modules with `controller -> service -> repository`
- DTOs are validated with `class-validator`
- API errors are normalized through a global exception filter

### Frontend

- `src/app/core`: application shell, HTTP config, layout, i18n, interceptors
- `src/app/shared`: reusable UI building blocks, utilities, and types
- `src/app/features`: isolated feature routes and pages
- standalone components throughout
- Angular Signals for local UI state and loading feedback
- reactive forms with strong typing

### Shared Package

- shared enums
- domain view models
- pagination contracts
- filter contracts

## Main Features

### Charity Programs

- create, update, list, details
- activate and deactivate

### Administrators

- create, update, list, details
- program linking through a many-to-many relationship

### Beneficiaries

- create, update, list, details
- filters by program, status, and name

### Benefits

- create, update, list, details
- activate and deactivate

### Benefit Deliveries

- register deliveries
- list history
- filter by beneficiary and program
- notes and delivery reference tracking

## Data Model

Core entities:

- `CharityProgram`
- `Administrator`
- `Beneficiary`
- `Benefit`
- `BenefitDelivery`

Supporting concepts:

- `AdministratorProgramLink`
- `Address`
- typed enums for statuses, roles, and categories

## API Summary

### Charity Programs

- `GET /api/v1/charity-programs`
- `POST /api/v1/charity-programs`
- `GET /api/v1/charity-programs/:id`
- `PATCH /api/v1/charity-programs/:id`
- `PATCH /api/v1/charity-programs/:id/status`

### Administrators

- `GET /api/v1/administrators`
- `POST /api/v1/administrators`
- `GET /api/v1/administrators/:id`
- `PATCH /api/v1/administrators/:id`

### Beneficiaries

- `GET /api/v1/beneficiaries`
- `POST /api/v1/beneficiaries`
- `GET /api/v1/beneficiaries/:id`
- `PATCH /api/v1/beneficiaries/:id`

### Benefits

- `GET /api/v1/benefits`
- `POST /api/v1/benefits`
- `GET /api/v1/benefits/:id`
- `PATCH /api/v1/benefits/:id`
- `PATCH /api/v1/benefits/:id/status`

### Benefit Deliveries

- `GET /api/v1/benefit-deliveries`
- `POST /api/v1/benefit-deliveries`
- `GET /api/v1/benefit-deliveries/:id`

## Free Deployment Path

This codebase is designed to be deployable without paid infrastructure:

- Angular frontend can be deployed as static assets on a free static hosting platform.
- NestJS backend can be deployed as a Dockerized Node service on a free container/serverless offering, subject to the provider's current free-tier limits.
- PostgreSQL can be provisioned on a free hosted Postgres provider or started locally through `docker-compose`.

The repository includes Docker support and environment templates so local development does not depend on paid tooling.

For production-like environments:

- do not use hardcoded secrets from source control
- set `JWT_SECRET` to a unique value with at least 32 characters
- set `SENDPULSE_API_USER_ID` and `SENDPULSE_API_SECRET` only through
  environment configuration when email sending is enabled
- keep Swagger disabled in production
- create bootstrap administrator credentials explicitly through seed environment variables

## Transactional Email

The backend supports SendPulse SMTP API delivery for password recovery,
temporary passwords, and delivery notifications. Email sending is disabled by
default for development and tests.

Required production variables:

- `SENDPULSE_ENABLED=true`
- `SENDPULSE_API_USER_ID=<sendpulse-api-user-id>`
- `SENDPULSE_API_SECRET=<rotated-sendpulse-api-secret>`
- `SENDPULSE_FROM_EMAIL=<verified-sender-email>`
- `SENDPULSE_FROM_NAME=<sender-name>`
- `APP_PUBLIC_URL=<frontend-origin>`

Optional variables:

- `SENDPULSE_TOKEN_STORAGE=.sendpulse-tokens`
- `PASSWORD_RESET_PATH=/reset-password`

Never commit SendPulse credentials. Any credential shared in chat, tickets, or
logs should be treated as compromised and rotated before production use.

## Local Development

### 1. Start PostgreSQL

Create a root `.env` from `.env.example` before using Docker Compose.

```bash
docker compose up -d postgres
```

### 2. Run From The Repository Root

Quick commands to start each application without changing directories:

```bash
npm install --workspaces
npm run start:backend
npm run start:frontend
```

- backend: `http://localhost:3000`
- frontend: `http://localhost:4200`

You can also use the helper scripts from the repository root:

```bash
./scripts/dev-backend.sh --prepare-db
./scripts/dev-frontend.sh
```

### 3. Backend

```bash
cd apps/backend
cp .env.example .env
npm install
npm run prisma:generate
export SEED_ADMIN_USERNAME=your-admin-user
export SEED_ADMIN_PASSWORD=your-strong-password
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### 4. Frontend

```bash
cd apps/frontend
npm install
npm run start
```

Update `src/environments/environment.ts` when you need a different API URL locally.

The backend seed no longer creates a default login automatically. To provision an administrator credential, set `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` explicitly before running the seed.

## Internationalization

The frontend ships with runtime i18n files:

- `apps/frontend/public/assets/i18n/en.json`
- `apps/frontend/public/assets/i18n/pt-br.json`

Default locale is English. Portuguese displays institutional labels as `Rede Solidaria`.

## Database Defaults

Example local PostgreSQL configuration:

- database: `solidarity`
- user: `postgres`
- password: set your own strong value in the root `.env`
- connection string: `postgresql://postgres:<your-password>@localhost:5432/solidarity?schema=public`

## Deliverables Included

- project architecture
- folder structure
- Prisma database schema
- REST API endpoints
- typed DTOs
- Angular routes and pages
- Docker support
- seed data
- README instructions
