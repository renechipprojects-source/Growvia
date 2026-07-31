import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  console.log("==========================================================");
  console.log("CHECKING AND MIGRATING SUPABASE LIVE DATABASE");
  console.log("==========================================================");

  // 1. Check if consolidated tables exist
  const { data: usersData, error: usersErr } = await supabase.from('users').select('id').limit(1);

  if (usersErr && usersErr.message.includes('relation "public.users" does not exist')) {
    console.log("⚠️ Consolidated table 'users' does not exist yet in Supabase Database.");
    console.log("Running direct migration of existing data and creating records...");
  } else {
    console.log("✅ Table 'users' detected in Supabase.");
  }

  // 2. Fetch existing profiles and migrate into users if available
  try {
    const { data: profs } = await supabase.from('profiles').select('*');
    if (profs && profs.length > 0) {
      console.log(`Found ${profs.length} profiles to migrate.`);
      const userPayloads = profs.map(p => ({
        id: p.id,
        auth_user_id: p.auth_user_id,
        login_id: p.login_id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        status: p.status || 'active',
        mobile: p.mobile,
        photo_url: p.photo_url,
        must_change_password: p.must_change_password || false
      }));
      const { error: upsertErr } = await supabase.from('users').upsert(userPayloads);
      if (!upsertErr) {
        console.log(`Successfully migrated ${profs.length} profiles into users table.`);
      } else {
        console.log("Upsert notice for users:", upsertErr.message);
      }
    }
  } catch (e) {
    console.log("Profiles migration check notice:", e.message);
  }

  // 3. Fetch existing students and migrate into users
  try {
    const { data: studs } = await supabase.from('students').select('*');
    if (studs && studs.length > 0) {
      console.log(`Found ${studs.length} students to migrate.`);
      const studentPayloads = studs.map(s => ({
        id: s.id,
        login_id: s.id,
        email: `${s.id.toLowerCase()}@sunshine.edu`,
        full_name: s.name,
        role: 'student',
        status: 'active',
        admission_no: s.admission_no,
        class_name: s.class_name,
        section: s.section,
        parent_name: s.parent_name,
        parent_id: s.parent_id,
        mobile: s.phone,
        gender: s.gender,
        house: s.house,
        joining_date: s.admission_date,
        fee_status: s.fee_status,
        photo_url: s.avatar,
        attendance_pct: s.attendance_pct,
        branch: s.branch
      }));
      const { error: upsertErr } = await supabase.from('users').upsert(studentPayloads);
      if (!upsertErr) {
        console.log(`Successfully migrated ${studs.length} students into users table.`);
      }
    }
  } catch (e) {
    console.log("Students migration check notice:", e.message);
  }

  // 4. Fetch existing teachers and migrate into users
  try {
    const { data: tchs } = await supabase.from('teachers').select('*');
    if (tchs && tchs.length > 0) {
      console.log(`Found ${tchs.length} teachers to migrate.`);
      const teacherPayloads = tchs.map(t => ({
        id: t.id,
        login_id: t.id,
        email: t.email,
        full_name: t.name,
        role: 'teacher',
        status: 'active',
        employee_id: t.id,
        class_name: t.class_name,
        subject: t.subject,
        mobile: t.phone,
        experience: t.experience,
        joining_date: t.joined_date,
        photo_url: t.avatar,
        branch: t.branch
      }));
      const { error: upsertErr } = await supabase.from('users').upsert(teacherPayloads);
      if (!upsertErr) {
        console.log(`Successfully migrated ${tchs.length} teachers into users table.`);
      }
    }
  } catch (e) {
    console.log("Teachers migration check notice:", e.message);
  }

  // 5. Fetch inventory items & expenses -> migrate into inventory_expenses
  try {
    const { data: inv } = await supabase.from('inventory_items').select('*');
    if (inv && inv.length > 0) {
      const invPayloads = inv.map(i => ({
        id: i.id,
        record_type: 'inventory',
        title: i.item_name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        min_stock: i.min_stock,
        supplier_or_paid_to: i.supplier
      }));
      await supabase.from('inventory_expenses').upsert(invPayloads);
      console.log(`Migrated ${inv.length} inventory items into inventory_expenses.`);
    }

    const { data: exp } = await supabase.from('expenses').select('*');
    if (exp && exp.length > 0) {
      const expPayloads = exp.map(e => ({
        id: e.id,
        record_type: 'expense',
        title: e.category,
        category: e.category,
        amount_or_unit_cost: e.amount,
        payment_method: e.payment_method,
        transaction_date: e.expense_date,
        receipt_ref: e.receipt_ref,
        notes: e.notes,
        created_by: e.created_by
      }));
      await supabase.from('inventory_expenses').upsert(expPayloads);
      console.log(`Migrated ${exp.length} expenses into inventory_expenses.`);
    }
  } catch (e) {
    console.log("Inventory/Expenses migration check notice:", e.message);
  }

  // 6. Fetch fees & receipts -> migrate into fees_payments
  try {
    const { data: fees } = await supabase.from('fees').select('*');
    if (fees && fees.length > 0) {
      const feePayloads = fees.map(f => ({
        id: f.id,
        record_type: 'fee_schedule',
        student_id: f.student_id,
        fee_type: f.fee_type,
        academic_year: f.academic_year,
        amount_due: f.amount_due,
        amount_paid: f.amount_paid,
        balance: f.balance,
        status: f.status
      }));
      await supabase.from('fees_payments').upsert(feePayloads);
      console.log(`Migrated ${fees.length} fees into fees_payments.`);
    }

    const { data: rcps } = await supabase.from('receipts').select('*');
    if (rcps && rcps.length > 0) {
      const rcpPayloads = rcps.map(r => ({
        id: r.id,
        record_type: 'payment_receipt',
        student_id: r.student_id,
        student_name: r.student_name,
        class_name: r.class_name,
        fee_type: r.fee_type,
        amount_paid: r.amount_paid,
        payment_date: r.payment_date,
        payment_method: r.payment_method,
        receipt_number: r.receipt_number,
        transaction_ref: r.transaction_ref,
        status: r.status,
        recorded_by: r.recorded_by
      }));
      await supabase.from('fees_payments').upsert(rcpPayloads);
      console.log(`Migrated ${rcps.length} receipts into fees_payments.`);
    }
  } catch (e) {
    console.log("Fees/Receipts migration check notice:", e.message);
  }

  // 7. Fetch circulars & messages -> migrate into communications
  try {
    const { data: circs } = await supabase.from('circulars').select('*');
    if (circs && circs.length > 0) {
      const circPayloads = circs.map(c => ({
        id: c.id,
        message_type: 'circular',
        title: c.title,
        body: c.content,
        sender_id: c.author || 'Admin',
        sender_name: c.author || 'Admin',
        recipient_role: c.target_audience || 'All',
        published_at: c.created_at
      }));
      await supabase.from('communications').upsert(circPayloads);
      console.log(`Migrated ${circs.length} circulars into communications.`);
    }

    const { data: msgs } = await supabase.from('messages').select('*');
    if (msgs && msgs.length > 0) {
      const msgPayloads = msgs.map(m => ({
        id: m.id,
        message_type: 'general_message',
        body: m.message_text,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        sender_role: m.sender_role,
        recipient_user_id: m.receiver_id,
        recipient_role: m.receiver_role,
        read_status: m.read_status,
        published_at: m.sent_at
      }));
      await supabase.from('communications').upsert(msgPayloads);
      console.log(`Migrated ${msgs.length} messages into communications.`);
    }
  } catch (e) {
    console.log("Circulars/Messages migration check notice:", e.message);
  }

  // 8. Fetch leave requests & enquiries -> migrate into requests
  try {
    const { data: leaves } = await supabase.from('leave_requests').select('*');
    if (leaves && leaves.length > 0) {
      const leavePayloads = leaves.map(l => ({
        id: l.id,
        request_type: 'leave',
        applicant_or_child_name: l.applicant_name,
        leave_type_or_interested_class: l.applicant_role,
        start_date: l.start_date,
        end_date: l.end_date,
        reason_or_notes: l.reason,
        status: l.status
      }));
      await supabase.from('requests').upsert(leavePayloads);
      console.log(`Migrated ${leaves.length} leave requests into requests.`);
    }

    const { data: enqs } = await supabase.from('enquiries').select('*');
    if (enqs && enqs.length > 0) {
      const enqPayloads = enqs.map(e => ({
        id: e.id,
        request_type: 'enquiry',
        applicant_or_child_name: e.child_name,
        parent_name: e.parent_name,
        phone: e.phone,
        email: e.email,
        address: e.address,
        gender: e.gender,
        dob: e.dob,
        leave_type_or_interested_class: e.interested_class,
        source: e.source,
        status: e.status,
        follow_up_date: e.follow_up,
        reason_or_notes: e.notes
      }));
      await supabase.from('requests').upsert(enqPayloads);
      console.log(`Migrated ${enqs.length} enquiries into requests.`);
    }
  } catch (e) {
    console.log("Leave/Enquiries migration check notice:", e.message);
  }

  console.log("==========================================================");
  console.log("MIGRATION SCRIPT FINISHED");
  console.log("==========================================================");
}

runMigration();
