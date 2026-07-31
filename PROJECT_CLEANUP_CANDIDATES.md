# Growvia School ERP — Project Cleanup Candidates Report

This document lists every file evaluated for project hygiene and classifies it according to requirement, usage, reference analysis, and recommended action.

---

## 1. Classification Summary & Candidate Audit Matrix

| File / Artifact | Classification | Reason | References Found | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **`frontend/`** | `REQUIRED FOR PRODUCTION` | Vite + React Frontend Application | Yes (Monorepo Vercel Root) | **KEEP** |
| **`backend/`** | `REQUIRED FOR PRODUCTION` | Node.js Express API Server | Yes (Monorepo Render Root) | **KEEP** |
| **`package.json`** | `REQUIRED FOR DEPLOYMENT` | Monorepo build & dev scripts (`frontend:build`, etc.) | Yes | **KEEP** |
| **`package-lock.json`** | `REQUIRED FOR DEVELOPMENT` | Dependency lockfile | Yes | **KEEP** |
| **`.gitignore`** | `REQUIRED FOR SECURITY` | Prevents `.env` & `node_modules` commits | Yes | **KEEP** |
| **`README.md`** | `DOCUMENTATION` | Single repository monorepo documentation | Yes | **KEEP** |
| **`AGENTS.md`** | `DOCUMENTATION` | Repository & agent instructions | Yes | **KEEP** |
| **`.env` (Root)** | `SECURITY RISK` | Root `.env` file; superseded by `.env.example` | No (Redundant) | **DELETE FROM ROOT** |
| **`src/` (Root)** | `DUPLICATE` | Obsolete pre-separation source folder | No (Moved to `frontend/src/`) | **DELETE OLD ROOT FOLDER** |
| **`public/` (Root)** | `DUPLICATE` | Obsolete pre-separation public folder | No (Moved to `frontend/public/`) | **DELETE OLD ROOT FOLDER** |
| **`components.json` (Root)** | `DUPLICATE` | Pre-separation UI config | No (Moved to `frontend/components.json`) | **DELETE FROM ROOT** |
| **`eslint.config.js` (Root)** | `DUPLICATE` | Pre-separation linter config | No (Moved to `frontend/eslint.config.js`) | **DELETE FROM ROOT** |
| **`tsconfig.json` (Root)** | `DUPLICATE` | Pre-separation tsconfig | No (Moved to `frontend/tsconfig.json`) | **DELETE FROM ROOT** |
| **`vite.config.ts` (Root)** | `DUPLICATE` | Pre-separation Vite config | No (Moved to `frontend/vite.config.ts`) | **DELETE FROM ROOT** |
| **`vercel.json` (Root)** | `OBSOLETE` | Pre-monorepo root Vercel config | No (Superseded by Vercel Root `frontend`) | **DELETE FROM ROOT** |
| **`audit-current-supabase.mjs`** | `OBSOLETE TEST` | One-off Supabase audit script | None | **DELETE** |
| **`check-and-migrate-supabase.mjs`** | `OBSOLETE MIGRATION` | One-off database migration runner | None | **DELETE** |
| **`clear_all_db_records.mjs`** | `OBSOLETE TEST` | One-off DB cleanup runner | None | **DELETE** |
| **`full-supabase-migration-runner.mjs`** | `OBSOLETE MIGRATION` | One-off full migration script | None | **DELETE** |
| **`merge-and-purge-to-six-tables.mjs`** | `OBSOLETE MIGRATION` | One-off 6-table merge runner | None | **DELETE** |
| **`namespace-migration-runner.mjs`** | `OBSOLETE MIGRATION` | One-off namespace migration runner | None | **DELETE** |
| **`run_e2e_integration_test.mjs`** | `OBSOLETE TEST` | One-off E2E test runner | None | **DELETE** |
| **`test-*.mjs` (35+ files)** | `OBSOLETE TEST` | One-off node verification scripts | None | **DELETE** |
| **`verify_dashboards_empty.mjs`** | `OBSOLETE TEST` | One-off empty dashboard verifier | None | **DELETE** |
| **`ACADEMIC_SESSION_DYNAMIC_AUDIT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`CODE_SEPARATION_REPORT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`DEVELOPER_CONSOLE_FULL_ACCESS_AUDIT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`GITHUB_REPOSITORY_PREPARATION_REPORT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`GROWVIA_GITHUB_IDENTITY_VERCEL_READINESS.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`INITIAL_GITHUB_PUSH_REPORT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |
| **`SINGLE_PUSH_VERIFICATION_REPORT.md`** | `TEMPORARY REPORT` | Task audit report | Artifact directory | **DELETE FROM ROOT** |

---

## 2. Retention Guarantee

- `frontend/`: 100% Retained.
- `backend/`: 100% Retained.
- `package.json`, `README.md`, `.gitignore`, `AGENTS.md`: 100% Retained.
- `frontend/src/supabase/consolidated_schema.sql`: 100% Retained (Production DDL Schema for 6 `GV_` tables).
