---
phase: 5
title: "Security Hardening & Deployment"
status: pending
priority: P2
effort: "2d"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Security Hardening & Deployment

## Overview
Perform comprehensive security hardening, rate limiting, connection fault tolerance, message deduplication, automated end-to-end testing, and prepare production deployment packages with Docker Compose and reverse proxy SSL termination.

## Requirements
- **Functional:**
  - Automated deployment with single-command `docker compose -f docker-compose.prod.yml up -d`.
  - Automated database backup and restore scripts for PostgreSQL and MinIO data.
  - End-to-end integration and load testing suite (Playwright for frontend, k6 / artillery for WebSocket concurrency).
  - Admin configuration interface: company name, logo, maximum file upload limits, session timeouts.
- **Non-functional:**
  - Strict security headers (Helmet, CSP, CORS restricted to trusted domains).
  - Rate limiting on sensitive endpoints (Login: 5 attempts / min; Message send: 20 msgs / sec).
  - Zero message loss during network jitter (idempotency key / client message UUID deduplication).
  - Production ready logging and metrics (Prometheus / Pino structured JSON logs).

## Architecture
- **Production Topology**:
  - Traefik or Nginx Reverse Proxy with Let's Encrypt automated TLS.
  - NestJS API & WebSocket backend run in clustered mode with PM2 or multi-replica Docker containers behind Redis adapter.
  - PostgreSQL with WAL archiving and daily automated dumps.
  - MinIO distributed or standalone with encrypted disk volume.

## Related Code Files
- Create:
  - `docker-compose.prod.yml`
  - `apps/server/src/common/guards/throttler.guard.ts`
  - `apps/server/src/common/filters/all-exceptions.filter.ts`
  - `scripts/backup-db.sh`
  - `scripts/restore-db.sh`
  - `tests/e2e/chat-flow.spec.ts` (Playwright)
  - `tests/load/websocket-load.js` (k6 load test script)
  - `.github/workflows/ci-cd.yml`

## Implementation Steps
1. **Security Hardening**:
   - Enable Helmet with strict Content Security Policy (CSP).
   - Configure NestJS `@nestjs/throttler` backed by Redis for IP and user-based rate limiting.
   - Enforce message deduplication using client-generated UUIDs (`clientMessageId`) to prevent duplicate sends on connection blips.
   - Sanitize all input strings with DOMPurify / sanitize-html to prevent Stored XSS.
2. **Automated Testing**:
   - Write Playwright E2E tests: User A sends message in channel -> User B receives message real-time -> User B adds reaction -> User A sees reaction update.
   - Write k6 load test simulating 500 concurrent active WebSocket connections exchanging messages.
3. **Backup & Disaster Recovery**:
   - Script automated daily PostgreSQL `pg_dump` with gzip compression and retention policy (keep 30 days).
   - Document disaster recovery and restore procedure in `docs/ops/backup-restore.md`.
4. **Production Packaging**:
   - Build multi-stage optimized Dockerfiles for `apps/server` and `apps/web`.
   - Setup Nginx / Traefik reverse proxy configuration with WebSocket upgrade headers (`Upgrade: websocket`, `Connection: Upgrade`).
   - Create complete production deployment guide in `docs/ops/deployment.md`.

## Success Criteria
- [ ] End-to-end tests pass across all key user flows (authentication, channel creation, real-time chat, file upload).
- [ ] k6 test verifies WebSocket gateway handles 500 concurrent connections under 100ms response time with 0 packet drops.
- [ ] Security audit confirms protected headers, rate limiting kicks in on brute force login, and stored XSS vectors are neutralized.
- [ ] Full stack starts cleanly in production mode with TLS termination.

## Risk Assessment
- **Risk**: WebSocket connection drops when proxy timeouts are too aggressive.
  - *Mitigation*: Set `proxy_read_timeout 3600s` and `proxy_send_timeout 3600s` in Nginx, backed by application-level Ping/Pong every 25 seconds.
