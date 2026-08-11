# SUNSHINE PLAY SCHOOL ERP — OPERATIONS & USER MANUAL
**Audience**: School Administrators, Principals, Front-Desk Office Staff, Faculty & Parents  
**Date of Handover**: August 11, 2026  
**System Version**: Release v1.0.0 (Production Live)  

---

## 1. WELCOME & SYSTEM INTRODUCTION

Welcome to the **Sunshine Play School Cloud ERP System**. This platform provides a centralized, secure single sign-on experience for school leadership, office staff, classroom teachers, and parents.

### The 5 System Roles
1. **Super Admin**: Complete institution-wide governance, financial oversight, faculty profiles, and school branding.
2. **Principal**: Academic leadership, curriculum oversight, class rosters, attendance analytics, and official school circulars.
3. **Office Staff**: Daily front-desk admissions, enquiry leads, visitor passes, fee collection, receipt printing, transport, and inventory.
4. **Teacher**: Classroom attendance marking, daily student diary logs, homework assignments, student progress tracking, and leave requests.
5. **Parent**: Child-specific academic attendance, fee balances, printable payment receipts, homework notices, daily meal/activity diary, and photo galleries.

---

## 2. HOW TO LOG IN & ACCESS YOUR PORTAL

1. Open the school ERP web portal in any modern web browser (Chrome, Edge, Safari, Firefox).
2. Enter your assigned **Login ID** (e.g. `OFFICE001`, `TCH101`, `PAR-1001`) or your registered **Email Address**.
3. Enter your secure password.
4. Click **Sign In**. The system will automatically direct you to your personalized role dashboard.
5. **Forgot Password**: Click *"Forgot Password?"* on the login screen, enter your registered email, and follow the password reset link sent to your inbox.

---

## 3. DAILY SCHOOL OPERATIONS GUIDE

### A. Morning Student Attendance (Class Teachers)
- **Where**: `/teacher/attendance`
- **Steps**:
  1. Select your assigned Class and Section (e.g. *Nursery A*).
  2. Select today's date.
  3. Mark each child as **P** (Present), **A** (Absent), **L** (Late), or **Lv** (Approved Leave).
  4. Click **Save Attendance**.
  5. The system instantly synchronizes and notifies school leadership and parents.

### B. Front-Desk Walk-In Enquiries & Campus Visits (Office Staff)
- **Where**: `/office/enquiries` and `/office/visits`
- **Steps**:
  1. Click **+ Log New Enquiry**.
  2. Enter Child Name, Age, Parent Name, Mobile Number, Interested Class (*Playgroup, Nursery, LKG, UKG*), and Lead Source (*Walk-in, Referral, Social Media*).
  3. If the parent is taking a school tour, open `/office/visits` and click **+ Schedule Campus Visit**.
  4. Once the tour finishes, click **Mark Visit Completed**.

### C. Collecting Fee Payments & Printing Receipts (Office Staff)
- **Where**: `/office/fees`
- **Steps**:
  1. Search for the student by Name or Admission Number.
  2. Click **Collect Payment** on the student's fee card.
  3. Enter the Amount Paid and select Payment Mode (*Cash, UPI, Cheque, Bank Transfer*).
  4. Enter payment reference notes (e.g. UPI Transaction ID).
  5. Click **Record Payment**.
  6. Click **Print Receipt** to generate an instant, branded A4 or thermal receipt for the parent.

### D. Publishing Daily Classroom Diary & Meals (Teachers)
- **Where**: `/teacher/diary`
- **Steps**:
  1. Select your assigned Class and Section.
  2. Enter today's classroom activities, snacks/meals provided, nap times, and special observations.
  3. Click **Publish Daily Diary**.
  4. Parents will immediately see today's entry on their `/parent/diary` screen.

---

## 4. MONTHLY ADMINISTRATIVE OPERATIONS

### A. Monthly Fee Reconciliation & Defaulter Tracking (Office & Admin)
- **Where**: `/office/fees` and `/admin/fees/payments`
- **Actions**:
  - Filter ledger by **Pending** or **Partial** status to view outstanding balances.
  - Review total fees scheduled vs. total collected revenue.
  - Export monthly fee collection logs to CSV for school bookkeeping.

### B. Transport & Bus Route Management (Office Staff)
- **Where**: `/office/transport`
- **Actions**:
  - **Buses & Vehicles**: Register new vans/buses, update seating capacity, and inspect active fleet status.
  - **Drivers & Staff**: Maintain driver phone numbers, verified heavy vehicle license records, and click-to-call links.
  - **Bus Routes & Stops**: Build transit corridors and designate morning/afternoon pickup stops with arrival times.
  - **Student Bus Assignments**: Allocate students to routes, assign bus stops, and apply monthly transport fee add-ons.

### C. Inventory Stock Audits & Low-Stock Alerts (Office & Principal)
- **Where**: `/office/inventory`
- **Actions**:
  - Review stock counts for classroom stationery, first aid supplies, uniforms, and art materials.
  - Items falling below their minimum alert threshold are automatically tagged with an amber **Low Stock** badge.
  - Click **Stock In** to record newly received vendor shipments.

### D. Expense Voucher Logging (Office Staff)
- **Where**: `/office/expenses`
- **Actions**:
  - Click **+ Add Expense Voucher**.
  - Select Category (*Classroom Supplies, Utilities, Facility Maintenance, Event Expenses, Staff Welfare*).
  - Enter Vendor / Paid To, Amount, Transaction Date, and Payment Method.
  - Review monthly expense totals on `/admin/expenses`.

