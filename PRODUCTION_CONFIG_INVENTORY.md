# SUPABASE & PRODUCTION CONFIGURATION INVENTORY
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Document Type**: Architectural & Configuration Inventory (Read-Only)  
**Schema Architecture**: 6 Consolidated Authoritative PostgreSQL Tables  

---

## 1. EXECUTIVE OVERVIEW

This document outlines the complete architectural inventory of the Supabase integration across the Sunshine ERP frontend and backend. It maps every authoritative `gv_*` database table to its CRUD operations, consumer services, user routes, authentication handlers, storage buckets, and environment variables.

---

## 2. DATABASE TABLES & CRUD OPERATION MATRIX

### 1. `public.gv_users`
- **Primary Responsibility**: Master user roster, identity records, role assignments, student/teacher/parent directory, profile metadata, credentials.
- **Supported CRUD Operations**: `SELECT`, `INSERT`, `UPDATE`, `UPSERT`, `DELETE`
- **Consumer Service Modules**:
  - `lib/userService.ts`: User lifecycle CRUD, role-scoped queries, roster lookups.
  - `lib/supabaseService.ts`: Student roster (`fetchStudents`), Teacher directory (`fetchTeachers`), Class enrollments.
  - `lib/supabaseAuth.ts`: Primary user credential resolution and profile loading upon login.
  - `lib/auth.ts`: Password updates, session role guards, identity metadata.
  - `lib/credentials.ts`: Office-issued parent and teacher credential linking and provisioning.
  - `lib/classAssignmentContext.tsx`: Class teacher assignments and subject teacher allocations.
  - `lib/promotionStore.ts`: Multi-stage student grade promotions and roll number updates.
  - `lib/dashboardStatsService.ts`: Live KPI aggregation for active student/teacher counts.
  - `components/admin/DashboardHealthCards.tsx`: Realtime user roster health check metrics.
- **Consumer Route Modules**:
  - `/admin/students`, `/admin/parents`, `/admin/teachers`, `/admin/staff`
  - `/principal/students`, `/principal/teachers`, `/principal/classes`
  - `/office/students`, `/office/admissions`, `/office/class-assignment`, `/office/promotion-mapping`
  - `/teacher/my-class`, `/teacher/my-subjects`, `/parent/child`

---

### 2. `public.gv_fees_payments`
- **Primary Responsibility**: Student fee schedules, installment allocations, payment transactions, discount structures, receipts.
- **Supported CRUD Operations**: `SELECT`, `INSERT`, `UPSERT`
- **Consumer Service Modules**:
  - `lib/feePaymentService.ts`: Fee ledger creation, transaction recording, receipt generation.
  - `lib/supabaseService.ts`: Merged fee calculations (`fetchMergedFeeLedgers`), historical payment lookups (`fetchFees`).
  - `lib/dashboardStatsService.ts`: Revenue metrics, collected vs pending balance calculations.
  - `components/admin/DashboardHealthCards.tsx`: Fee collection health cards and payment trends.
- **Consumer Route Modules**:
  - `/admin/fees/payments`, `/admin/fees/structure`, `/admin/fees/defaulters`
  - `/principal/fees`, `/office/fees`, `/office/receipts`
  - `/parent/fees`, `/parent/receipts`

---

### 3. `public.gv_requests`
- **Primary Responsibility**: Workflow requests, admission applications, enquiry log, visitor records, leave applications, daily student marks/progress, document uploads, audit logs.
- **Supported CRUD Operations**: `SELECT`, `INSERT`, `UPDATE`, `UPSERT`, `DELETE`
- **Consumer Service Modules**:
  - `lib/requestService.ts`: Generic workflow request dispatch and state transitions (`Pending`, `Approved`, `Rejected`).
  - `lib/enquiryContext.tsx`: Visitor enquiry lead tracker and follow-up CRM.
  - `lib/leaveContext.tsx`: Staff and student leave management.
  - `lib/attendanceStore.ts`: Daily student and staff attendance batch logging.
  - `lib/studentDocsContext.tsx`: Verification tracking of required admission documents.
  - `lib/masterClassesStore.ts`: Class configuration and academic progress records.
  - `lib/passwordResets.ts`: Password reset helpdesk request tickets.
  - `lib/auditLogStore.ts`: System operational event logs.
- **Consumer Route Modules**:
  - `/office/enquiries`, `/office/visits`, `/office/admissions`
  - `/admin/attendance/students`, `/admin/attendance/staff`, `/admin/events`
  - `/principal/attendance/students`, `/principal/attendance/staff`, `/principal/leave-requests`
  - `/teacher/attendance`, `/teacher/progress`, `/teacher/leave-requests`
  - `/parent/attendance`, `/parent/leave`, `/parent/progress`

