# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 certificate generation system (越鑫检测证书管理系统) for managing combustible gas detector certificate and original-record generation. The application manages detector manufacturer/equipment data, renders `.docx` templates, uploads generated files to a Windows backend, and optionally produces converted/merged PDF packages.

## Canonical Project Decisions

These are the important decisions established during the certificate/original-record refactor. Follow them first in new conversations so the user does not need to repeat context.

- The current product target is combustible gas detector work under JJG 693-2011, not a generic certificate generator.
- The system must generate both the certificate and its matching original record for each detector.
- Next.js is responsible for all business data selection, template rendering, and value binding. `main.py` is only the Windows file-processing backend.
- Active certificate template files are:
  - `templates/new_templates/new_normal.docx` for normal certificates.
  - `templates/new_templates/jilu.docx` for original records.
  - `templates/problem.docx` for abnormal/problem certificates.
- `templates/normal_1.docx` through `templates/normal_15.docx` are legacy templates and are not the current normal-certificate selection mechanism.
- `table_refer.docx` is not used in the current generation path.
- The active company data source is `src/data/companies.json` through `src/lib/companies-json.ts`. Do not assume Prisma is the active company source unless explicitly migrating the project.
- Company data includes detector range (`range`), shown and edited in the frontend, rendered as `liangcheng`, with `%LEL` as the display unit.
- The active random calibration/original-record data source is `src/data/calibration-records.json` through `src/lib/calibration-records-json.ts`.
- Random calibration data is selected once per detector. The same selected data group must fill both the certificate and the original record.
- Runtime generation should not recalculate the calibration table values. `calibration-records.json` stores complete precomputed groups, including raw values, averages, errors, uncertainty, repeatability, response-time average, and certificate-facing display fields.
- Certificate and original-record variables should stay semantically aligned. When a shared value appears in both documents, prefer the same variable name or an explicitly documented compatibility variable.
- `date_now` is the front-end selected detection date. `date_second` is one day after `date_now`. `date_next` is deprecated and should not be used.
- `alert_num` is only the detector number, for example `002`. `alert_num_place` is the region/place, for example `客厅`. Do not merge them back into `客厅002` unless the user explicitly changes the rule.
- In DOCX-only mode, generated downloads should still include both `*-证书.docx` and `*-原始记录.docx`.
- When Next.js and Flask run on the same Windows server, use `WINDOWS_API_URL=http://127.0.0.1:5000`; do not route through the public server IP.
- Keep Flask bound to `127.0.0.1` by default. Expose it externally only with deliberate firewall/reverse-proxy protection.
- The Windows server may have a newer production `src/data/companies.json` than the local checkout. Preserve/back up that file before pulling or deploying code that could overwrite it.
- `npm run build` invoking `prisma generate && next build` is expected because Prisma remains in the repository.
- If the frontend stalls at 10% and Flask sees no `/upload`, debug the Next.js generation route before the upload step. If Flask sees `/upload`, debug the Windows backend path.
- If the frontend shows `Unexpected token '<'`, it received an HTML error/timeout page instead of JSON; inspect the Next.js server log for the real failure.

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
- **Document Processing**: docxtemplater and PizZip for `.docx` template rendering; `form-data`/Axios for upload to the Windows backend
- **UI Components**: Tailwind CSS, HeadlessUI, React Select, React DatePicker
- **External Processing Backend**: a Windows HTTP service handles docx upload, PDF conversion, PDF merge, packaging, progress, and download proxying

### Database Schema
- **Waitlist**: Basic email waitlist (id, email, name, timestamps)
- **Company**: Legacy Prisma-backed company model (id, shortName, fullName, products[], alarm, timestamps). Company management is currently JSON-backed instead of Prisma-backed.

