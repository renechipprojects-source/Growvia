# Growvia School ERP — Production Connection Audit & Hosting Setup Report

This document records the production connection audit, live database validation, and step-by-step dashboard setup guide for **Growvia School ERP**.

---

## 1. Hosting Status Classification Summary

| Component | Target Host | Configuration Parameter | Audit Classification | Action / Status |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Monorepo** | GitHub (`renechipprojects-source/Growvia`) | Branch: `main` \| Contains `/frontend` & `/backend` | ✅ **VERIFIED** | Local code and branch pushed |
| **Database** | Supabase (`nyhnkftlkigoliyogwvp`) | URL: `https://nyhnkftlkigoliyogwvp.supabase.co` | ✅ **VERIFIED** | 6 `GV_` tables active & connected |
| **Frontend Code** | Vite + React (`/frontend`) | Root: `frontend` \| Build: `npm run build` | ✅ **VERIFIED** | Local production build passed (0 errors) |
| **Backend Code** | Node.js Express (`/backend`) | Root: `backend` \| Endpoint: `GET /health` | ✅ **VERIFIED** | Local production build passed (0 errors) |
| **Render Service** | Render (`dashboard.render.com`) | Web Service connected to GitHub `/backend` | ⚠️ **MANUAL ACTION REQUIRED** | Create Web Service & set env vars |
| **Vercel Service** | Vercel (`vercel.com/new`) | Frontend project connected to GitHub `/frontend` | ⚠️ **MANUAL ACTION REQUIRED** | Import project & set env vars |
| **Cloudflare Storage** | Cloudflare R2 | S3-Compatible bucket `growvia-assets` | ⚠️ **MANUAL ACTION REQUIRED** | Create R2 bucket & add keys to Render |

---

## 2. Verified Local Configuration Matrix

### A. Git Repository Status
- **Remote**: `https://github.com/renechipprojects-source/Growvia.git`
- **Branch**: `main`
- **Monorepo Directories**: `frontend/` and `backend/` contained inside the SAME repository.
- **Security Check**: `git ls-files` contains **0 secret `.env` files** (only `.env.example` templates).

### B. Supabase Database & Table Architecture
- **Project URL**: `https://nyhnkftlkigoliyogwvp.supabase.co`
- **Consolidated Tables (6)**:
  1. `GV_users` (User profiles: Admin, Principal, Office, Teacher, Student, Parent)
  2. `GV_inventory_expenses` (Inventory stock, equipment, office expenses)
  3. `GV_fees_payments` (Fee schedules, installments, receipts)
  4. `GV_communications` (Circulars, messages, diary notes, announcements)
  5. `GV_requests` (Admissions, enquiries, leave requests, password resets)
  6. `GV_system_settings` (Developer console, independent logos, theme config, dynamic academic session)

---

## 3. Required Environment Variables Matrix

### A. Render Backend Environment Variables (`backend/`)
*Set in Render Dashboard -> Web Service -> Environment Settings:*

| Variable Name | Required Value / Description | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` (Or dynamic Render default) | Server listening port |
| `SUPABASE_URL` | `https://nyhnkftlkigoliyogwvp.supabase.co` | Database Client URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | Anonymous Public Client Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `[YOUR_SUPABASE_SERVICE_ROLE_KEY]` | Server-side database access key |
| `FRONTEND_URL` | `https://[YOUR_VERCEL_APP].vercel.app` | CORS whitelist domain |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | `[YOUR_CLOUDFLARE_R2_KEY_ID]` | Cloudflare R2 Access Key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `[YOUR_CLOUDFLARE_R2_SECRET]` | Cloudflare R2 Secret Key |
| `CLOUDFLARE_R2_BUCKET_NAME` | `growvia-assets` | R2 Bucket Name |
| `CLOUDFLARE_R2_PUBLIC_URL` | `https://pub-growvia.r2.dev` | Public CDN asset URL |

### B. Vercel Frontend Environment Variables (`frontend/`)
*Set in Vercel Dashboard -> Project Settings -> Environment Variables:*

| Variable Name | Required Value / Description | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://nyhnkftlkigoliyogwvp.supabase.co` | Supabase Client URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | Anonymous Public Client Key |
| `VITE_API_BASE_URL` | `https://[YOUR_RENDER_BACKEND_URL].onrender.com` | Render Express API Base URL |

---

## 4. Step-by-Step Hosting Setup Instructions

### Step 1: Deploy Backend to Render
1. Open [dashboard.render.com](https://dashboard.render.com) and click **New + -> Web Service**.
2. Select repository **`renechipprojects-source/Growvia`**.
3. Configure:
   - **Name**: `growvia-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Add the Backend Environment Variables listed in Section 3A.
5. Click **Create Web Service**. Once deployed, copy your live Render URL (e.g. `https://growvia-backend.onrender.com`).
6. Test endpoint: `GET https://[YOUR_RENDER_URL]/health` -> Should return `{"status":"ok"}`.

### Step 2: Deploy Frontend to Vercel
1. Open [vercel.com/new](https://vercel.com/new) and select repository **`renechipprojects-source/Growvia`**.
2. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the Frontend Environment Variables listed in Section 3B (paste your live Render backend URL into `VITE_API_BASE_URL`).
4. Click **Deploy**. Copy your live Vercel domain (e.g. `https://growvia-app.vercel.app`).

### Step 3: Update Render CORS & Verify
1. Go back to Render Dashboard -> Environment Settings.
2. Set `FRONTEND_URL` = `https://[YOUR_VERCEL_APP].vercel.app`.
3. Click **Save Changes** (Render will redeploy with updated CORS settings).

### Step 4: Configure Cloudflare R2 Storage
1. Open [dash.cloudflare.com](https://dash.cloudflare.com) -> R2.
2. Create bucket named `growvia-assets`.
3. Create API Token with Object Read/Write permissions.
4. Add credentials to Render environment variables (`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL`).
