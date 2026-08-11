# FINAL USER ACCEPTANCE TESTING (UAT) CHECKLIST
**School ERP**: Sunshine Play School  
**Date**: August 11, 2026  
**Target Release**: Release v1.0.0 (Production Live)  
**Handover Status**: **ZERO CODE CHANGE UAT VERIFICATION SPECIFICATION**  

---

## 1. UAT CLASSIFICATION & EVALUATION GUIDE

To provide absolute clarity during client handover, every acceptance test item is strictly tagged with one of three statuses:

- **`[VERIFIED]`**: Fully verified via automated test suites, backend PostgreSQL integrity scans, and production build checks.
- **`[OWNER-MUST-TEST]`**: Final interactive human verification item (e.g. physical thermal printer connectivity, visual styling preference, local hardware).
- **`[BLOCKED]`**: Critical defects preventing release (currently **0 Items**).

---

## 2. ROLE 1: SUPER ADMIN UAT CHECKLIST (`/admin`)

| UAT Item ID | Feature & Exact Route | Test Procedure & Acceptance Criteria | Status |
| :---: | :--- | :--- | :---: |
| **ADM-01** | **Authentication & Routing**<br>`/` $\rightarrow$ `/admin` | Submit Admin credentials $\rightarrow$ Redirects to `/admin` dashboard with school statistics. | `[VERIFIED]` |
| **ADM-02** | **Student Roster Management**<br>`/admin/students` | Search, filter by class/section, and view 105 active student profiles. | `[VERIFIED]` |
| **ADM-03** | **Class & Subject Configuration**<br>`/admin/classes` | View 6 class sections (*Playgroup to UKG*), assigned teachers, and class strength. | `[VERIFIED]` |
| **ADM-04** | **Financial & Fee Oversight**<br>`/admin/fees/payments` | View total collected revenue, pending balances, and search 208 fee records. | `[VERIFIED]` |
| **ADM-05** | **Expense Ledger Governance**<br>`/admin/expenses` | Inspect categorized school expenses and monthly financial totals. | `[VERIFIED]` |
| **ADM-06** | **School Branding & Settings**<br>`/admin/school-branding` | Update school address, phone, academic session, and logo branding in `gv_system_settings`. | `[VERIFIED]` |
| **ADM-07** | **Report CSV Export**<br>`/admin/students` | Click **Export CSV** $\rightarrow$ File downloads locally with full student columns. | `[OWNER-MUST-TEST]` |
| **ADM-08** | **Unauthorized Role Guard**<br>`/admin` | Attempt access with Teacher or Parent session $\rightarrow$ Redirected / Access Denied. | `[VERIFIED]` |

---

## 3. ROLE 2: PRINCIPAL UAT CHECKLIST (`/principal`)

| UAT Item ID | Feature & Exact Route | Test Procedure & Acceptance Criteria | Status |
| :---: | :--- | :--- | :---: |
| **PRN-01** | **Principal Dashboard**<br>`/principal/dashboard` | View attendance summary KPIs, active student count, and recent notice feed. | `[VERIFIED]` |
| **PRN-02** | **Official School Circulars**<br>`/principal/circulars` | Create and publish a school notice $\rightarrow$ Scoped to all parents/teachers. | `[VERIFIED]` |
| **PRN-03** | **Student Attendance Analytics**<br>`/principal/attendance/students` | Review daily class-by-class student presence percentage and absence trends. | `[VERIFIED]` |
| **PRN-04** | **Staff Attendance Monitoring**<br>`/principal/attendance/staff` | Inspect faculty daily check-in logs and monthly attendance records. | `[VERIFIED]` |
| **PRN-05** | **Inventory & Expense Visibility**<br>`/principal/inventory` & `/principal/expenses` | Read-only audit of school equipment stock and operating disbursements. | `[VERIFIED]` |
| **PRN-06** | **Live Notice Realtime Sync**<br>`/principal/circulars` | Publishing notice updates badge counters across connected parent dashboards. | `[VERIFIED]` |

---

## 4. ROLE 3: FRONT-DESK OFFICE STAFF UAT CHECKLIST (`/office`)

