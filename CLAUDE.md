# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 certificate generation system (越鑫检测证书管理系统) for managing gas detection equipment certificates. The application generates certificates for different gas detection probes, handles document templating, and provides company/equipment management functionality.

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production (runs prisma generate first)
npm run start           # Start production server
npm run lint            # Run ESLint

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

### Database Schema
- **Waitlist**: Basic email waitlist (id, email, name, timestamps)
- **Company**: Gas detection equipment manufacturers (id, shortName, fullName, products[], alarm, timestamps)

### Authentication Flow
- Password-based authentication using iron-session
- Middleware protection on all routes except `/login` and `/api/auth/*`
- Session stored in httpOnly cookies with 7-day expiration
- Password verification against `ACCESS_PASSWORD` environment variable

### Key Application Flow
1. **Certificate Generation**: Users fill form with company info, probe details, environmental parameters
2. **Background Processing**: Long-running tasks tracked via polling with taskId
3. **Document Generation**: Uses .docx templates from `/templates/` directory
4. **File Management**: Generates individual certificates and complete ZIP packages
5. **Progress Tracking**: Real-time progress updates via `/api/progress/[taskId]` endpoint

### File Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Utilities (auth, database, validations)
- `templates/` - Word document templates for certificate generation
- `scripts/` - Database import and utility scripts
- `prisma/` - Database schema and migrations

### API Architecture
- `/api/auth/*` - Authentication endpoints
- `/api/companies/*` - Company data management
- `/api/generate-certificates` - Main certificate generation endpoint
- `/api/progress/[taskId]` - Task progress tracking
- `/api/download/[taskId]/[type]` - File download endpoints

### Important Implementation Details
- Gas types supported: 甲烷 (methane) and 丙烷 (propane) with different standards
- Certificate templates support variable replacement using docxtemplater
- Progress tracking uses interval polling every 2 seconds
- File naming conventions include UUID prefixes for uniqueness
- Company data includes manufacturer names and supported equipment models