### Active Data Sources
- Company management currently uses `src/lib/companies-json.ts`, which reads and writes `src/data/companies.json` directly and exposes a Prisma-like API (`findMany`, `findFirst`, `create`, `update`, `delete`, `findUnique`).
- Company records include manufacturer short name, full name, equipment model list, alarm action threshold, and detector range (`range`). The detector range is displayed/edited in the company UI and is rendered into templates as `liangcheng`; the display unit is `%LEL`.
- Calibration/original-record data uses `src/lib/calibration-records-json.ts`, which reads `src/data/calibration-records.json`. Each certificate/original-record pair randomly selects one data group from this file.
- Prisma schema still defines `Waitlist` and `Company`, and `prisma` helpers exist in `src/lib/prisma.ts` and `src/lib/db.ts`, but the active company routes have Prisma imports commented out.
- When changing company behavior, treat `src/data/companies.json` as the active source of truth unless the task explicitly migrates back to PostgreSQL.

### Authentication Flow
- Password-based authentication using iron-session
- Middleware protection on all routes except `/login` and `/api/auth/*`
- Session stored in httpOnly cookies with 7-day expiration
- Password verification against `ACCESS_PASSWORD` environment variable
- Middleware verifies the iron-session data and redirects unauthenticated page requests to `/login`; unauthenticated API requests return `401`.
- Login has a simple in-memory IP failure limiter. This is sufficient for a small private deployment, but it is process-local and resets when the Next.js process restarts.

### Required Environment Variables
- `ACCESS_PASSWORD` - login password checked by `verifyPassword`.
- `IRON_SESSION_PASSWORD` - iron-session encryption password; required at runtime and must be at least 32 characters.
- `DATABASE_URL` - required by Prisma generation/build and Prisma-backed routes.
- `WINDOWS_API_URL` - Windows backend base URL used by certificate generation, progress, download, debug, reset, and force-complete routes. For Next.js and Flask on the same Windows server, set this to `http://127.0.0.1:5000`. The code fallback should remain localhost, not the public server IP.
- `FLASK_HOST` - optional Windows backend host binding. Default should be `127.0.0.1` so Flask is only reachable locally. Use `0.0.0.0` only when the backend must accept external traffic.
- `FLASK_PORT` - optional Windows backend port, default `5000`.
- `BLOB_READ_WRITE_TOKEN` - required if using the Vercel Blob upload endpoint at `/api/certificates`.

### Key Application Flow
1. **Certificate Generation**: Users fill form with company info, selected manufacturer/model/range, probe details, gas type, detection date, and environmental parameters
2. **Client Validation**: The home page validates selected company/model/gas/date, section distribution, per-section counts, and total probe count before showing a confirmation modal
3. **Document Generation**: `/api/generate-certificates` renders both a certificate `.docx` and a matching original-record `.docx` for every detector
4. **External Processing**: Generated docx buffers are uploaded to the Windows backend; optional PDF conversion, merge, and complete ZIP packaging run asynchronously
5. **Progress Tracking**: The frontend polls `/api/progress/[taskId]` every 2 seconds, which proxies and normalizes Windows backend progress
6. **File Download**: `/api/download/[taskId]/[type]` proxies file downloads from the Windows backend

### File Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Utilities (auth, database, validations)
- `src/data/companies.json` - active company/product/alarm data store
- `src/data/calibration-records.json` - active random calibration/original-record values used to fill the four measurement tables
- `templates/` - Word document templates for certificate generation
- `templates/new_templates/new_normal.docx` - active normal certificate template
- `templates/new_templates/jilu.docx` - active original-record template
- `templates/problem.docx` - problem/abnormal certificate template
- `scripts/` - Database import and utility scripts
- `prisma/` - Database schema and migrations
- `main.py` - Windows Flask backend for docx upload, conversion, packaging, progress, and download

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

### Certificate And Record Generation Rules
- Gas types supported: 甲烷 (methane) and 丙烷 (propane).
- Gas standard mapping in `/api/generate-certificates`: 甲烷 uses `GBW(E)061662` and `REL=1.5%`; 丙烷 uses `GBW(E)061853` and `REL=1%`.
- The detection date submitted to `/api/generate-certificates` must be `YYYYMMDD`.
- Template date variables:
  - `date_now` is the front-end selected detection date formatted as `YYYY 年 MM 月 DD 日`.
  - `date_second` is one day after `date_now`, formatted the same way.
  - `date_next` is no longer used.
