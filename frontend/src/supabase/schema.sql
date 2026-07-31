-- ====================================================================
-- SUNSHINE SCHOOL ERP - SUPABASE DATABASE SCHEMA & MIGRATION SCRIPT
-- Copy and paste this script into your Supabase Dashboard SQL Editor
-- ====================================================================

-- 1. CLEANUP PREVIOUS TABLES IF THEY EXIST WITH CONFLICTING TYPES
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.fees CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.circulars CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super-admin', 'principal', 'office', 'teacher', 'parent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('Boy', 'Girl');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE house_type AS ENUM ('Red', 'Blue', 'Green', 'Yellow');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('Paid', 'Partial', 'Pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_id VARCHAR(50) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'parent',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_profiles_login_id ON public.profiles(login_id);
CREATE INDEX idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- 4. STUDENTS TABLE
CREATE TABLE public.students (
    id VARCHAR(50) PRIMARY KEY,
    roll_no INT NOT NULL,
    admission_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    age INT,
    dob DATE,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL,
    parent_name VARCHAR(150) NOT NULL,
    parent_id VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender gender_type NOT NULL DEFAULT 'Boy',
    house house_type NOT NULL DEFAULT 'Red',
    admission_date DATE DEFAULT CURRENT_DATE,
    fee_status payment_status NOT NULL DEFAULT 'Pending',
    avatar TEXT,
    attendance_pct NUMERIC(5,2) DEFAULT 95.0,
    branch VARCHAR(100) DEFAULT 'Main Branch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_students_class_section ON public.students(class_name, section);
CREATE INDEX idx_students_parent_id ON public.students(parent_id);

-- 5. TEACHERS TABLE
CREATE TABLE public.teachers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    experience INT DEFAULT 0,
    joined_date DATE DEFAULT CURRENT_DATE,
    avatar TEXT,
    branch VARCHAR(100) DEFAULT 'Main Branch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ENQUIRIES TABLE
CREATE TABLE public.enquiries (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('ENQ-' || substring(uuid_generate_v4()::text, 1, 8)),
    child_name VARCHAR(150) NOT NULL,
    parent_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gender gender_type,
    dob DATE,
    previous_school VARCHAR(255),
    age INT,
    interested_class VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'Walk-in',
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    follow_up DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. FEES TABLE
CREATE TABLE public.fees (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(150) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status payment_status NOT NULL DEFAULT 'Pending',
    month VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. RECEIPTS TABLE
CREATE TABLE public.receipts (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('RCP-' || substring(uuid_generate_v4()::text, 1, 8)),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collected_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. EXPENSES TABLE
CREATE TABLE public.expenses (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('EXP-' || substring(uuid_generate_v4()::text, 1, 8)),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. INVENTORY ITEMS TABLE
CREATE TABLE public.inventory_items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 5,
    unit VARCHAR(50) NOT NULL DEFAULT 'Pcs',
    location VARCHAR(100) NOT NULL DEFAULT 'Main Store',
    status VARCHAR(50) NOT NULL DEFAULT 'In Stock',
    last_updated DATE DEFAULT CURRENT_DATE
);

-- 11. CIRCULARS TABLE
CREATE TABLE public.circulars (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('CIR-' || substring(uuid_generate_v4()::text, 1, 8)),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'All',
    published_date DATE NOT NULL DEFAULT CURRENT_DATE,
    author VARCHAR(150) NOT NULL DEFAULT 'Principal Office',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. LEAVE REQUESTS TABLE
CREATE TABLE public.leave_requests (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('LR-' || substring(uuid_generate_v4()::text, 1, 8)),
    applicant_name VARCHAR(150) NOT NULL,
    applicant_role VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    applied_on DATE DEFAULT CURRENT_DATE
);

-- 13. MESSAGES TABLE
CREATE TABLE public.messages (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('MSG-' || substring(uuid_generate_v4()::text, 1, 8)),
    sender_id VARCHAR(50) NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    receiver_role VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_status BOOLEAN DEFAULT false
);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);

-- SECURITY POLICIES (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "students_all" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "teachers_all" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "enquiries_all" ON public.enquiries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fees_all" ON public.fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "receipts_all" ON public.receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "expenses_all" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_all" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "circulars_all" ON public.circulars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "leave_all" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "messages_all" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- INITIAL SEED DATA
INSERT INTO public.profiles (login_id, role, full_name, email, mobile, status, must_change_password)
VALUES
    ('ADMIN001', 'super-admin', 'System Administrator', 'admin@sunshineschool.edu', '9876543210', 'active', false),
    ('PRINCIPAL001', 'principal', 'Dr. Sarah Connor', 'principal@sunshineschool.edu', '9876543211', 'active', false),
    ('OFFICE001', 'office', 'Main Office Administrator', 'office@sunshineschool.edu', '9876543212', 'active', false),
    ('TCH101', 'teacher', 'Ananya Sharma', 'ananya.teacher@sunshineschool.edu', '9876543213', 'active', false),
    ('PRT1001', 'parent', 'Vikram Malhotra', 'vikram.parent@sunshineschool.edu', '9876543214', 'active', false);

INSERT INTO public.students (id, roll_no, admission_no, name, age, dob, class_name, section, parent_name, parent_id, phone, gender, house, fee_status, branch)
VALUES
    ('STU001', 1, 'ADM-2024-001', 'Aarav Malhotra', 4, '2022-03-15', 'Nursery', 'A', 'Vikram Malhotra', 'PRT1001', '9876543214', 'Boy', 'Red', 'Paid', 'Main Branch'),
    ('STU002', 2, 'ADM-2024-002', 'Riya Sharma', 4, '2022-05-20', 'Nursery', 'A', 'Rahul Sharma', 'PRT1002', '9876543215', 'Girl', 'Blue', 'Partial', 'Main Branch'),
    ('STU003', 3, 'ADM-2024-003', 'Kabir Verma', 5, '2021-08-10', 'LKG', 'B', 'Sanjay Verma', 'PRT1003', '9876543216', 'Boy', 'Green', 'Paid', 'Main Branch');

INSERT INTO public.teachers (id, name, class_name, subject, email, phone, experience, branch)
VALUES
    ('TCH101', 'Ananya Sharma', 'Nursery A', 'English & Rhymes', 'ananya.teacher@sunshineschool.edu', '9876543213', 5, 'Main Branch'),
    ('TCH102', 'Meera Patel', 'LKG B', 'Mathematics & Arts', 'meera.teacher@sunshineschool.edu', '9876543217', 7, 'Main Branch');
