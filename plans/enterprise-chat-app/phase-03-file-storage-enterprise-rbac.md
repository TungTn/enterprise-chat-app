---
phase: 3
title: "File Storage & Enterprise RBAC"
status: pending
priority: P2
effort: "3d"
dependencies: [1, 2]
---

# Phase 3: File Storage & Enterprise RBAC

## Overview
Implement an enterprise-grade file upload, preview, and storage system backed by self-hosted MinIO (S3-compatible) with strict permission checks, file size/type restrictions, thumbnail generation, and an administrative audit logging subsystem.

## Requirements
- **Functional:**
  - Secure file uploads (drag-and-drop, multi-file attachments: PDF, DOCX, XLSX, images, zip).
  - Presigned S3/MinIO upload and download URLs to keep heavy binary transfers off the main NestJS API thread.
  - Image thumbnailing and preview generation (Sharp library).
  - File access authorization: only conversation members can generate signed download URLs.
  - Comprehensive Audit Logging: track channel creation, role changes, file downloads, message deletions, and user logins.
  - Search within channel files tab (list all documents/images shared in a given channel).
- **Non-functional:**
  - Max upload size limits configured per role (e.g. 100MB for employees, 500MB for admins).
  - Strict MIME-type validation and file extension sandboxing to prevent malicious script uploads.
  - Secure S3 storage bucket policies (no public bucket exposure).

## Architecture
- **Data Entities**:
  - `Attachment`: id, messageId, uploaderId, fileName, originalName, fileSizeBytes, mimeType, s3Key, thumbnailUrl, createdAt.
  - `AuditLog`: id, actorId, action (`LOGIN`, `CREATE_CHANNEL`, `DELETE_MESSAGE`, `DOWNLOAD_FILE`, `ROLE_UPDATE`), targetEntity, targetId, ipAddress, userAgent, metadata (JSON), timestamp.
- **Upload Workflow via Presigned URL**:
  1. Client calls `POST /api/files/presign-upload` with filename, size, mimeType, and conversationId.
  2. Server verifies membership and quota -> generates MinIO S3 presigned PUT URL + temporary attachment record.
  3. Client uploads directly to MinIO via HTTP PUT.
  4. Client calls `POST /api/files/confirm-upload` -> server validates object presence in MinIO, triggers thumbnail worker, attaches file to message.

## Related Code Files
- Create:
  - `apps/server/src/modules/files/files.controller.ts`
  - `apps/server/src/modules/files/files.service.ts`
  - `apps/server/src/modules/files/s3-storage.service.ts`
  - `apps/server/src/modules/files/dto/presign-upload.dto.ts`
  - `apps/server/src/modules/audit/audit.service.ts`
  - `apps/server/src/modules/audit/interceptors/audit.interceptor.ts`
  - `apps/server/src/modules/audit/audit.controller.ts`

## Implementation Steps
1. **MinIO / S3 Client Service**:
   - Initialize AWS S3 SDK v3 client pointed to MinIO endpoint with credentials from environment variables.
   - Automatically initialize default bucket `enterprise-chat-files` with private access policy on server startup.
2. **Presigned Upload & Confirmation Pipeline**:
   - Implement presign URL endpoint with HMAC token verification.
   - Implement upload confirmation endpoint and link attachment ID to chat message.
3. **Image Processing & Thumbnails**:
   - Integrate `sharp` to produce responsive thumbnails (300px width WebP) for uploaded images before storing in thumbnail folder.
4. **Access Control & Signed Download URLs**:
   - Implement `GET /api/files/:id/download-url` verifying current user is an active member of the conversation where the file was uploaded.
5. **Audit Logging Framework**:
   - Create `@AuditAction(action)` custom decorator and interceptor.
   - Persist structured audit events into PostgreSQL with search filters (by actor, date range, action type) accessible only to `OrgAdmin` and `SuperAdmin`.

## Success Criteria
- [ ] Users can upload images and enterprise office documents (PDF, Word, Excel) up to 100MB.
- [ ] Non-members cannot access or download files from private channels.
- [ ] Presigned direct uploads bypass server memory without spiking NestJS CPU/RAM.
- [ ] Admin dashboard can query audit logs for sensitive operations with full metadata.

## Risk Assessment
- **Risk**: Upload of harmful executables or scripts disguised as images.
  - *Mitigation*: Inspect magic bytes on upload confirmation; force `Content-Disposition: attachment` on all non-image downloads to prevent browser script execution.