- File numbering uses `ZJYX-${YYYYMMDD}${serial}` with a 4-digit serial derived from the probe index and `start_num`.
- Detector/probe numbers use 3-digit formatting (`001`, `002`, ...).
- `alert_num` is the detector number only, for example `002`.
- `alert_num_place` is the selected/entered region name, for example `客厅`.
- Previously the factory number could combine region and detector number (`客厅002`); the current rule separates them so templates can render region and number independently.
- Problem probe input supports space-separated numbers and ranges such as `1 3 5-8`; comparisons are against the final 3 digits of the generated certificate number.
- For each detector, `/api/generate-certificates` renders two files with the same data object:
  - `${fileNum}-${alertNum}-证书.docx` from `templates/new_templates/new_normal.docx` for normal probes, or `templates/problem.docx` for problem probes.
  - `${fileNum}-${alertNum}-原始记录.docx` from `templates/new_templates/jilu.docx`.
- Normal certificate generation no longer randomly chooses `templates/normal_1.docx` through `templates/normal_15.docx`. Those older files are legacy templates unless a future task explicitly reintroduces them.
- `table_refer.docx` is only exposed by the template helper route whitelist and is not part of the current certificate/original-record generation path unless code is changed to use it.

### Calibration Data Rules
- Calibration data is stored as 50 reusable/random groups in `src/data/calibration-records.json`.
- Each generated detector randomly selects one calibration group through `calibrationRecordsJson.findRandom()`.
- The same selected group must fill both `new_normal.docx` and `jilu.docx` so certificate values match the original record.
- Random selection happens once per detector in `/api/generate-certificates`; do not call `findRandom()` separately for the certificate and the original record.
- Runtime generation does not recalculate calibration values from raw measurements. The JSON group is authoritative and already contains the measured values, averages, errors, repeatability, response-time average, and certificate-facing fields.
- The four generated original-record table areas are:
  - 报警功能及报警动作值
  - 示值误差
  - 重复性
  - 响应时间
- Current generated values should satisfy JJG 693-2011 combustible gas detector requirements and represent normal detector behavior.
- Alarm function/action values:
  - Alarm function should render as normal for non-problem probes.
  - `alarm_value_1`, `alarm_value_2`, and `alarm_value_3` are the three alarm action measurements in the original record.
  - `alarm_action_value` is the one-decimal average of the three alarm action measurements and is used by both original record and certificate.
  - Certificate field `报警动作值` should use `alarm_action_value` with `%LEL` appended.
  - Compatibility variables `dongzuozhi`, `dongzuozhi_with_unit` should mirror `alarm_action_value` for normal probes and render `/` for problem probes.
- Indication error:
  - Original record includes three measured values at each indication point: `indication_10_value_1..3`, `indication_40_value_1..3`, and `indication_60_value_1..3`.
  - `indication_10_avg`, `indication_40_avg`, and `indication_60_avg` are the one-decimal averages of the corresponding three measured values.
  - Original-record indication errors are stored as `indication_10_error`, `indication_40_error`, and `indication_60_error`.
  - Certificate measured-value cells must use the original-record averages. In the current data model these are duplicated as `certificate_indication_10_measured`, `certificate_indication_40_measured`, and `certificate_indication_60_measured`; they should match `indication_*_avg`.
  - Certificate indication error equals certificate measured value minus the table's reference/standard value. The stored `certificate_indication_*_error` fields are preformatted for the certificate.
  - Positive certificate indication errors must include a leading plus sign, for example `+0.1`; zero should be rendered as `0.0`; negative values keep the minus sign.
  - Relative expanded uncertainty is stored in both `indication_*_urel` and `certificate_indication_*_urel`; keep these paired values consistent.
- Repeatability:
  - `repeat_value_1` through `repeat_value_6` are six repeated indication measurements in the original record.
  - `repeatability` is the one-decimal repeatability result derived from those six measurements and rendered with `%` in certificate variables.
  - Certificate field `重复性` should use `repeatability` with `%` appended.
  - Compatibility variables `random_chongfu`, `random_chongfu_with_unit` should mirror `repeatability` for normal probes and render `/` for problem probes.