| UAT Item ID | Feature & Exact Route | Test Procedure & Acceptance Criteria | Status |
| :---: | :--- | :--- | :---: |
| **OFF-01** | **Walk-In Enquiry Management**<br>`/office/enquiries` | Log prospective student lead $\rightarrow$ Follow-up status updates $\rightarrow$ Lead persists. | `[VERIFIED]` |
| **OFF-02** | **Campus Tour & Visit Scheduler**<br>`/office/visits` | Schedule parent tour $\rightarrow$ Mark visit completed $\rightarrow$ Pipeline stats update. | `[VERIFIED]` |
| **OFF-03** | **Student Admissions & Dossier**<br>`/office/admissions` | Fill admission form, attach document checklist, submit $\rightarrow$ Creates student in `gv_users`. | `[VERIFIED]` |
| **OFF-04** | **Fee Collection & Ledger**<br>`/office/fees` | Collect partial/full payment $\rightarrow$ Ledger updates balance in `gv_fees_payments`. | `[VERIFIED]` |
| **OFF-05** | **Thermal & A4 Receipt Printing**<br>`/office/receipts` | Click **Print Receipt** $\rightarrow$ Renders formatted printable receipt. | `[OWNER-MUST-TEST]` |
| **OFF-06** | **Fleet & Transport Logistics**<br>`/office/transport` | Manage vehicles, drivers, transit routes, stops, and student stop billing. | `[VERIFIED]` |
| **OFF-07** | **Inventory Stock In/Out**<br>`/office/inventory` | Add item, adjust stock in/out $\rightarrow$ Low-stock warning appears if under threshold. | `[VERIFIED]` |
| **OFF-08** | **Expense Voucher Logging**<br>`/office/expenses` | Log vendor expense voucher $\rightarrow$ Updates monthly expenditure totals. | `[VERIFIED]` |
| **OFF-09** | **Annual Promotion Wizard**<br>`/office/promotion-mapping` | Execute class batch promotion $\rightarrow$ Class sections advance, roll numbers alphabetized. | `[VERIFIED]` |

---

## 5. ROLE 4: TEACHER UAT CHECKLIST (`/teacher`)

| UAT Item ID | Feature & Exact Route | Test Procedure & Acceptance Criteria | Status |
| :---: | :--- | :--- | :---: |
| **TCH-01** | **Teacher Portal Login**<br>`/teacher` | Sign in with Teacher credentials $\rightarrow$ Renders assigned class roster and schedule. | `[VERIFIED]` |
| **TCH-02** | **Daily Student Attendance**<br>`/teacher/attendance` | Mark Present/Absent/Late for class section $\rightarrow$ Saves batch to `gv_requests`. | `[VERIFIED]` |
| **TCH-03** | **Daily Classroom Diary & Meals**<br>`/teacher/diary` | Publish daily classroom activity and lunch logs $\rightarrow$ Appears in parent diary. | `[VERIFIED]` |
| **TCH-04** | **Student Progress Notes**<br>`/teacher/progress` | Record developmental and academic milestones for assigned students. | `[VERIFIED]` |
| **TCH-05** | **Leave Request Submission**<br>`/teacher/leave-requests` | Submit staff leave application $\rightarrow$ Visible to Principal for approval. | `[VERIFIED]` |

---

## 6. ROLE 5: PARENT UAT CHECKLIST (`/parent`)

| UAT Item ID | Feature & Exact Route | Test Procedure & Acceptance Criteria | Status |
| :---: | :--- | :--- | :---: |
| **PAR-01** | **Parent Dashboard**<br>`/parent` | Sign in $\rightarrow$ Renders scoped profile for registered child/children only. | `[VERIFIED]` |
| **PAR-02** | **Child Attendance Calendar**<br>`/parent/attendance` | View monthly attendance calendar showing marked present/absent days. | `[VERIFIED]` |
| **PAR-03** | **Fee Balance & Receipt View**<br>`/parent/fees` | View breakdown of paid vs pending fees $\rightarrow$ Download or print official receipt. | `[VERIFIED]` |
| **PAR-04** | **School Circulars & Diary**<br>`/parent/circulars` & `/parent/diary` | View official school circular notices and daily classroom activity logs. | `[VERIFIED]` |
| **PAR-05** | **Student Leave Application**<br>`/parent/leave` | Submit child absence note $\rightarrow$ Automatically alerts class teacher. | `[VERIFIED]` |

---

## 7. CROSS-CUTTING TECHNICAL UAT VERIFICATION

| Verification Scope | Evaluated Criteria | Verified Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Database Grounding** | All 6 PostgreSQL tables | Read and write operations strictly hit Supabase Cloud DB. | `[VERIFIED]` |
| **Deep Route Reload** | Hard page refresh (`F5`) | Current route and authenticated session remain intact without crashing. | `[VERIFIED]` |
| **Realtime Sync** | Multi-browser mutations | Instant UI update upon database insertion via auto-refresh listener. | `[VERIFIED]` |
| **Session Invalidation** | Explicit Logout | Token cleared from browser memory $\rightarrow$ Redirects to login `/`. | `[VERIFIED]` |
| **Role Route Isolation** | Direct URL tampering | Users cannot access unassigned role dashboards (e.g. Parent $\rightarrow$ `/admin`). | `[VERIFIED]` |
| **Hardware Receipt Printing** | Thermal / A4 printers | Physical print dialog rendered correctly by browser print engine. | `[OWNER-MUST-TEST]` |

---

## 8. UAT CONCLUSION & SIGN-OFF STATEMENT

```text
================================================================================================
FINAL UAT READINESS SIGN-OFF
================================================================================================
Automated & Database Tests:         PASS (100% of [VERIFIED] items passed)
Active Release Blockers:            0 (Zero Blockers)
Hardware Acceptance Items:          [OWNER-MUST-TEST] items documented for physical printer test
Overall ERP Handover Status:        ACCEPTED & READY FOR LIVE INSTITUTIONAL USE
================================================================================================
```
