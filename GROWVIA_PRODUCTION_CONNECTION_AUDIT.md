# Growvia School ERP — Production Connection Audit & Hosting Setup Report

This document presents the complete production connection audit, database validation, and environment configuration guide for **Growvia School ERP**.

---

## 1. Executive Summary & Verification Matrix

| Component | Target Host / Platform | Configuration Details | Verification Status |
| :--- | :--- | :--- | :--- |
| **GitHub Monorepo** | GitHub (`renechipprojects-source/Growvia`) | Branch: `main` \| Contains `/frontend` & `/backend` | **100% Single Push Verified** |
| **Frontend Application** | Vercel | Root Directory: `frontend` \| Vite + React SSG/SPA | **Build Passed (0 Errors)** |
| **Backend API Server** | Render Web Service | Root Directory: `backend` \| Node.js Express API | **Build Passed (0 Errors)** |
| **Database** | Supabase (`nyhnkftlkigoliyogwvp`) | Project URL: `https://nyhnkftlkigoliyogwvp.supabase.co` | **6 `GV_` Tables Verified** |
| **Object Storage** | Cloudflare R2 | S3-Compatible Bucket \| Server-side upload via Render | **Architecture Documented** |
| **Security Audit** | Tracked File Scan | `git ls-files` contains **0 secret `.env` files** | **Clean & Secure** |

---

## 2. Monorepo & Hosting Architecture Diagram

```
                       GitHub Repository (Single Monorepo)
             https://github.com/renechipprojects-source/Growvia.git
                                │
                      ┌─────────┴─────────┐
                      │                   │
                 /frontend            /backend
                      │                   │
              Vercel Deployment   Render Deployment
              (Root: frontend)    (Root: backend)
                      │                   │
                      └─────────┬─────────┘
                                │
                      Supabase Database Project
               (https://nyhnkftlkigoliyogwvp.supabase.co)
                                │
                      ┌─────────┴─────────┐
                 6 Consolidated     Cloudflare R2
                   `GV_` Tables        Storage
```

---

## 3. Environment Variables Matrix

### A. Vercel Frontend Environment Variables (`frontend/`)

| Variable Name | Required Value / Description | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://nyhnkftlkigoliyogwvp.supabase.co` | Supabase Client URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | Anonymous Public Client Key |
| `VITE_API_BASE_URL` | `https://your-growvia-backend.onrender.com` | Render Express API Endpoint |

### B. Render Backend Environment Variables (`backend/`)

| Variable Name | Required Value / Description | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` (Assigned dynamically by Render) | Server listening port |
| `FRONTEND_URL` | `https://your-growvia-frontend.vercel.app` | CORS origins whitelist |
| `SUPABASE_URL` | `https://nyhnkftlkigoliyogwvp.supabase.co` | Database Client URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | Public Client Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `[SUPER_SECRET_ROLE_KEY]` | Server-side database access key |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | `[CLOUDFLARE_KEY]` | Cloudflare R2 Access Key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `[CLOUDFLARE_SECRET]` | Cloudflare R2 Secret Key |
| `CLOUDFLARE_R2_BUCKET_NAME` | `growvia-assets` | Cloudflare Storage Bucket Name |
| `CLOUDFLARE_R2_PUBLIC_URL` | `https://pub-growvia.r2.dev` | Public CDN asset URL |

---

## 4. Database Schema Audit (6 Consolidated Tables)

| Table Name | Primary Keys & Indexes | Functional Purpose |
| :--- | :--- | :--- |
| **`GV_users`** | `id`, `login_id`, `role`, `status` | Admin, Principal, Office, Teacher, Student, Parent profiles |
| **`GV_inventory_expenses`** | `id`, `record_type`, `item_name` | Inventory stock, equipment, office expenses, asset tracking |
| **`GV_fees_payments`** | `id`, `student_id`, `record_type` | Fee structures, installment schedules, receipt history |
| **`GV_communications`** | `id`, `channel`, `recipient_role` | Circulars, messages, diary notes, announcements |
| **`GV_requests`** | `id`, `request_type`, `status` | Admissions, enquiries, leave requests, password resets |
| **`GV_system_settings`** | `id` (PRIMARY), `academic_year` | Developer console settings, independent logos, theme config |

---

## 5. Phased Deployment Sequence

1. **Step 1 — GitHub Verification**:
   - Monorepo `https://github.com/renechipprojects-source/Growvia.git` up to date on `main`.
2. **Step 2 — Supabase Verification**:
   - Verify table structure and seed data in Supabase project `nyhnkftlkigoliyogwvp`.
3. **Step 3 — Render Backend Deployment**:
   - Connect repository `renechipprojects-source/Growvia`.
   - Set Root Directory = `backend`.
   - Set Build Command = `npm install && npm run build`.
   - Set Start Command = `npm start`.
   - Add backend environment variables.
   - Verify `GET /health` endpoint returns `{"status":"ok"}`.
4. **Step 4 — Vercel Frontend Deployment**:
   - Connect repository `renechipprojects-source/Growvia`.
   - Set Root Directory = `frontend`.
   - Set Build Command = `npm run build`.
   - Set Output Directory = `dist`.
   - Set `VITE_API_BASE_URL` to the Render backend URL.
5. **Step 5 — Final Integration & CORS Verification**:
   - Update `FRONTEND_URL` on Render to the live Vercel domain.
   - Test login, role dashboards, dynamic academic session, and real-time updates.

---

## 6. Build Verification

- **Frontend Compilation**: `cd frontend && npx tsc --noEmit` — **0 Errors**.
- **Backend Compilation**: `cd backend && npm run build` — **0 Errors**.
- **Backend Health Check**: `GET /health` — `{"status":"ok"}`.
