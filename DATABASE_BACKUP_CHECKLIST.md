# PRODUCTION DATABASE BACKUP & DISASTER RECOVERY CHECKLIST
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Auditor**: Antigravity Automated Quality & Release Assurance  
**Target Project**: Supabase Production (`nyhnkftlkigoliyogwvp`)  
**Status**: **READ-ONLY SPECIFICATION & HANDOVER GUIDE**  

---

## 1. PRODUCTION BACKEND ENVIRONMENT IDENTIFIERS

```text
================================================================================================
SUPABASE PRODUCTION INFRASTRUCTURE SPECIFICATION
================================================================================================
Supabase Project Ref:               nyhnkftlkigoliyogwvp
Project REST Endpoint:              https://nyhnkftlkigoliyogwvp.supabase.co
Database Engine:                    PostgreSQL (Public Schema)
Core Authoritative Tables:          6 Consolidated Domain Tables
Storage Buckets:                    system-assets (Public assets & student documents)
Authentication Provider:            Supabase GoTrue (JWT Tokens & Email/Password)
================================================================================================
```

---

## 2. AUTHORITATIVE TABLES & LIVE ROW BASELINES

Prior to generating any production backup or disaster recovery archive, verify the exact record counts against the following audited baseline:

| # | Table Name | Business Domain & Record Types | Live Row Baseline | Integrity Constraint |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `public.gv_users` | Students (105), Parents (204), Teachers (11), Admins (3) | **323 Rows** | 100% Unique `login_id` / `email` |
| **2** | `public.gv_fees_payments` | Fee schedules, payments, installments, receipts | **208 Rows** | 100% `student_id` match to `gv_users` |
| **3** | `public.gv_requests` | Enquiries, visits, admissions, attendance, leaves, docs | **32 Rows** | Strict `request_type` partition |
| **4** | `public.gv_communications` | Circulars, daily diary, homework, photo albums | **4 Rows** | Role & class audience scoping |
| **5** | `public.gv_inventory_expenses` | Stock items, expense vouchers, transport fleet | **13 Rows** | Partition: `inventory`, `expense`, `transport_*` |
| **6** | `public.gv_system_settings` | School branding, contact, academic configuration | **1 Row** | Singleton record (`id = 'PRIMARY'`) |

---

## 3. OFFICIAL RECOMMENDED BACKUP PROCEDURES

### Method A: Supabase Dashboard Managed Backups (Zero Overhead)
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard/project/nyhnkftlkigoliyogwvp).
2. Navigate to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Backups**.
3. Under **Scheduled Backups**, confirm automated daily snapshots are active.
4. Click **Download Backup** or **Take Snapshot** for an immediate point-in-time snapshot prior to major system updates.

### Method B: PostgreSQL Native `pg_dump` (Full SQL Dump)
Run the following secure command using standard PostgreSQL client tools (do not expose password in shell history):

```bash
# Export complete schema and data for public tables
pg_dump "postgresql://postgres.[PROJECT-REF]:[DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  --format=custom \
  --file="sunshine_erp_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Method C: Supabase CLI Schema & Data Export
```bash
# 1. Login and link project
npx supabase login
npx supabase link --project-ref nyhnkftlkigoliyogwvp

# 2. Dump schema
npx supabase db dump -f supabase_schema_backup.sql

# 3. Dump data only
npx supabase db dump --data-only -f supabase_data_backup.sql
```

---

## 4. STORAGE BUCKET BACKUP PROCEDURE

- **Bucket Name**: `system-assets`
- **Stored Folders**:
  - `documents/students/` (Admissions proof, birth certificates, Aadhaar)
  - `avatars/` (Student and faculty profile images)
  - `circulars/` (PDF circular notices and principal memos)
  - `activities/` (Class event and gallery photo albums)
- **Backup Action**:
  - Use Supabase CLI or S3-compatible tool (e.g. AWS CLI / Cyberduck) to sync `system-assets` bucket to a secure local folder:
  ```bash
  # Example AWS CLI S3 sync for Supabase Storage
  aws s3 sync s3://nyhnkftlkigoliyogwvp-system-assets ./storage_backup/system-assets/
  ```

---

## 5. POST-BACKUP VERIFICATION CHECKLIST

After generating any backup archive, perform this verification check:

- [ ] **Table Count**: Confirm all 6 core tables are present in the dump file.
- [ ] **Row Count Match**: Confirm row counts match the baseline (323, 208, 32, 4, 13, 1).
- [ ] **Fee Integrity**: Verify zero orphan records (`student_id` in `gv_fees_payments` maps 100% to `gv_users.id`).
- [ ] **RLS & Security Policies**: Confirm Row Level Security policies and grants are preserved in schema definition.
- [ ] **Storage Attachments**: Verify file count in `system-assets` matches database reference URLs.
- [ ] **Archive Encryption**: Store backup archive in an encrypted, access-controlled offline storage or secure AWS S3 bucket.

---

## 6. EMERGENCY DISASTER RECOVERY PROTOCOL

In the event of a critical database failure or accidental data corruption:
1. **Freeze Web Traffic**: Temporarily set application maintenance mode.
2. **Restore PostgreSQL Dump**:
   ```bash
   pg_restore --clean --if-exists -d "postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
     sunshine_erp_backup_YYYYMMDD_HHMMSS.dump
   ```
3. **Validate Foreign Keys & RLS**: Run audit queries against all 6 tables.
4. **Re-enable Web Traffic**: Release application from maintenance mode and verify live login.
