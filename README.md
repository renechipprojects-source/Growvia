# Growvia School ERP — Monorepo Architecture

Welcome to the **Growvia School ERP** repository. This project is structured as a unified **Single Repository Monorepo** containing both the `/frontend` web application and the `/backend` API server foundation.

---

## 1. Project Architecture

```
Growvia/
│
├── frontend/                     # Vite + React Web UI Application
│   ├── src/                      # UI Components, Routes, Dashboards & Services
│   ├── public/                   # Static Branding & Asset Files
│   ├── package.json              # Frontend Dependencies & Scripts
│   ├── vite.config.ts            # Vite Configuration
│   ├── tsconfig.json             # Frontend TypeScript Settings
│   └── .env.example              # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── backend/                      # Node.js + Express API Server
│   ├── src/
│   │   └── index.ts              # Express Server listening on process.env.PORT with GET /health
│   ├── package.json              # Express, CORS, Supabase JS & TypeScript
│   ├── tsconfig.json             # Node.js TypeScript Config (outDir: dist)
│   └── .env.example              # PORT, SUPABASE_URL, SUPABASE_ANON_KEY, FRONTEND_URL
│
├── package.json                  # Monorepo Management Scripts
├── .gitignore                    # Environment & Security Exclusions
└── README.md
```

---

## 2. Monorepo Quick Commands

Run all scripts from the repository root:

- **Start Frontend Dev Server**: `npm run frontend:dev`
- **Build Frontend Bundle**: `npm run frontend:build`
- **Start Backend Dev Server**: `npm run backend:dev`
- **Build Backend Server**: `npm run backend:build`
- **Build Entire Monorepo**: `npm run build`

---

## 3. Deployment Strategy (Single Repository / Two Deployments)

```
                    GitHub Repository (Growvia)
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
                        Supabase Database
                         (6 GV_ Tables)
```

- **Frontend (Vercel)**:
  - **Root Directory**: `frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Environment Variables**: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

- **Backend (Render)**:
  - **Root Directory**: `backend`
  - **Build Command**: `npm install && npm run build`
  - **Start Command**: `npm start`
  - **Health Endpoint**: `GET /health` -> `{"status":"ok"}`
  - **Environment Variables**: `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`

- **Database (Supabase)**:
  - **6 Consolidated Tables**: `GV_users`, `GV_inventory_expenses`, `GV_fees_payments`, `GV_communications`, `GV_requests`, `GV_system_settings`.

- **Storage (Cloudflare)**:
  - Object storage for assets and document uploads.

---

## 4. Single Git Commit & Push Workflow

A single push updates both frontend and backend automatically:

```bash
git add .
git commit -m "update Growvia"
git push origin main
```
