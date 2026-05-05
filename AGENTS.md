# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 certificate generation system (越鑫检测证书管理系统) for managing gas detection equipment certificates. The application generates certificates for different gas detection probes, handles document templating, and provides company/equipment management functionality.

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production (runs prisma generate first)
npm run start           # Start production server
npm run lint            # Run ESLint (currently maps to next lint)

# Database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Apply database migrations
npx prisma studio      # Open Prisma Studio GUI

# Scripts
npx ts-node scripts/import-companies.ts  # Import company data to database
```

## Architecture

### Core Technologies
- **Next.js 14** with App Router and TypeScript
- **Prisma ORM** with PostgreSQL database
- **Iron Session** for authentication
- **Document Processing**: docxtemplater, PizZip, JSZip for .docx template manipulation
- **UI Components**: Tailwind CSS, HeadlessUI, React Select, React DatePicker
- **External Processing Backend**: a Windows HTTP service handles docx upload, PDF conversion, PDF merge, packaging, progress, and download proxying

### Database Schema
- **Waitlist**: Basic email waitlist (id, email, name, timestamps)
- **Company**: Gas detection equipment manufacturers (id, shortName, fullName, products[], alarm, timestamps)

### Active Data Sources
- Company management currently uses `src/lib/companies-json.ts`, which reads and writes `src/data/companies.json` directly and exposes a Prisma-like API (`findMany`, `findFirst`, `create`, `update`, `delete`, `findUnique`).
- Prisma schema still defines `Waitlist` and `Company`, and `prisma` helpers exist in `src/lib/prisma.ts` and `src/lib/db.ts`, but the active company routes have Prisma imports commented out.
- When changing company behavior, treat `src/data/companies.json` as the active source of truth unless the task explicitly migrates back to PostgreSQL.

### Authentication Flow
- Password-based authentication using iron-session
- Middleware protection on all routes except `/login` and `/api/auth/*`
- Session stored in httpOnly cookies with 7-day expiration
- Password verification against `ACCESS_PASSWORD` environment variable
- Middleware only checks for the presence of the `auth-session` cookie; full session access is implemented through `src/lib/auth.ts` and the auth API routes.

### Required Environment Variables
- `ACCESS_PASSWORD` - login password checked by `verifyPassword`.
- `IRON_SESSION_PASSWORD` - iron-session encryption password; required at runtime.
- `DATABASE_URL` - required by Prisma generation/build and Prisma-backed routes.
- `WINDOWS_API_URL` - intended Windows backend base URL; defaults to `http://139.196.115.44:5000` in the certificate generation route and Next config. Some proxy routes still hardcode this backend URL.
- `BLOB_READ_WRITE_TOKEN` - required if using the Vercel Blob upload endpoint at `/api/certificates`.

### Key Application Flow
1. **Certificate Generation**: Users fill form with company info, probe details, environmental parameters
2. **Client Validation**: The home page validates selected company/model/gas/date, section distribution, per-section counts, and total probe count before showing a confirmation modal
3. **Document Generation**: `/api/generate-certificates` renders `.docx` files locally using templates from `/templates/`
4. **External Processing**: Generated docx buffers are uploaded to the Windows backend; optional PDF conversion, merge, and complete ZIP packaging run asynchronously
5. **Progress Tracking**: The frontend polls `/api/progress/[taskId]` every 2 seconds, which proxies and normalizes Windows backend progress
6. **File Download**: `/api/download/[taskId]/[type]` proxies file downloads from the Windows backend

### File Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Utilities (auth, database, validations)
- `src/data/companies.json` - active company/product/alarm data store
- `templates/` - Word document templates for certificate generation
- `scripts/` - Database import and utility scripts
- `prisma/` - Database schema and migrations

### API Architecture
- `/api/auth/*` - Authentication endpoints
- `/api/companies/*` - Company data management backed by `src/data/companies.json`
- `/api/companies/data` - Frontend-select formatted company list (`name`, `fullname`, `list`, `alarm`)
- `/api/generate-certificates` - Main certificate generation endpoint
- `/api/progress/[taskId]` - Task progress tracking
- `/api/download/[taskId]/[type]` - File download endpoints
- `/api/templates` - Template listing/download helper; GET currently only allows `model.docx` and `table_refer.docx`, so update the whitelist if adding downloadable templates
- `/api/generate`, `/api/download`, and `/api/merge` - older placeholder-style endpoints; verify whether they are still used before extending them
- `/api/debug-backend/*`, `/api/test-*`, `/api/force-complete/*`, `/api/reset-task/*` - operational/debug helpers around the Windows backend

### Important Implementation Details
- Gas types supported: 甲烷 (methane) and 丙烷 (propane) with different standards
- Gas standard mapping in `/api/generate-certificates`: 甲烷 uses `GBW(E)061662` and `REL=1.5%`; 丙烷 uses `GBW(E)061853` and `REL=1%`
- Certificate templates support variable replacement using docxtemplater
- Template delimiters are `{{` and `}}`
- Normal certificates randomly use `templates/normal_1.docx` through `templates/normal_15.docx`; problem certificates use `templates/problem.docx`
- Progress tracking uses interval polling every 2 seconds
- File numbering uses `ZJYX-${YYYYMMDD}${serial}` and 4-digit serial formatting; probe numbers use 3-digit formatting, optionally prefixed with the section name
- Problem probe input supports space-separated numbers and ranges such as `1 3 5-8`; comparisons are against the final 3 digits of the generated certificate number
- Company data includes manufacturer names and supported equipment models
- The company `alarm` value is used as the action threshold (`dongzuozhi`) when rendering normal certificates; problem certificates render `/` and abnormal status fields
- The detection date submitted to `/api/generate-certificates` must be `YYYYMMDD`; the API formats both the detection date and the next-year-minus-one-day validity date for template variables
- The frontend currently includes a `convert_to_pdf` advanced option; when false, the backend skips PDF conversion and attempts to mark the task complete through the Windows service

### Maintenance Notes
- The codebase contains duplicated Prisma helpers (`src/lib/prisma.ts` and `src/lib/db.ts`). Check imports before changing Prisma initialization.
- API routes use verbose `console.log` debugging in several places. Preserve useful operational logs around long-running certificate tasks, but avoid adding noisy logs to hot UI paths.
- The project stores real `.docx` templates in `templates/`; avoid replacing them blindly. If template variables change, update both the template files and the data object in `/api/generate-certificates`.
- Because several routes proxy the external Windows service, local verification of the full certificate/PDF flow requires that service to be reachable.
