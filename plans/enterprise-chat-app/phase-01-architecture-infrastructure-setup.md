---
phase: 1
title: "Architecture & Infrastructure Setup"
status: pending
priority: P1
effort: "3d"
dependencies: []
---

# Phase 1: Architecture & Infrastructure Setup

## Overview
Establish the foundational monorepo structure, containerized backing services (PostgreSQL, Redis, MinIO), relational database schema with Prisma ORM, and enterprise authentication with Role-Based Access Control (RBAC).

## Requirements
- **Functional:**
  - User registration, login, logout, and token refresh using secure HTTP-only cookies and JWTs.
  - Multi-tier company hierarchy: Organization -> Departments / Teams -> Users.
  - RBAC roles: `SuperAdmin`, `OrgAdmin`, `DepartmentManager`, `Employee`, `Guest/Contractor`.
  - Profile management: status message, avatar, department assignment, job title.
- **Non-functional:**
  - Strict TypeScript everywhere, monorepo configuration (Turborepo or pnpm workspaces).
  - One-command local environment bootstrapping via `docker-compose up`.
  - Database migrations and automated seeding for demo enterprise departments and users.

## Architecture
- **Schema Entities**:
  - `User`: id, email, passwordHash, fullName, avatarUrl, departmentId, role, status (ONLINE, AWAY, BUSY, OFFLINE), createdAt.
  - `Department`: id, name, description, parentId, managerId.
  - `Role & Permission`: enum or permission table mapping actions (e.g. `CREATE_PUBLIC_CHANNEL`, `DELETE_ANY_MESSAGE`, `EXPORT_AUDIT_LOG`).
  - `Session`: id, userId, refreshTokenHash, userAgent, ipAddress, expiresAt.

## Related Code Files
- Create:
  - `docker-compose.yml` (PostgreSQL, Redis, MinIO)
  - `apps/server/src/main.ts`
  - `apps/server/prisma/schema.prisma`
  - `apps/server/src/modules/auth/auth.controller.ts`
  - `apps/server/src/modules/auth/auth.service.ts`
  - `apps/server/src/modules/auth/guards/jwt-auth.guard.ts`
  - `apps/server/src/modules/auth/guards/roles.guard.ts`
  - `apps/server/src/modules/users/users.service.ts`
  - `packages/shared-types/src/index.ts` (shared DTOs & enums)

## Implementation Steps
1. **Workspace & Tooling Initialization**:
   - Set up root `package.json`, pnpm-workspace / Turborepo with packages: `apps/server`, `apps/web`, `packages/shared-types`.
   - Setup ESLint, Prettier, and TypeScript configurations.
2. **Infrastructure Containerization**:
   - Create `docker-compose.yml` configuring Postgres (port 5432), Redis (port 6379), and MinIO (ports 9000, 9001) with persistent volumes.
3. **Database Schema & Prisma ORM**:
   - Define data models in `schema.prisma`.
   - Generate initial migration: `pnpm prisma migrate dev --name init_auth_and_org`.
   - Implement database seeder (`prisma/seed.ts`) populating default company departments (Engineering, Marketing, HR, Executive) and test users.
4. **Auth & RBAC Module**:
   - Implement password hashing with Argon2 or bcrypt.
   - Implement JWT Access Token (short-lived, 15m) and Refresh Token (long-lived, 7d, stored hashed in DB).
   - Create `@Roles()` decorator and `RolesGuard` to validate permissions against endpoints.
5. **Health Checks & Integration Tests**:
   - Add `/api/health` checking DB & Redis connectivity.
   - Write integration tests for signup/login/token-refresh flows.

## Success Criteria
- [ ] `docker compose up -d` successfully spins up PostgreSQL, Redis, and MinIO.
- [ ] Database migrations execute cleanly and seed data loads successfully.
- [ ] User can authenticate via API, receive JWT, and access role-protected endpoints.
- [ ] Role guard blocks unauthorized role access with HTTP 403 Forbidden.

## Risk Assessment
- **Risk**: Token revocation latency during user deactivation.
  - *Mitigation*: Maintain a Redis token-denylist / cache user active status with a short TTL check in the JWT validation strategy.
