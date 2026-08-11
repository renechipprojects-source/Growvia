# PRODUCTION DATABASE BACKUP & DISASTER RECOVERY CHECKLIST
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Auditor**: Antigravity Automated Quality & Release Assurance  
**Target Project**: Supabase Production (`nyhnkftlkigoliyogwvp`)  
**Status**: **READ-ONLY SPECIFICATION & HANDOVER GUIDE**  

---

## 1. BACKUP ENVIRONMENT VERIFICATION & PERMISSION STATUS

```text
================================================================================================
BACKUP VERIFICATION & CAPABILITY STATEMENT
================================================================================================
Supabase Data API Access:           VERIFIED (Read access to all 6 tables via @supabase/supabase-js)
Supabase Management API Access:     NOT AVAILABLE (Requires Project Owner SUPABASE_ACCESS_TOKEN)
Infrastructure Shell / pg_dump:     NOT AVAILABLE (Requires direct DB Pooler password)
Managed Backup / PITR Status:       PENDING PROJECT OWNER VERIFICATION IN SUPABASE DASHBOARD
Disaster Recovery Readiness:        READY (Row baselines, schema definition & steps documented)
================================================================================================
```

> [!IMPORTANT]
> **Audit Disclosure**: Automated agents in this client workspace have data access to verify table schemas and row baselines via public REST APIs, but do **NOT** have administrative access to the Supabase Cloud Management control plane. As a result, whether Point-in-Time Recovery (PITR) or daily automated snapshots are active on the Supabase infrastructure cannot be programmatically confirmed from within this environment without project owner credentials. The project owner must perform the manual dashboard verification steps below.

---

## 2. PRODUCTION INFRASTRUCTURE IDENTIFIERS

| Parameter | Live Value | Notes |
| :--- | :--- | :--- |
| **Supabase Project Ref** | `nyhnkftlkigoliyogwvp` | Production Project ID |
| **Project Endpoint** | `https://nyhnkftlkigoliyogwvp.supabase.co` | REST & Auth API URL |
| **Database Engine** | PostgreSQL (Public Schema) | Consolidated 6-Table Architecture |
| **Storage Bucket** | `system-assets` | Document proofs, avatars, circular PDFs |
| **Auth Service** | Supabase GoTrue | JWT Tokens & Server-side validation |

---

## 3. AUDITED TABLE BASELINES (FOR RESTORE VERIFICATION)

When verifying any database backup, restore, or export, the record counts must exactly match the audited live baseline:

| # | Table Name | Business Domain & Data Partitioning | Live Row Baseline | Integrity Requirement |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `public.gv_users` | Students (105), Parents (204), Teachers (11), Admins (3) | **323 Rows** | 100% Unique `login_id` / `email` |
| **2** | `public.gv_fees_payments` | Fee schedules, payments, installments, receipts | **208 Rows** | 100% `student_id` match to `gv_users` |
| **3** | `public.gv_requests` | Enquiries, visits, admissions, attendance, leaves, docs | **32 Rows** | Strict `request_type` partition |
| **4** | `public.gv_communications` | Circulars, daily diary, homework, photo albums | **4 Rows** | Role & class audience scoping |
| **5** | `public.gv_inventory_expenses` | Stock items, expense vouchers, transport fleet | **13 Rows** | Partition: `inventory`, `expense`, `transport_*` |
| **6** | `public.gv_system_settings` | School branding, contact, academic configuration | **1 Row** | Singleton record (`id = 'PRIMARY'`) |

---

## 4. EXACT MANUAL STEPS FOR THE PROJECT OWNER

The project owner must perform the following actions in the Supabase Dashboard to confirm and download the production backup:

### Step 1: Verify Automated Scheduled Backups
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/nyhnkftlkigoliyogwvp).
2. In the left navigation sidebar, click on **Settings (Gear Icon)** $\rightarrow$ **Database**.
3. Scroll down to the **Backups** section.
4. Verify that **Scheduled Backups** displays active daily automated snapshots.

### Step 2: Check Point-In-Time Recovery (PITR) Availability
- Under **Backups**, check if **Point in Time Recovery (PITR)** is enabled (available on Pro/Enterprise plans).
- If enabled, verify the retention window (e.g. 7 days or 30 days).

### Step 3: Download an Immediate Offline Backup Dump
1. Under **Scheduled Backups**, locate the most recent daily backup snapshot.
2. Click **Download** to save the `.sql` or `.dump` file to an encrypted offline drive or secure company storage.
3. If using the command line with database administrator credentials:
   ```bash
   # Export complete schema and data using PostgreSQL pg_dump
   pg_dump "postgresql://postgres.nyhnkftlkigoliyogwvp:[YOUR-DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
     --schema=public \
     --clean \
     --if-exists \
     --format=custom \
     --file="sunshine_erp_backup_$(date +%Y%m%d).dump"
   ```

### Step 4: Backup the `system-assets` Storage Bucket
1. In the Supabase Dashboard sidebar, click on **Storage** $\rightarrow$ **Buckets**.
2. Select `system-assets` and verify folder trees: `documents/students/`, `avatars/`, `circulars/`, `activities/`.
3. Use an S3-compatible client (or Supabase CLI) to download an offline archive of all uploaded assets.

---

## 5. POST-BACKUP INTEGRITY VERIFICATION CHECKLIST

After the project owner downloads the backup file, verify the following:

- [ ] **Archive Non-Empty**: The downloaded `.dump` or `.sql` file size is non-zero and unpacks without errors.
- [ ] **Table Count**: Dump contains definitions for all 6 tables (`gv_users`, `gv_fees_payments`, `gv_requests`, `gv_communications`, `gv_inventory_expenses`, `gv_system_settings`).
- [ ] **Total Row Count**: Total restored records equal exactly **581 rows** ($323 + 208 + 32 + 4 + 13 + 1$).
- [ ] **Fee Linkage Rate**: 100% of fee rows map to active student user IDs (0 orphans).
- [ ] **RLS & Security Rules**: Row Level Security policies and role grants are intact in the schema.
- [ ] **Storage Sync**: Storage assets mirror all referenced URLs in `gv_communications` and `gv_requests`.

---

## 6. EMERGENCY RESTORE PROCEDURE

In the event disaster recovery is required:
1. Put the web frontend into temporary maintenance mode.
2. Restore the database dump:
   ```bash
   pg_restore --clean --if-exists -d "postgresql://postgres.nyhnkftlkigoliyogwvp:[DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
     sunshine_erp_backup_YYYYMMDD.dump
   ```
3. Re-verify the baseline counts using the checklist above.
4. Disable maintenance mode and resume operations.
