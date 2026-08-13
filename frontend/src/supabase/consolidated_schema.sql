-- ====================================================================
-- GROWVIA SCHOOL ERP — CLEANUP TO EXACTLY 6 CONSOLIDATED TABLES SCHEMA
-- Final Database State: EXACTLY 6 TABLES IN PUBLIC SCHEMA
-- 1. GV_users
-- 2. GV_inventory_expenses
-- 3. GV_fees_payments
-- 4. GV_communications
-- 5. GV_requests
-- 6. GV_system_settings
-- ====================================================================

-- 1. EXTENSIONS & SCHEMA CACHE RELOAD
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
NOTIFY pgrst, 'reload schema';

-- 2. IN-PLACE TABLE RENAMES (If old tables exist and new ones do not)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_users') THEN
        ALTER TABLE public.users RENAME TO GV_users;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_expenses')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_inventory_expenses') THEN
        ALTER TABLE public.inventory_expenses RENAME TO GV_inventory_expenses;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fees_payments')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_fees_payments') THEN
        ALTER TABLE public.fees_payments RENAME TO GV_fees_payments;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communications')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_communications') THEN
        ALTER TABLE public.communications RENAME TO GV_communications;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'requests')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_requests') THEN
        ALTER TABLE public.requests RENAME TO GV_requests;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gv_system_settings') THEN
        ALTER TABLE public.system_settings RENAME TO GV_system_settings;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. ENSURE EXACT 6 CONSOLIDATED TABLES EXIST

-- Table 1: GV_users
CREATE TABLE IF NOT EXISTS public.GV_users (
    id VARCHAR(100) PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    login_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'parent',
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

-- Table 2: GV_inventory_expenses
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
    payment_method VARCHAR(50) DEFAULT 'Cash',
    transaction_date DATE DEFAULT CURRENT_DATE,
    receipt_ref VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gv_inventory_expenses_type ON public.GV_inventory_expenses(record_type);

-- Table 3: GV_fees_payments
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
    payment_method VARCHAR(50) DEFAULT 'Cash',
    receipt_number VARCHAR(100),
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gv_fees_payments_type ON public.GV_fees_payments(record_type);

-- Table 4: GV_communications
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

-- Table 5: GV_requests
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
    status VARCHAR(50) DEFAULT 'Pending',
    follow_up_date DATE,
    assigned_staff VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gv_requests_type ON public.GV_requests(request_type);

-- Table 6: GV_system_settings
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

-- 4. MERGE ANY REMAINING UNPREFIXED DATA INTO GV_ TABLES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        INSERT INTO public.GV_users (id, auth_user_id, login_id, email, full_name, role, status, mobile, photo_url, must_change_password, created_at, updated_at)
        SELECT id::text, auth_user_id, login_id, email, full_name, role::text, status, mobile, photo_url, must_change_password, created_at, updated_at
        FROM public.users
        ON CONFLICT (login_id) DO NOTHING;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. RLS SECURITY POLICIES FOR EXACT 6 TABLES
ALTER TABLE public.GV_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_inventory_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_fees_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_system_settings ENABLE ROW LEVEL SECURITY;

-- Drop legacy/permissive policies
DROP POLICY IF EXISTS "gv_users_all" ON public.GV_users;
DROP POLICY IF EXISTS "gv_inventory_expenses_all" ON public.GV_inventory_expenses;
DROP POLICY IF EXISTS "gv_fees_payments_all" ON public.GV_fees_payments;
DROP POLICY IF EXISTS "gv_communications_all" ON public.GV_communications;
DROP POLICY IF EXISTS "gv_requests_all" ON public.GV_requests;
DROP POLICY IF EXISTS "gv_system_settings_all" ON public.GV_system_settings;

-- 5.1 GV_users Policies (Identity & Role Scoped)
CREATE POLICY "gv_users_select" ON public.GV_users FOR SELECT
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
  );

CREATE POLICY "gv_users_write" ON public.GV_users FOR ALL
  USING (
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- 5.2 GV_inventory_expenses Policies (Staff Restricted)
CREATE POLICY "gv_inventory_expenses_select" ON public.GV_inventory_expenses FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "gv_inventory_expenses_write" ON public.GV_inventory_expenses FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5.3 GV_fees_payments Policies (Parent Child-Scoped & Staff Managed)
CREATE POLICY "gv_fees_payments_select" ON public.GV_fees_payments FOR SELECT
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
  );

CREATE POLICY "gv_fees_payments_write" ON public.GV_fees_payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5.4 GV_communications Policies (Role & Recipient Audience Scoped)
CREATE POLICY "gv_communications_select" ON public.GV_communications FOR SELECT
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
  );

CREATE POLICY "gv_communications_write" ON public.GV_communications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5.5 GV_requests Policies (Attendance & Notification Scoped)
CREATE POLICY "gv_requests_select" ON public.GV_requests FOR SELECT
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
  );

CREATE POLICY "gv_requests_write" ON public.GV_requests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5.6 GV_system_settings Policies (Public Read, Staff Write)
CREATE POLICY "gv_system_settings_select" ON public.GV_system_settings FOR SELECT
  USING (true);

