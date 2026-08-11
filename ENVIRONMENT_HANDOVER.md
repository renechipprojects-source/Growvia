# PRODUCTION ENVIRONMENT & CONFIGURATION HANDOVER GUIDE
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Auditor**: Antigravity Automated Quality & Release Assurance  
**Target Environment**: Production Vercel / Lovable + Render / Supabase  
**Security Status**: **NAMES-ONLY SPECIFICATION (ZERO EXPOSED SECRETS)**  

---

## 1. EXECUTIVE CONFIGURATION OVERVIEW

This document outlines every required environment variable, backend configuration dependency, storage bucket, authentication setup, and deployment setting needed to operate, build, and maintain the Sunshine Play School ERP monorepo in production and local development environments.

```text
================================================================================================
ENVIRONMENT CONFIGURATION SCORECARD
================================================================================================
Monorepo Structure:                 /frontend (Vite + React) & /backend (Node.js + Express)
Frontend Hosting Target:            Vercel / Lovable (SPA Static Bundle)
Backend API Hosting Target:         Render / Cloud Server (Express API)
Database & Auth Engine:             Supabase Cloud PostgreSQL + GoTrue Auth
Storage Engine:                     Supabase Storage (system-assets)
Secret Exposure Audit:              PASS (Zero private secrets or .env files tracked in Git)
================================================================================================
```

---

## 2. FRONTEND ENVIRONMENT VARIABLES (`/frontend`)

The frontend application requires the following environment variables. In production, configure these in the **Vercel Project Settings $\rightarrow$ Environment Variables** or **Lovable Project Settings**:

| Variable Name | Environment | Purpose & Description | Config Location |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production & Local | The public HTTPS endpoint of your Supabase project. | Vercel / Lovable / `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | Production & Local | The safe public anonymous API key for client-side queries. | Vercel / Lovable / `.env.local` |
| `VITE_API_BASE_URL` | Production & Local | The root URL of the backend API server for provisioning endpoints. | Vercel / Lovable / `.env.local` |
| `VITE_API_URL` | Production & Local | Secondary alias for backend API base URL. | Vercel / Lovable / `.env.local` |

> [!CAUTION]
> **Client Security Rule**: Never add `SUPABASE_SERVICE_ROLE_KEY` or PostgreSQL database passwords to `/frontend/.env` or any `VITE_*` variable. Frontend variables are bundled into client-side JavaScript and visible to web browsers.

---

## 3. BACKEND API ENVIRONMENT VARIABLES (`/backend`)

The backend API server runs independently as a Node.js/Express service. In production, configure these in **Render Dashboard $\rightarrow$ Environment Variables** or your cloud container runner:

| Variable Name | Environment | Purpose & Description | Config Location |
| :--- | :--- | :--- | :--- |
| `PORT` | Production & Local | The network port the Express HTTP server binds to (default: `5000`). | Render / Cloud Host / `.env` |
| `FRONTEND_URL` | Production & Local | Comma-separated list of allowed CORS origins (e.g. production domain & localhost). | Render / Cloud Host / `.env` |
| `SUPABASE_URL` | Production & Local | The HTTPS endpoint of the Supabase project. | Render / Cloud Host / `.env` |
| `SUPABASE_ANON_KEY` | Production & Local | The public anonymous Supabase API key. | Render / Cloud Host / `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Production & Local | High-privilege service-role key used strictly on server-side for user provisioning. | Render / Cloud Host / `.env` |

---

## 4. SUPABASE CLOUD DEPENDENCY SPECIFICATION

The production database relies on the following configurations inside the [Supabase Dashboard](https://supabase.com/dashboard/project/nyhnkftlkigoliyogwvp):

### A. PostgreSQL Database Schema
- **Public Tables**: `public.gv_users`, `public.gv_fees_payments`, `public.gv_requests`, `public.gv_communications`, `public.gv_inventory_expenses`, `public.gv_system_settings`.
- **Row Level Security (RLS)**: Must remain enabled on all 6 tables.

### B. Supabase GoTrue Authentication Settings
- **Email Auth**: Enabled under **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**.
- **Site URL**: Configured with production frontend domain (e.g. `https://growvia.vercel.app`).
- **Redirect URLs**: Whitelisted routes including `/`, `/change-password`, `/admin`, `/office`, `/parent`, `/teacher`, `/principal`.
- **Email Templates**: School branded templates for password recovery and invitation emails.

### C. Supabase Storage Buckets
- **Bucket Name**: `system-assets`
- **Access Level**: Public Read (`public: true`).
- **Security Policies**: Authenticated users can insert/update objects; public can view.

---

## 5. LOCAL DEVELOPMENT SETUP INSTRUCTIONS FOR RECIPIENT

For developers setting up the ERP locally from a clean repository clone:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/renechipprojects-source/Growvia.git
   cd Growvia
   ```
2. **Install Monorepo Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Frontend Environment**:
   ```bash
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with valid project Supabase keys
   ```
4. **Configure Backend Environment**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with server port and service keys
   ```
5. **Launch Local Servers**:
   ```bash
   # Terminal 1: Launch Frontend SPA
   npm run frontend:dev

   # Terminal 2: Launch Backend API Server (Optional)
   npm run backend:dev
   ```

---

## 6. PRODUCTION DEPLOYMENT SCRIPTS

The root `package.json` provides unified monorepo build commands:

| Command | Action Performed | Target |
| :--- | :--- | :--- |
| `npm run build` | Builds frontend production bundle (`dist/`) and verifies TypeScript | Vercel / CI/CD |
| `npm run frontend:build` | Compiles frontend SPA bundle into `frontend/dist` | Frontend |
| `npm run backend:build` | Transpiles backend TypeScript into `backend/dist` | Backend |

---

## 7. SECRET HYGIENE & HANDOVER SIGN-OFF

- **Git Tracking Verification**: Confirmed that `.env`, `.env.local`, `.env.production`, and `.env.development` are strictly ignored by `.gitignore`.
- **Audit Result**: Zero private secrets or passwords exist in repository commit history.
- **Handover State**: **100% SECURE & OPERATIONAL**.