- Response time:
  - For combustible gas detectors, response time should satisfy the JJG 693-2011 requirement for normal devices.
  - `response_time_1`, `response_time_2`, and `response_time_3` are three response-time measurements in the original record.
  - `response_time_avg` is the one-decimal average response time used by both original record and certificate.
  - Certificate field `响应时间` should use `response_time_avg` with `s` appended.
  - Compatibility variables `action_time`, `action_time_with_unit` should mirror `response_time_avg` for normal probes and render `/` for problem probes.
- For problem probes, measurement/result variables that represent pass/fail values should render `/` or abnormal status according to the existing `/api/generate-certificates` data object. Do not accidentally fill a problem certificate with normal random calibration values in certificate result fields.

### Calibration JSON Field Contract
- Every object in `src/data/calibration-records.json` should include the full field set defined by `CalibrationRecord` in `src/lib/calibration-records-json.ts`.
- Required original-record fields:
  - `alarm_function`, `alarm_value_1`, `alarm_value_2`, `alarm_value_3`, `alarm_action_value`
  - `indication_10_value_1`, `indication_10_value_2`, `indication_10_value_3`, `indication_10_avg`, `indication_10_error`, `indication_10_urel`
  - `indication_40_value_1`, `indication_40_value_2`, `indication_40_value_3`, `indication_40_avg`, `indication_40_error`, `indication_40_urel`
  - `indication_60_value_1`, `indication_60_value_2`, `indication_60_value_3`, `indication_60_avg`, `indication_60_error`, `indication_60_urel`
  - `repeat_value_1` through `repeat_value_6`, `repeatability`
  - `response_time_1`, `response_time_2`, `response_time_3`, `response_time_avg`
- Required certificate-facing fields:
  - `certificate_indication_10_measured`, `certificate_indication_10_error`, `certificate_indication_10_urel`
  - `certificate_indication_40_measured`, `certificate_indication_40_error`, `certificate_indication_40_urel`
  - `certificate_indication_60_measured`, `certificate_indication_60_error`, `certificate_indication_60_urel`
- Keep all numeric values as strings in JSON because docxtemplater renders them directly into Word templates.
- Preserve one decimal place where the existing templates expect one decimal place.
- When generating more calibration groups, generate the complete group at once, then store the derived averages/errors/uncertainties in JSON. Avoid leaving any calculation to the Word template.
- The `certificate_indication_*` fields exist to decouple certificate display formatting from original-record raw fields. If the reference values in `new_normal.docx` change, regenerate/update the certificate error fields so `certificate_indication_*_error = certificate_indication_*_measured - certificate table reference value`.

### Template Variables
- Templates use docxtemplater with `{{` and `}}` delimiters.
- Core shared variables include:
  - `file_num`, `company_name`, `alert_type`, `alert_factory`
  - `alert_num`, `alert_num_place`
  - `date_now`, `date_second`
  - `temperature`, `humidity`, `liangcheng`
  - `gas`, `gas_num`, `REL`
  - `alarm_status`, `gongneng`
- Calibration variables from `calibration-records.json` are spread into the render data object and should be used directly in templates.
- Keep variable names aligned between `new_normal.docx` and `jilu.docx` when the same value appears in both documents.
- `new_normal.docx` certificate result variables should reference the same semantic values as `jilu.docx`:
  - Alarm action value: `alarm_action_value` or compatibility `dongzuozhi_with_unit`
  - Repeatability: `repeatability` or compatibility `random_chongfu_with_unit`
  - Response time: `response_time_avg` or compatibility `action_time_with_unit`
  - Indication measured values: certificate `certificate_indication_*_measured`, matching original-record `indication_*_avg`
  - Indication errors/uncertainties: certificate `certificate_indication_*_error` and `certificate_indication_*_urel`
- `jilu.docx` should use raw/average original-record variables directly, such as `alarm_value_*`, `indication_*_value_*`, `indication_*_avg`, `repeat_value_*`, and `response_time_*`.
- When adding/removing a template variable, update both the `.docx` template and the data object in `/api/generate-certificates`.