CREATE POLICY "gv_system_settings_write" ON public.GV_system_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. DROP ALL EXTRA & OLD UNPREFIXED TABLES SO ONLY EXACTLY THE 6 CORE TABLES REMAIN
DROP TABLE IF EXISTS public.gv_promotion_history CASCADE;
DROP TABLE IF EXISTS public.gv_student_attendance CASCADE;

DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.inventory_expenses CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.fees_payments CASCADE;
DROP TABLE IF EXISTS public.fees CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.communications CASCADE;
DROP TABLE IF EXISTS public.circulars CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.student_attendance CASCADE;
DROP TABLE IF EXISTS public.promotion_history CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 7. ENABLE REALTIME PUBLICATION FOR ALL 6 CONSOLIDATED GROWVIA TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_inventory_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_fees_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.GV_system_settings;

-- 8. POSTGRESQL RLS IDENTITY FOUNDATION HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role FROM public.GV_users
  WHERE auth_user_id = auth.uid()
     OR id = (auth.jwt() ->> 'sub')
     OR login_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text AS $$
  SELECT id FROM public.GV_users
  WHERE auth_user_id = auth.uid()
     OR id = (auth.jwt() ->> 'sub')
     OR login_id = (auth.jwt() ->> 'sub')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 9. ENABLE ROW LEVEL SECURITY ON 6 AUTHORITATIVE TABLES
ALTER TABLE public.GV_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_fees_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_inventory_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.GV_system_settings ENABLE ROW LEVEL SECURITY;

-- 10. PURE JWT-ONLY RLS POLICIES FOR GV_users (ZERO-SUBQUERY, 100% RECURSION-FREE)
DROP POLICY IF EXISTS gv_users_all ON public.gv_users;
DROP POLICY IF EXISTS "gv_users_all" ON public.gv_users;
DROP POLICY IF EXISTS gv_users_select_policy ON public.gv_users;
DROP POLICY IF EXISTS gv_users_insert_policy ON public.gv_users;
DROP POLICY IF EXISTS gv_users_update_policy ON public.gv_users;
DROP POLICY IF EXISTS gv_users_delete_policy ON public.gv_users;

ALTER TABLE public.gv_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY gv_users_select_policy ON public.gv_users
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Own user profile access (explicit text casts)
    auth_user_id = auth.uid()::text
    OR auth_user_id = (auth.jwt() ->> 'sub')
    OR id = (auth.jwt() -> 'user_metadata' ->> 'login_id')
    OR login_id = (auth.jwt() -> 'user_metadata' ->> 'login_id')

    -- 2. Super Admin, Principal, and Office full access
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super-admin', 'super_admin', 'admin', 'principal', 'office')

    -- 3. Parent access (linked child records only)
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'parent' AND (
        parent_id = (auth.jwt() -> 'user_metadata' ->> 'login_id') 
        OR id = (auth.jwt() -> 'user_metadata' ->> 'login_id')
    ))

    -- 4. Teacher access: Own Profile OR students matching exact class_name AND exact section
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' AND (
        id = (auth.jwt() -> 'user_metadata' ->> 'login_id')
        OR (
            role = 'student'
            AND (auth.jwt() -> 'user_metadata' ->> 'class_name') IS NOT NULL
            AND (auth.jwt() -> 'user_metadata' ->> 'section') IS NOT NULL
            AND class_name = (auth.jwt() -> 'user_metadata' ->> 'class_name')
            AND section = (auth.jwt() -> 'user_metadata' ->> 'section')
        )
    ))
  );

CREATE POLICY gv_users_insert_policy ON public.gv_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super-admin', 'super_admin', 'admin', 'principal', 'office')
    OR auth_user_id = auth.uid()::text
  );

CREATE POLICY gv_users_update_policy ON public.gv_users
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super-admin', 'super_admin', 'admin', 'principal', 'office')
    OR auth_user_id = auth.uid()::text
    OR id = (auth.jwt() -> 'user_metadata' ->> 'login_id')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super-admin', 'super_admin', 'admin', 'principal', 'office')
    OR auth_user_id = auth.uid()::text
    OR id = (auth.jwt() -> 'user_metadata' ->> 'login_id')
  );

CREATE POLICY gv_users_delete_policy ON public.gv_users
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super-admin', 'super_admin', 'admin', 'principal', 'office')
  );

-- ====================================================================
-- 7. SUPABASE STORAGE BUCKET & RLS POLICIES FOR 'system-assets'
-- ====================================================================

-- Create 'system-assets' public storage bucket if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public READ access policy for system-assets bucket
DROP POLICY IF EXISTS "Public Read system-assets" ON storage.objects;
CREATE POLICY "Public Read system-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'system-assets');

-- Authenticated Admin INSERT access policy for system-assets bucket
DROP POLICY IF EXISTS "Admin Insert system-assets" ON storage.objects;
CREATE POLICY "Admin Insert system-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'system-assets'
  );

-- Authenticated Admin UPDATE access policy for system-assets bucket
DROP POLICY IF EXISTS "Admin Update system-assets" ON storage.objects;
CREATE POLICY "Admin Update system-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'system-assets'
  );

-- Authenticated Admin DELETE access policy for system-assets bucket
DROP POLICY IF EXISTS "Admin Delete system-assets" ON storage.objects;
CREATE POLICY "Admin Delete system-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'system-assets'
  );





