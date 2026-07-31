import { supabase } from "./supabase";
import type { Student, Teacher } from "./mockData";

export interface UserRecord {
  id: string;
  auth_user_id?: string | null;
  login_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  mobile?: string | null;
  photo_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  admission_no?: string | null;
  employee_id?: string | null;
  class_name?: string | null;
  section?: string | null;
  subject?: string | null;
  designation?: string | null;
  house?: string | null;
  joining_date?: string | null;
  parent_name?: string | null;
  parent_id?: string | null;
  fee_status?: string | null;
  attendance_pct?: number | null;
  experience?: number | null;
  branch?: string | null;
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── USER SERVICE (Module 1: users) ──────────────────────────────────────────

export async function fetchUsers(roleFilter?: string): Promise<{ data: UserRecord[]; error: any }> {
  try {
    let query = supabase.from("users").select("*");
    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }
    const { data, error } = await query;
    if (error || !data) {
      // Fallback query to profiles if users table not yet created in remote database
      const { data: profs } = await supabase.from("profiles").select("*");
      return { data: profs || [], error: null };
    }
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function fetchStudentsFromUsers(): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("role", "student");
    if (error || !data || data.length === 0) {
      // Fallback query to legacy students table
      const { data: legacy } = await supabase.from("students").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: Student[] = legacy.map((d: any) => ({
          id: d.id,
          rollNo: d.roll_no || 1,
          admissionNo: d.admission_no || d.id,
          name: d.name,
          age: d.age || 4,
          dob: d.dob || "2020-01-01",
          className: d.class_name,
          section: d.section || "A",
          parentName: d.parent_name,
          parentId: d.parent_id || "PRT1001",
          phone: d.phone || "9876543210",
          gender: d.gender || "Boy",
          house: d.house || "Red",
          admissionDate: d.admission_date || "2024-04-01",
          feeStatus: d.fee_status || "Pending",
          avatar: d.avatar,
          attendancePct: Number(d.attendance_pct || 95),
          branch: d.branch || "Main Branch",
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: Student[] = data.map((d: any, idx: number) => ({
      id: d.id,
      rollNo: idx + 1,
      admissionNo: d.admission_no || d.id,
      name: d.full_name,
      age: 4,
      dob: d.date_of_birth || "2020-01-01",
      className: d.class_name || "Nursery",
      section: d.section || "A",
      parentName: d.parent_name || "Parent",
      parentId: d.parent_id || "PRT1001",
      phone: d.mobile || "9876543210",
      gender: (d.gender as any) || "Boy",
      house: (d.house as any) || "Red",
      admissionDate: d.joining_date || "2024-04-01",
      feeStatus: (d.fee_status as any) || "Pending",
      avatar: d.photo_url || undefined,
      attendancePct: Number(d.attendance_pct || 95),
      branch: d.branch || "Main Branch",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchTeachersFromUsers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("role", "teacher");
    if (error || !data || data.length === 0) {
      // Fallback query to legacy teachers table
      const { data: legacy } = await supabase.from("teachers").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: Teacher[] = legacy.map((d: any) => ({
          id: d.id,
          name: d.name,
          className: d.class_name,
          subject: d.subject,
          email: d.email,
          phone: d.phone,
          experience: d.experience || 1,
          joined: d.joined_date || "2024-01-01",
          avatar: d.avatar,
          branch: d.branch || "Main Branch",
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: Teacher[] = data.map((d: any) => ({
      id: d.id,
      name: d.full_name,
      className: d.class_name || "Nursery A",
      subject: d.subject || "General",
      email: d.email,
      phone: d.mobile || "9876543210",
      experience: d.experience || 1,
      joined: d.joining_date || "2024-01-01",
      avatar: d.photo_url || undefined,
      branch: d.branch || "Main Branch",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function saveUserRecord(user: Partial<UserRecord>) {
  try {
    const payload = {
      ...user,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("users").upsert([payload]).select();
    if (error) {
      // Dual-write legacy profiles for resilience
      if (user.login_id) {
        await supabase.from("profiles").upsert([{
          login_id: user.login_id,
          role: user.role || "parent",
          full_name: user.full_name || "User",
          email: user.email || `${user.login_id}@sunshine.edu`,
          mobile: user.mobile || "9876543210",
          status: user.status || "active",
        }]);
      }
    }
    return { data: data ? data[0] : payload, error: null };
  } catch (err) {
    return { data: user, error: err };
  }
}
