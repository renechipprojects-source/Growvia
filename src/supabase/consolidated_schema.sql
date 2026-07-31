-- ====================================================================
-- SUNSHINE / GROWVIA SCHOOL ERP — NAMESPACED DATABASE MODULES SCHEMA (GV_)
-- Module Structure:
-- 1. GV_users              (profiles, students, teachers)
-- 2. GV_inventory_expenses (inventory_items, expenses)
-- 3. GV_fees_payments      (fees, receipts)
-- 4. GV_communications     (circulars, messages)
-- 5. GV_requests           (leave_requests, enquiries)
-- 6. GV_system_settings    (developer console & branding settings)
-- ====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. NAMESPACED CONSOLIDATED TABLES (GV_)

-- A. USERS MODULE (Profiles, Students, Teachers)
CREATE TABLE IF NOT EXISTS public.GV_users (
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

CREATE INDEX IF NOT EXISTS idx_gv_users_login_id ON public.GV_users(login_id);
CREATE INDEX IF NOT EXISTS idx_gv_users_role ON public.GV_users(role);
CREATE INDEX IF NOT EXISTS idx_gv_users_auth_user_id ON public.GV_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_gv_users_class_section ON public.GV_users(class_name, section);

-- B. INVENTORY + EXPENSES MODULE
CREATE TABLE IF NOT EXISTS public.GV_inventory_expenses (
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

CREATE INDEX IF NOT EXISTS idx_gv_inventory_expenses_type ON public.GV_inventory_expenses(record_type);
CREATE INDEX IF NOT EXISTS idx_gv_inventory_expenses_category ON public.GV_inventory_expenses(category);

-- C. FEES + RECEIPTS MODULE
CREATE TABLE IF NOT EXISTS public.GV_fees_payments (
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

CREATE INDEX IF NOT EXISTS idx_gv_fees_payments_student ON public.GV_fees_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_gv_fees_payments_type ON public.GV_fees_payments(record_type);

-- D. COMMUNICATIONS MODULE (Circulars + Messages)
CREATE TABLE IF NOT EXISTS public.GV_communications (
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

CREATE INDEX IF NOT EXISTS idx_gv_communications_type ON public.GV_communications(message_type);
CREATE INDEX IF NOT EXISTS idx_gv_communications_sender ON public.GV_communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_gv_communications_recipient ON public.GV_communications(recipient_user_id);

-- E. REQUESTS MODULE (Leave Requests + Enquiries)
CREATE TABLE IF NOT EXISTS public.GV_requests (
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

CREATE INDEX IF NOT EXISTS idx_gv_requests_type ON public.GV_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gv_requests_status ON public.GV_requests(status);

-- F. SYSTEM SETTINGS MODULE (Developer Console & Branding)
CREATE TABLE IF NOT EXISTS public.GV_system_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'PRIMARY',
    content TEXT,
    school_name VARCHAR(150),
    school_logo_url TEXT,
    header_logo TEXT,
    sidebar_logo TEXT,
    sidebar_logo_url TEXT,
    sidebar_school_name VARCHAR(150),
    login_logo TEXT,
    login_bg TEXT,
    favicon TEXT,
    school_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(150),
    website VARCHAR(150),
    motto TEXT,
    office_hours VARCHAR(100),
    login_title VARCHAR(150),
    login_subtitle TEXT,
    footer_text TEXT,
    theme_color VARCHAR(50),
    report_header TEXT,
    receipt_header TEXT,
    academic_year VARCHAR(50),
    project_name VARCHAR(100),
    project_logo TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G. PROMOTION HISTORY MODULE
CREATE TABLE IF NOT EXISTS public.GV_promotion_history (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('PRM-' || substring(uuid_generate_v4()::text, 1, 8)),
    student_id VARCHAR(100) NOT NULL,
    from_class VARCHAR(50) NOT NULL,
    to_class VARCHAR(50) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    promoted_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- H. ATTENDANCE MODULE
CREATE TABLE IF NOT EXISTS public.GV_student_attendance (
    id VARCHAR(100) PRIMARY KEY DEFAULT ('ATT-' || substring(uuid_generate_v4()::text, 1, 8)),
    student_id VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Present', -- Present, Absent, Late, Leave
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RESILIENT DATA MIGRATION FROM OLD TABLES TO GV_ TABLES

DO $$ BEGIN
    INSERT INTO public.GV_users (id, auth_user_id, login_id, email, full_name, role, status, mobile, photo_url, must_change_password, created_at, updated_at)
    SELECT id::text, auth_user_id, login_id, email, full_name, role::text, status, mobile, photo_url, must_change_password, created_at, updated_at
    FROM public.users
    ON CONFLICT (login_id) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = EXCLUDED.status;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    INSERT INTO public.GV_inventory_expenses (id, record_type, title, category, amount_or_unit_cost, quantity, unit, min_stock, supplier_or_paid_to, payment_method, transaction_date, receipt_ref, notes, created_by, created_at, updated_at)
    SELECT id, record_type, title, category, amount_or_unit_cost, quantity, unit, min_stock, supplier_or_paid_to, payment_method, transaction_date, receipt_ref, notes, created_by, created_at, updated_at
    FROM public.inventory_expenses
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    INSERT INTO public.GV_fees_payments (id, record_type, student_id, student_name, class_name, fee_type, academic_year, installment, amount_due, amount_paid, balance, payment_date, payment_method, receipt_number, transaction_ref, status, recorded_by, created_at, updated_at)
    SELECT id, record_type, student_id, student_name, class_name, fee_type, academic_year, installment, amount_due, amount_paid, balance, payment_date, payment_method, receipt_number, transaction_ref, status, recorded_by, created_at, updated_at
    FROM public.fees_payments
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    INSERT INTO public.GV_communications (id, message_type, title, body, sender_id, sender_name, sender_role, recipient_role, recipient_user_id, priority, attachment_url, read_status, published_at, created_at, updated_at)
    SELECT id, message_type, title, body, sender_id, sender_name, sender_role, recipient_role, recipient_user_id, priority, attachment_url, read_status, published_at, created_at, updated_at
    FROM public.communications
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    INSERT INTO public.GV_requests (id, request_type, applicant_or_child_name, parent_name, phone, email, address, gender, dob, leave_type_or_interested_class, start_date, end_date, reason_or_notes, source, status, follow_up_date, assigned_staff, remarks, created_at, updated_at)
    SELECT id, request_type, applicant_or_child_name, parent_name, phone, email, address, gender, dob, leave_type_or_interested_class, start_date, end_date, reason_or_notes, source, status, follow_up_date, assigned_staff, remarks, created_at, updated_at
    FROM public.requests
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    INSERT INTO public.GV_system_settings (id, content, school_name, school_logo_url, header_logo, sidebar_logo, sidebar_logo_url, sidebar_school_name, login_logo, login_bg, favicon, school_address, phone, email, website, motto, office_hours, login_title, login_subtitle, footer_text, theme_color, report_header, receipt_header, academic_year, project_name, project_logo, updated_at)
    SELECT id, content, school_name, school_logo_url, header_logo, sidebar_logo, sidebar_logo_url, sidebar_school_name, login_logo, login_bg, favicon, school_address, phone, email, website, motto, office_hours, login_title, login_subtitle, footer_text, theme_color, report_header, receipt_header, academic_year, project_name, project_logo, updated_at
    FROM public.system_settings
    ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, school_name = EXCLUDED.school_name, updated_at = EXCLUDED.updated_at;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. RLS SECURITY POLICIES FOR GV_ TABLES
ALTER TABLE public.GV_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_inventory_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_fees_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gv_users_all" ON public.GV_users;
DROP POLICY IF EXISTS "gv_inventory_expenses_all" ON public.GV_inventory_expenses;
DROP POLICY IF EXISTS "gv_fees_payments_all" ON public.GV_fees_payments;
DROP POLICY IF EXISTS "gv_communications_all" ON public.GV_communications;
DROP POLICY IF EXISTS "gv_requests_all" ON public.GV_requests;
DROP POLICY IF EXISTS "gv_system_settings_all" ON public.GV_system_settings;

CREATE POLICY "gv_users_all" ON public.GV_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gv_inventory_expenses_all" ON public.GV_inventory_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gv_fees_payments_all" ON public.GV_fees_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gv_communications_all" ON public.GV_communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gv_requests_all" ON public.GV_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gv_system_settings_all" ON public.GV_system_settings FOR ALL USING (true) WITH CHECK (true);
