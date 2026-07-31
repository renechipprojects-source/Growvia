-- ====================================================================
-- SUNSHINE / GROWVIA SCHOOL ERP — CONSOLIDATED BUSINESS MODULES SCHEMA
-- Module Structure:
-- 1. users              (profiles, students, teachers)
-- 2. inventory_expenses (inventory_items, expenses)
-- 3. fees_payments      (fees, receipts)
-- 4. communications     (circulars, messages)
-- 5. requests           (leave_requests, enquiries)
-- ====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CONSOLIDATED TABLES

-- A. USERS MODULE (Profiles, Students, Teachers)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(100) PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    login_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'parent', -- admin, principal, office, accountant, teacher, parent, developer, student
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    mobile VARCHAR(50),
    photo_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(20) DEFAULT 'Boy',
    address TEXT,
    admission_no VARCHAR(50),
    employee_id VARCHAR(50),
    class_name VARCHAR(50),
    section VARCHAR(10),
    subject VARCHAR(100),
    designation VARCHAR(100),
    house VARCHAR(50) DEFAULT 'Red',
    joining_date DATE DEFAULT CURRENT_DATE,
    parent_name VARCHAR(150),
    parent_id VARCHAR(100),
    fee_status VARCHAR(50) DEFAULT 'Pending',
    attendance_pct NUMERIC(5,2) DEFAULT 95.0,
    experience INT DEFAULT 0,
    branch VARCHAR(100) DEFAULT 'Main Branch',
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_login_id ON public.users(login_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_class_section ON public.users(class_name, section);

-- B. INVENTORY + EXPENSES MODULE
CREATE TABLE IF NOT EXISTS public.inventory_expenses (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('IE-' || substring(uuid_generate_v4()::text, 1, 8)),
    record_type VARCHAR(50) NOT NULL, -- 'inventory' | 'expense'
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount_or_unit_cost NUMERIC(12,2) DEFAULT 0.00,
    quantity INT DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'pcs',
    min_stock INT DEFAULT 0,
    supplier_or_paid_to VARCHAR(150),
    payment_method VARCHAR(50) DEFAULT 'Cash', -- Cash, UPI, Bank Transfer
    transaction_date DATE DEFAULT CURRENT_DATE,
    receipt_ref VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_expenses_type ON public.inventory_expenses(record_type);
CREATE INDEX IF NOT EXISTS idx_inventory_expenses_category ON public.inventory_expenses(category);

-- C. FEES + RECEIPTS MODULE
CREATE TABLE IF NOT EXISTS public.fees_payments (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('FP-' || substring(uuid_generate_v4()::text, 1, 8)),
    record_type VARCHAR(50) NOT NULL, -- 'fee_schedule' | 'payment_receipt'
    student_id VARCHAR(100) NOT NULL,
    student_name VARCHAR(150),
    class_name VARCHAR(50),
    fee_type VARCHAR(100) NOT NULL,
    academic_year VARCHAR(50) DEFAULT '2024-2025',
    installment VARCHAR(50),
    amount_due NUMERIC(12,2) DEFAULT 0.00,
    amount_paid NUMERIC(12,2) DEFAULT 0.00,
    balance NUMERIC(12,2) DEFAULT 0.00,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Cash', -- Cash, UPI, Bank Transfer
    receipt_number VARCHAR(100),
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fees_payments_student ON public.fees_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_payments_type ON public.fees_payments(record_type);

-- D. COMMUNICATIONS MODULE (Circulars + Messages)
CREATE TABLE IF NOT EXISTS public.communications (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('COM-' || substring(uuid_generate_v4()::text, 1, 8)),
    message_type VARCHAR(50) NOT NULL, -- 'circular' | 'general_message'
    title VARCHAR(250),
    body TEXT NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(150),
    sender_role VARCHAR(50),
    recipient_role VARCHAR(50) DEFAULT 'all',
    recipient_user_id VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'normal',
    attachment_url TEXT,
    read_status BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communications_type ON public.communications(message_type);
CREATE INDEX IF NOT EXISTS idx_communications_sender ON public.communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_communications_recipient ON public.communications(recipient_user_id);

-- E. REQUESTS MODULE (Leave Requests + Enquiries)
CREATE TABLE IF NOT EXISTS public.requests (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('REQ-' || substring(uuid_generate_v4()::text, 1, 8)),
    request_type VARCHAR(50) NOT NULL, -- 'leave' | 'enquiry'
    applicant_or_child_name VARCHAR(150) NOT NULL,
    parent_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    gender VARCHAR(20),
    dob DATE,
    leave_type_or_interested_class VARCHAR(100),
    start_date DATE,
    end_date DATE,
    reason_or_notes TEXT,
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, FollowUp, Enrolled, Dropped
    follow_up_date DATE,
    assigned_staff VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);

-- 3. MIGRATION STATEMENTS FROM LEGACY TABLES TO CONSOLIDATED MODULES

-- Populate users from profiles
INSERT INTO public.users (id, auth_user_id, login_id, email, full_name, role, status, mobile, photo_url, must_change_password, created_at, updated_at)
SELECT id::text, auth_user_id, login_id, email, full_name, role::text, status, mobile, photo_url, must_change_password, created_at, updated_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Populate users from students
INSERT INTO public.users (id, login_id, email, full_name, role, status, admission_no, class_name, section, parent_name, parent_id, mobile, gender, house, joining_date, fee_status, photo_url, attendance_pct, branch, created_at)
SELECT id, id, COALESCE(id || '@sunshine.edu'), name, 'student', 'active', admission_no, class_name, section, parent_name, parent_id, phone, gender::text, house::text, admission_date, fee_status::text, avatar, attendance_pct, branch, created_at
FROM public.students
ON CONFLICT (id) DO UPDATE SET
  class_name = EXCLUDED.class_name,
  section = EXCLUDED.section,
  parent_name = EXCLUDED.parent_name,
  fee_status = EXCLUDED.fee_status;

-- Populate users from teachers
INSERT INTO public.users (id, login_id, email, full_name, role, status, employee_id, class_name, subject, mobile, experience, joining_date, photo_url, branch, created_at)
SELECT id, id, email, name, 'teacher', 'active', id, class_name, subject, phone, experience, joined_date, avatar, branch, created_at
FROM public.teachers
ON CONFLICT (id) DO UPDATE SET
  class_name = EXCLUDED.class_name,
  subject = EXCLUDED.subject,
  mobile = EXCLUDED.mobile;

-- Populate inventory_expenses from inventory_items
INSERT INTO public.inventory_expenses (id, record_type, title, category, quantity, unit, min_stock, supplier_or_paid_to, created_at, updated_at)
SELECT id, 'inventory', item_name, category, quantity, unit, min_stock, supplier, created_at, updated_at
FROM public.inventory_items
ON CONFLICT (id) DO NOTHING;

-- Populate inventory_expenses from expenses
INSERT INTO public.expenses (id, record_type, title, category, amount_or_unit_cost, payment_method, transaction_date, receipt_ref, notes, created_by, created_at)
SELECT id, 'expense', category, category, amount, payment_method, expense_date, receipt_ref, notes, created_by, created_at
FROM public.expenses
ON CONFLICT (id) DO NOTHING;

-- Populate fees_payments from fees
INSERT INTO public.fees_payments (id, record_type, student_id, fee_type, academic_year, amount_due, amount_paid, balance, status, created_at)
SELECT id, 'fee_schedule', student_id, fee_type, academic_year, amount_due, amount_paid, balance, status, created_at
FROM public.fees
ON CONFLICT (id) DO NOTHING;

-- Populate fees_payments from receipts
INSERT INTO public.fees_payments (id, record_type, student_id, student_name, class_name, fee_type, amount_paid, payment_date, payment_method, receipt_number, transaction_ref, status, recorded_by, created_at)
SELECT id, 'payment_receipt', student_id, student_name, class_name, fee_type, amount_paid, payment_date, payment_method, receipt_number, transaction_ref, status, recorded_by, created_at
FROM public.receipts
ON CONFLICT (id) DO NOTHING;

-- Populate communications from circulars
INSERT INTO public.communications (id, message_type, title, body, sender_id, recipient_role, priority, attachment_url, published_at, created_at)
SELECT id, 'circular', title, content, COALESCE(author, 'Admin'), target_role, priority, attachment_url, published_at, created_at
FROM public.circulars
ON CONFLICT (id) DO NOTHING;

-- Populate communications from messages
INSERT INTO public.communications (id, message_type, body, sender_id, sender_name, sender_role, recipient_user_id, recipient_role, read_status, published_at, created_at)
SELECT id, 'general_message', message_text, sender_id, sender_name, sender_role, receiver_id, receiver_role, read_status, sent_at, sent_at
FROM public.messages
ON CONFLICT (id) DO NOTHING;

-- Populate requests from leave_requests
INSERT INTO public.requests (id, request_type, applicant_or_child_name, leave_type_or_interested_class, start_date, end_date, reason_or_notes, status, created_at)
SELECT id, 'leave', applicant_name, applicant_role, start_date, end_date, reason, status, applied_on::timestamp
FROM public.leave_requests
ON CONFLICT (id) DO NOTHING;

-- Populate requests from enquiries
INSERT INTO public.requests (id, request_type, applicant_or_child_name, parent_name, phone, email, address, gender, dob, leave_type_or_interested_class, source, status, follow_up_date, reason_or_notes, created_at)
SELECT id, 'enquiry', child_name, parent_name, phone, email, address, gender::text, dob, interested_class, source, status, follow_up, notes, created_at
FROM public.enquiries
ON CONFLICT (id) DO NOTHING;

-- 4. RLS SECURITY POLICIES FOR CONSOLIDATED TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_expenses_all" ON public.inventory_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fees_payments_all" ON public.fees_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "communications_all" ON public.communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "requests_all" ON public.requests FOR ALL USING (true) WITH CHECK (true);