### Windows Backend And Deployment
- The production-style deployment currently uses two processes on the Windows server:
  - Next.js frontend/API server from this repository, usually `npm run build` then `npm run start`.
  - Flask backend from `main.py`, usually `python.exe .\main.py`.
- Running two terminal windows works, but a process manager/service wrapper is more robust for unattended use. Keep the two processes logically separate unless intentionally migrating to a single backend.
- When Next.js and Flask run on the same machine, `WINDOWS_API_URL=http://127.0.0.1:5000` is preferred.
- Flask should normally bind to `127.0.0.1` to avoid exposing upload/conversion endpoints to the internet.
- `npm run build` running `prisma generate && next build` is expected and normal because Prisma remains in the project even though active company data is JSON-backed.
- If `git pull` fails with GitHub connection reset/port 443 errors on the Windows server, treat it as a network/connectivity problem rather than a code problem.

### `main.py` Windows Backend Responsibilities
- `main.py` is not responsible for rendering Word templates or calculating certificate/original-record values. That work happens in Next.js, primarily in `/api/generate-certificates`.
- `main.py` is a Windows-only processing service for files already generated by Next.js. It receives generated `.docx` files, stores them under task folders, optionally converts them to PDFs through Microsoft Word COM automation, merges PDFs, creates ZIP packages, reports progress, and serves downloads.
- `main.py` uses these local folders relative to the backend working directory:
  - `uploads/` - uploaded/generated DOCX files, grouped by `task_id`.
  - `pdfs/` - per-task PDF files generated from DOCX files.
  - `merged/` - merged PDF output named `<task_id>_merged.pdf`.
  - `complete/` - final ZIP packages that include DOCX files and the merged PDF when PDF conversion is enabled.
- `main.py` keeps task progress in the in-memory `task_status` dictionary. This state is lost when the Flask process restarts, although files already written to disk remain in the folders above.
- `main.py` depends on Windows and Microsoft Word for reliable DOCX-to-PDF conversion:
  - `docx2pdf`, `pywin32`, `win32com.client`, and `pythoncom` are used.
  - Microsoft Word must be installed and able to run under the same Windows user that starts the Flask process.
  - If Word shows dialogs, activation prompts, protected-view prompts, or first-run prompts, conversion may hang or fail.
- `main.py` endpoints:
  - `GET /` returns service metadata and endpoint list.
  - `GET /health` returns a simple health check.
  - `POST /upload` accepts `files` multipart uploads, creates a UUID `task_id`, and saves all uploaded DOCX files under `uploads/<task_id>/`.
  - `POST /convert/<task_id>` converts uploaded DOCX files to PDFs under `pdfs/<task_id>/` and updates progress/logs.
  - `POST /merge/<task_id>` merges PDFs from `pdfs/<task_id>/` into `merged/<task_id>_merged.pdf`.
  - `POST /package/<task_id>` creates `complete/<task_id>_<filename>.zip` containing all DOCX files and `合并证书.pdf`.
  - `GET /progress/<task_id>` returns in-memory progress, current file, logs, and completion flags.
  - `GET /download/<task_id>/<filetype>` serves `merged`, `pdfs`, `docx`, or `complete` downloads.
  - `POST /force-complete/<task_id>` marks a task complete for DOCX-only mode.
- `main.py` should not be exposed publicly unless protected by a firewall/reverse proxy. Its upload/conversion/download endpoints do not implement user authentication by themselves; authentication is handled by the Next.js app.
- The Flask development server warning is expected when using `python.exe .\main.py`. For higher reliability on Windows, prefer running it behind a service/process manager such as NSSM, Windows Task Scheduler at startup, or another supervised process wrapper. If changing server implementation, preserve endpoint compatibility with the Next.js proxy routes.

