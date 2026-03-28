# Solidarity Network

Solidarity Network is a production-oriented full stack platform for managing charity programs, administrators, beneficiaries, benefits, and benefit deliveries.

Em portugues, a interface exibe o nome institucional **Rede Solidaria**.

## Why NestJS + Angular 21

This solution uses:

- `Angular 21` for a strongly typed frontend with standalone components, Signals, reactive forms, route-based feature separation, and runtime i18n.
- `NestJS` for a layered Node.js backend with controllers, services, repositories, DTO validation, and standardized error handling.
- `Prisma + PostgreSQL` for a typed relational model with safe schema evolution and a free-tier friendly deployment path.

NestJS was preferred over raw Express because the project needs consistent architecture, scalable module boundaries, validation, interceptors, and future authorization support without hand-rolling cross-cutting concerns.

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

## Local Development

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd apps/backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Or from the repository root:

```bash
./scripts/dev-backend.sh --prepare-db
```

### 3. Frontend

```bash
cd apps/frontend
npm install
npm run start
```

Or from the repository root:

```bash
./scripts/dev-frontend.sh
```

Update `src/environments/environment.ts` when you need a different API URL locally.

## Internationalization

The frontend ships with runtime i18n files:

- `apps/frontend/public/assets/i18n/en.json`
- `apps/frontend/public/assets/i18n/pt-br.json`

Default locale is English. Portuguese displays institutional labels as `Rede Solidaria`.

## Database Defaults

The default local PostgreSQL configuration in this repository is now:

- database: `solidarity`
- user: `postgres`
- password: `admin`
- connection string: `postgresql://postgres:admin@localhost:5432/solidarity?schema=public`

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