---

### 4. `public.gv_communications`
- **Primary Responsibility**: School circulars, urgent announcements, daily diary, homework assignments, class messages, photo albums/galleries.
- **Supported CRUD Operations**: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- **Consumer Service Modules**:
  - `lib/communicationService.ts`: Multi-role broadcast announcements and circular dispatcher.
  - `lib/messagesStore.ts`: Two-way messaging between parents, teachers, and school administration.
  - `lib/homeworkStore.ts`: Daily subject homework assignments and submission tracking.
  - `lib/activitiesStore.ts`: School activity photo albums and event media.
  - `lib/circularReadStore.ts`: Per-user circular acknowledgement tracking.
- **Consumer Route Modules**:
  - `/admin/circulars`, `/admin/messages`
  - `/principal/circulars`, `/principal/messages`
  - `/office/circulars`, `/office/messages`
  - `/teacher/diary`, `/teacher/activities`, `/teacher/messages`
  - `/parent/circulars`, `/parent/diary`, `/parent/activities`, `/parent/messages`

---

### 5. `public.gv_inventory_expenses`
- **Primary Responsibility**: Consumable school inventory items, operating expense vouchers, vendor logs, transport fleet (vehicles, drivers, routes, allocations).
- **Supported CRUD Operations**: `SELECT`, `INSERT`, `UPDATE`, `UPSERT`, `DELETE`
- **Consumer Service Modules**:
  - `lib/inventoryExpenseService.ts`: Expense voucher creation, stock quantity adjustments.
  - `lib/inventoryContext.tsx`: Item catalog management and stock alerts.
  - `modules/transport/transportStore.ts`: Transport fleet management (`transport_vehicle`, `transport_driver`, `transport_route`, `transport_allocation`).
- **Consumer Route Modules**:
  - `/admin/inventory`, `/admin/expenses`
  - `/principal/inventory`, `/principal/expenses`
  - `/office/inventory`, `/office/expenses`, `/office/transport`

---

### 6. `public.gv_system_settings`
- **Primary Responsibility**: Singleton system branding (`id = 'PRIMARY'`), school logo, contact details, academic year, theme preferences.
- **Supported CRUD Operations**: `SELECT`, `UPSERT`
- **Consumer Service Modules**:
  - `lib/developerSettingsStore.ts`: School branding and global configuration loader.
  - `lib/autoRefreshContext.tsx`: Realtime branding synchronization.
- **Consumer Route Modules**:
  - `/` (Login Page Branding)
  - `/admin/school-branding` (School Info & Customization)
  - Layout Header & Navigation Sidebar

---

## 3. SUPABASE AUTH & IDENTITY METHODS

The following GoTrue authentication methods are utilized across the application:

| Auth Method | Location | Purpose |
| :--- | :--- | :--- |
| `supabase.auth.signInWithPassword` | `lib/supabaseAuth.ts` | Authenticates email/password against Supabase Auth engine. |
| `supabase.auth.signUp` | `lib/supabaseAuth.ts` | Programmatic account initialization for new users. |
| `supabase.auth.updateUser` | `lib/auth.ts` | Secure user self-service password update. |
| `supabase.auth.signOut` | `lib/auth.ts` | Terminates active user session and revokes JWT tokens. |

---

## 4. STORAGE BUCKETS

| Storage Bucket Name | Access Model | Primary Assets Stored |
| :--- | :--- | :--- |
| `system-assets` | Public Read / Authenticated Write | School branding logos, user avatars, student photos, circular attachments, activity gallery photos. |

---

## 5. ENVIRONMENT VARIABLES CONFIGURATION

The client application requires the following environment variables configured in `.env` / deployment settings:

| Environment Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Supabase project REST & Realtime gateway URL (e.g. `https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Public anonymous client JWT key for frontend browser access. |
| `VITE_API_URL` / `VITE_API_BASE_URL` | Optional | Backend provisioning server endpoint for administrative user provisioning. |

---

## 6. DATABASE SCHEMA & DDL FILES

The repository maintains authoritative PostgreSQL schema definitions in the following repository files:

1. [consolidated_schema.sql](file:///c:/Users/acer/Documents/erp-polish-main/frontend/src/supabase/consolidated_schema.sql): Authoritative DDL defining the 6 consolidated tables (`gv_users`, `gv_fees_payments`, `gv_requests`, `gv_communications`, `gv_inventory_expenses`, `gv_system_settings`), indexes, and Row-Level Security policies.
2. [schema.sql](file:///c:/Users/acer/Documents/erp-polish-main/frontend/src/supabase/schema.sql): Historical module migration references.
