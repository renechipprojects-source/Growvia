# PRODUCTION WORKFLOW VERIFICATION: ENQUIRY & VISITOR PIPELINE
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Auditor**: Antigravity Automated Verification Agent  
**Environment**: Production Live Supabase + TanStack React SPA  

---

## 1. EXECUTIVE LIFECYCLE SUMMARY

A comprehensive end-to-end trace and verification of the complete **Enquiry Capture $\rightarrow$ Campus Visit Scheduling $\rightarrow$ Status Progression $\rightarrow$ Follow-up Tracking $\rightarrow$ Admission Conversion $\rightarrow$ Student Roster Linkage $\rightarrow$ Multi-Role Realtime Analytics (Office, Admin, Principal)** workflow was conducted on live Supabase data.

```text
================================================================
ENQUIRY & VISITOR WORKFLOW AUDIT SUMMARY
================================================================
Authoritative Database Table:       public.gv_requests
Request Type Isolation:             enquiry, visitor, admission, leave, marks
Lead Progression Lifecycle:         New -> Follow-up -> Visit Scheduled -> Completed -> Enrolled
Admission Conversion Flow:          Seamless Prefill into /office/admissions
Database Synchronization:           Direct Supabase REST API + Realtime Upsert
Storage Architecture:               Authoritative Supabase PostgreSQL
Multi-Role Dashboards Scoped:       Office Staff, Admin, Principal
Production Build Status:            PASS (0 TypeScript / Vite Errors)
================================================================
```

---

## 2. DETAILED LIFECYCLE STAGES & TRACE

### Stage 1: Lead Capture & Enquiry Ingestion
- **Route**: `/office/enquiries`
- **Database Entity**: `public.gv_requests` (`request_type = 'enquiry'`)
- **Workflow**:
  - Front office logs prospective parent details (*Child Name, Age, Parent Name, Indian Mobile Phone, Interested Class, Lead Source: Walk-in / Referral / Social Media / Billboard*).
  - Record persists directly to `gv_requests` with status `"New"`.

### Stage 2: Campus Visit Scheduling & Front-Desk Log
- **Route**: `/office/visits`
- **Database Entity**: `public.gv_requests` (`request_type = 'enquiry'` & `request_type = 'visitor'`)
- **Workflow**:
  - Office staff schedules campus tours and classroom observation visits (*Date, Scheduled Time Slot, Counselor Notes*).
  - Status updates to `"Visit Scheduled"`.
  - When parents arrive, office marks `"Visit Completed"`, unlocking formal admission conversion.

### Stage 3: Follow-Up Management & Status Lifecycle
- **Status Enum Progression**:
  1. `New`: Newly captured enquiry lead.
  2. `Contacted`: Initial phone call / WhatsApp follow-up completed.
  3. `Visit Scheduled`: Campus tour booked.
  4. `Visit Completed`: Parents visited the campus.
  5. `Documents Pending`: Awaiting birth certificate / Aadhaar.
  6. `Admission Approved`: Principal approval granted.
  7. `Enrolled`: Converted to formal enrolled student in `gv_users`.
  8. `Dropped`: Cold lead with documented rejection reason.

### Stage 4: Conversion to Enrolled Student
- **Workflow**:
  1. Clicking "Convert to Admission" on `/office/enquiries` routes to `/office/admissions?enquiryId=...`.
  2. Child name, parent contact, and class prefill automatically.
  3. Office submits formal application $\rightarrow$ Provisions new student & parent in `public.gv_users` and creates fee schedule in `public.gv_fees_payments`.
  4. Enquiry status in `gv_requests` marks `"Enrolled"`.

### Stage 5: Multi-Role Dashboard Pipeline Metrics
- **Office Dashboard (`/office`)**: Active daily enquiries, scheduled tours for today, conversion conversion rate KPI.
- **Admin Dashboard (`/admin`)**: School-wide admissions funnel and lead acquisition channel breakdown.
- **Principal Dashboard (`/principal/dashboard`)**: Class capacity vs. prospective enquiry demand.

---

## 3. MULTI-ROLE VERIFICATION MATRIX

| User Role | Route Tested | Primary Actions | Supabase Request Type | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Office Staff** | `/office/enquiries` | Log leads, track status, convert to admission | `request_type = 'enquiry'` | **PASS** |
| **Office Staff** | `/office/visits` | Schedule visits, check-in prospective parents | `request_type = 'enquiry'` | **PASS** |
| **Office Staff** | `/office/admissions` | Ingest converted enquiry into student roster | `gv_requests` + `gv_users` | **PASS** |
| **Admin** | `/admin` | Lead conversion metrics and pipeline counts | `request_type = 'enquiry'` | **PASS** |
| **Principal** | `/principal/dashboard` | Track enrollment trends and class demand | `request_type = 'enquiry'` | **PASS** |

---

## 4. PERSISTENCE & DATA-TRUTH CONCLUSION

- **Zero Mock Data / Client Fallbacks**: All enquiries and visits query live from `public.gv_requests`.
- **Navigation & Browser Reload Resilience**: Realtime listeners `sunshine-auto-refresh-enquiries` and `sunshine-auto-refresh-visits` keep views synchronized.
- **Workflow State**: **100% VERIFIED & PRODUCTION READY**.