---

## 5. ANNUAL & ACADEMIC SESSION OPERATIONS

### A. New Student Admissions & Document Verification (Office Staff)
- **Where**: `/office/admissions`
- **Actions**:
  1. Fill out the formal admission form (or click **Convert to Admission** from an existing enquiry).
  2. Input medical details, allergies, and emergency doctor contact.
  3. Upload required student documents:
     - Birth Certificate
     - Parent Aadhaar / ID Proof
     - Passport Size Photo
     - Vaccination / Immunization Record
     - Transfer Certificate (TC)
  4. Submit to provision the student record, assign roll number, and generate parent login credentials.

### B. Annual Student Promotion Wizard (Office Staff & Principal)
- **Where**: `/office/promotion-mapping` and `/office/students`
- **Actions**:
  1. Review default class progression rules (*Playgroup $\rightarrow$ Nursery $\rightarrow$ LKG $\rightarrow$ UKG $\rightarrow$ Grade 1*).
  2. In the student directory, click **Annual Promotion Wizard**.
  3. Select Source Class and Target Academic Session (*e.g., 2026-27*).
  4. Mark eligible students as **Promoted**, **Retained**, or **Graduated**.
  5. Click **Execute Promotion Batch**. The system automatically updates student grade sections, resets sequential roll numbers alphabetically, and archives promotion history.

---

## 6. ROLE PERMISSIONS & ACCESS MATRIX

| ERP Feature / Module | Super Admin | Principal | Office Staff | Teacher | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **School Governance & Branding** | Full Control | View Only | No Access | No Access | No Access |
| **Student Admissions & Enquiries** | Full Control | Full Control | Full Control | No Access | No Access |
| **Fee Collection & Receipts** | Full Control | View Totals | Full Control | No Access | Child Only |
| **Student Attendance Marking** | View All | View All | View All | Class Only | Child Only |
| **Staff Attendance Check-In** | Full Control | Full Control | Full Control | No Access | No Access |
| **Class & Faculty Assignment** | Full Control | Full Control | Full Control | Assigned Only| No Access |
| **Annual Student Promotions** | Full Control | Full Control | Full Control | No Access | No Access |
| **Fleet & Transport Logistics** | View Totals | View Totals | Full Control | No Access | Assigned Bus |
| **School Circulars & Notices** | Full Control | Full Control | View Only | View Only | View Only |
| **Daily Classroom Diary** | View All | View All | View All | Assigned Class| Child Only |
| **Inventory & Expense Vouchers** | Full Control | Full Control | Full Control | No Access | No Access |
| **Data Exports & CSV Reports** | Full Control | Full Control | Full Control | No Access | No Access |

---

## 7. DATA EXPORTS & PRINTING INSTRUCTIONS

### Exporting Reports to CSV / Excel
1. Open `/admin/students`, `/admin/expenses`, or `/admin/attendance/students`.
2. Apply any desired class or date range filters.
3. Click the **Export CSV** button in the top right corner.
4. The spreadsheet will automatically download to your computer.

### Printing Fee Receipts & Student Profiles
1. On `/office/receipts` or `/office/fees`, click the **Print** icon on any receipt.
2. Select your printer (*Standard A4 or Thermal Receipt Printer*).
3. Receipt margins and school branding are pre-formatted for clean, professional output.

---

## 8. BACKUP & DATA RECOVERY PROCEDURES

- **Automated Cloud Backups**: The Supabase production database takes daily automated snapshots.
- **Monthly Manual Snapshot**: On the 1st of every month, the School Administrator should log into the [Supabase Dashboard](https://supabase.com/dashboard/project/nyhnkftlkigoliyogwvp) $\rightarrow$ **Database** $\rightarrow$ **Backups** and download an offline `.sql` / `.dump` file to secure school storage.
- **Document Backup**: Download a local copy of the `system-assets` storage bucket containing student admission documents and photo albums.

---

## 9. COMMON TROUBLESHOOTING & EMERGENCY ESCALATION

### Issue 1: Staff or Parent Forgot Password
- **Solution**:
  1. Office staff can open `/office/parent-credentials` or `/office/teacher-credentials`.
  2. Search for the user and click **Reset Password**.
  3. Provide the temporary password or instruct the user to use *"Forgot Password?"* on the login screen.

### Issue 2: Offline / Connection Warning Banner Appears
- **Solution**:
  1. Check your local internet connection / Wi-Fi router.
  2. The ERP operates strictly with the live cloud database. When internet connection restores, click **Retry** or press `F5` to re-synchronize.

### Issue 3: Duplicate Student Roll Numbers After Promotion
- **Solution**:
  1. Open `/admin/students`.
  2. Click **Alphabetize & Sort Roll Numbers**.
  3. The system will sequentially renumber students `1, 2, 3...` alphabetically within each section.

---

## 10. EMERGENCY ESCALATION CONTACT HIERARCHY

| Escalation Tier | Role / Personnel | Responsibility Area |
| :--- | :--- | :--- |
| **Tier 1: Front Desk** | Front Office Manager | Parent login queries, daily receipt re-prints, walk-in leads |
| **Tier 2: Academic** | School Principal | Class promotions, teacher assignments, official circulars |
| **Tier 3: System Admin** | Lead IT Administrator | Role credentials, staff password resets, inventory categories |
| **Tier 4: Infrastructure**| Cloud Technical Lead | Supabase database restore, custom domain DNS, SSL certificates |
