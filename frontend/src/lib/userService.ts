import { supabase } from "./supabase";

export interface UserRecord {
  id: string;
  auth_user_id?: string;
  login_id: string;
  email: string;
  full_name: string;
  role: "admin" | "principal" | "office" | "accountant" | "teacher" | "parent" | "developer" | "student";
  status: "active" | "inactive" | "disabled";
  mobile?: string;
  photo_url?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  admission_no?: string;
  employee_id?: string;
  class_name?: string;
  section?: string;
  subject?: string;
  designation?: string;
  house?: string;
  joining_date?: string;
  parent_name?: string;
  parent_id?: string;
  fee_status?: string;
  attendance_pct?: number;
  experience?: number;
  branch?: string;
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  rollNo: number;
  admissionNo: string;
  name: string;
  age: number;
  dob: string;
  className: string;
  section: string;
  parent: string;
  parentName?: string;
  parentId: string;
  phone: string;
  gender: "Boy" | "Girl";
  house: "Red" | "Blue" | "Green" | "Yellow";
  admissionDate: string;
  feeStatus: "Paid" | "Pending" | "Overdue";
  avatar?: string;
  attendance: number;
  attendancePct?: number;
  branch?: string;
}

export interface Teacher {
  id: string;
  name: string;
  className: string;
  subject: string;
  email: string;
  phone: string;
  experience: number;
  joined: string;
  avatar?: string;
  branch?: string;
}

// ─── USER SERVICE (Module 1: GV_users) ──────────────────────────────────────────

export async function fetchUsers(roleFilter?: string): Promise<{ data: UserRecord[]; error: any }> {
  try {
    let query = supabase.from("GV_users").select("*");
    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }
    const { data, error } = await query;
    if (error || !data) {
      // Fallback query to legacy users/profiles
      const { data: fallbackUsers } = await supabase.from("users").select("*");
      if (fallbackUsers && fallbackUsers.length > 0) {
        return { data: fallbackUsers, error: null };
      }
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
    let { data, error } = await supabase.from("GV_users").select("*").eq("role", "student");
    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("users").select("*").eq("role", "student");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

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
          parent: d.parent_name || "Parent",
          parentName: d.parent_name,
          parentId: d.parent_id || "PRT1001",
          phone: d.phone || "9876543210",
          gender: d.gender || "Boy",
          house: d.house || "Red",
          admissionDate: d.admission_date || "2024-04-01",
          feeStatus: d.fee_status || "Pending",
          avatar: d.avatar,
          attendance: Number(d.attendance_pct || 95),
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
      parent: d.parent_name || "Parent",
      parentName: d.parent_name || "Parent",
      parentId: d.parent_id || "PRT1001",
      phone: d.mobile || "9876543210",
      gender: (d.gender as any) || "Boy",
      house: (d.house as any) || "Red",
      admissionDate: d.joining_date || "2024-04-01",
      feeStatus: (d.fee_status as any) || "Pending",
      avatar: d.photo_url || undefined,
      attendance: Number(d.attendance_pct || 95),
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
    let { data, error } = await supabase.from("GV_users").select("*").eq("role", "teacher");
    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("users").select("*").eq("role", "teacher");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

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

    const { data, error } = await supabase.from("GV_users").upsert([payload]).select();
    Promise.resolve(supabase.from("users").upsert([payload])).catch(() => {});
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}