### Deployment Flow
- Typical Windows deployment:
  - Pull/update the repository.
  - Preserve production data files before overwriting, especially `src/data/companies.json` if company data was edited on the server.
  - Install/update Node dependencies with `npm install` if `package.json` or `package-lock.json` changed.
  - Ensure Python dependencies required by `main.py` are installed in the Python environment used on the server.
  - Set `.env`/`.env.local` values, especially `ACCESS_PASSWORD`, `IRON_SESSION_PASSWORD`, `DATABASE_URL`, and `WINDOWS_API_URL=http://127.0.0.1:5000`.
  - Run `npm run build`.
  - Start Next.js with `npm run start`.
  - Start Flask with `python.exe .\main.py` from the directory where its `uploads/`, `pdfs/`, `merged/`, and `complete/` folders should live.
- Next.js reads environment variables at process start. After editing `.env` or `.env.local`, restart `npm run start`; for production builds, rebuild if the changed value is consumed at build time.
- If both `.env` and `.env.local` contain the same variable, Next.js gives `.env.local` precedence. Keep `WINDOWS_API_URL` consistent and check `.env.local` first when server behavior does not match `.env`.
- The Flask backend reads `FLASK_HOST` and `FLASK_PORT` at Python process start. Restart `main.py` after changing them.
- In DOCX-only mode (`convert_to_pdf=false`), Next.js uploads generated certificate and original-record DOCX files and returns the DOCX ZIP download URL. PDF conversion, merge, and complete package generation are skipped.
- In PDF mode (`convert_to_pdf=true`), Next.js uploads DOCX files, then asynchronously calls `/convert`, `/merge`, and `/package`; the complete ZIP includes the DOCX files plus the merged PDF.
- Current generated DOCX uploads include both certificates and original records. Therefore the DOCX ZIP downloaded from `/api/download/<task_id>/docx` should contain both `*-证书.docx` and `*-原始记录.docx` files.
- A successful generation path is:
  - Browser submits form to Next.js `/api/generate-certificates`.
  - Next.js renders DOCX buffers from templates and calibration/company data.
  - Next.js uploads buffers to Flask `POST /upload`.
  - Flask returns `task_id`.
  - Next.js returns download/progress URLs to the browser.
  - If PDF conversion is enabled, Next.js starts the background conversion/merge/package sequence against Flask.

### Generation Debugging Notes
- If the frontend stays at 10% (`正在生成证书并上传到服务器...`) and Flask receives no `/upload`, the request has entered the Next.js route but has not reached the upload step. Check the Next.js logs around:
  - `[证书生成] 开始生成 DOCX`
  - `[证书生成] 渲染第 ...`
  - `[证书生成] DOCX 全部生成完成，开始上传到 ...`
- If Flask receives `/upload`, the issue is in the Windows backend processing/progress/download path, not in local `.docx` rendering.
- If the frontend reports `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, the frontend received an HTML error/timeout page from Next.js or an upstream server instead of JSON. Inspect the Next.js server log for the real error.
- Full certificate/PDF flow verification requires the Windows backend to be reachable. TypeScript checks only validate the Next.js code, not the external conversion service.
- DOCX template rendering can be structurally tested with docxtemplater. Visual layout verification may require LibreOffice/Word; if headless LibreOffice fails locally, do not assume the template is invalid without checking with Word or another renderer.

### Maintenance Notes
- The codebase contains duplicated Prisma helpers (`src/lib/prisma.ts` and `src/lib/db.ts`). Check imports before changing Prisma initialization.
- API routes use verbose `console.log` debugging in several places. Preserve useful operational logs around long-running certificate tasks, but avoid adding noisy logs to hot UI paths.
- The project stores real `.docx` templates in `templates/`; avoid replacing them blindly. If template variables change, update both the template files and the data object in `/api/generate-certificates`.
- Because several routes proxy the external Windows service, local verification of the full certificate/PDF flow requires that service to be reachable.
- The Windows server's `src/data/companies.json` may contain newer production company data than a local checkout. Pulling code from GitHub can overwrite it if that file is committed differently. Back up or preserve the server copy before deployment if company data was edited directly on the server.
- Avoid committing transient Word lock files such as `~$*.docx`, `.DS_Store`, generated output folders, or uploaded/converted files.
