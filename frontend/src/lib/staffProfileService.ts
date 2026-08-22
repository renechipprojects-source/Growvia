import { supabase } from "@/lib/supabase";
import { validatePhoneNumber, normalizePhoneNumber } from "@/lib/utils";
import { notifyAutoRefresh } from "@/lib/supabaseService";

export interface StaffProfile {
  id: string;
  login_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  mobile: string;
  photo_url?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  alternate_phone?: string;

  // Emergency contact
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_phone?: string;

  // Employment & professional info (Admin controlled)
  employee_id?: string;
  department?: string;
  designation?: string;
  subject?: string;
  joining_date?: string;
  employment_type?: string;
  qualification?: string;
  specialization?: string;
  experience?: number;
  branch?: string;

  // One-time authoritative profile completion state
  profile_completed?: boolean;
  profile_completed_at?: string;
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function calculateProfileCompletion(p: Partial<StaffProfile> | null): number {
  if (!p) return 0;
  const fields = [
    Boolean(p.full_name?.trim()),
    Boolean(p.email?.trim() && p.email.includes("@")),
    Boolean(p.mobile && p.mobile.length >= 10),
    Boolean(p.date_of_birth?.trim()),
    Boolean(p.gender?.trim()),
    Boolean(p.blood_group?.trim()),
    Boolean(p.address?.trim()),
    Boolean(p.emergency_contact_name?.trim()),
    Boolean(p.emergency_phone && p.emergency_phone.length >= 10),
    Boolean(p.qualification?.trim()),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export async function fetchStaffProfile(identifier: string): Promise<StaffProfile | null> {
  if (!identifier) return null;
  try {
    const cleanId = identifier.trim();
    const { data, error } = await supabase
      .from("gv_users")
      .select("*")
      .or(`id.eq.${cleanId},login_id.ilike.${cleanId},email.ilike.${cleanId},employee_id.ilike.${cleanId}`)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0];
    let extraMeta: any = {};
    try {
      if (row.address && row.address.startsWith("{")) {
        extraMeta = JSON.parse(row.address);
      }
    } catch {}

    const profile: StaffProfile = {
      id: row.id,
      login_id: row.login_id || row.id,
      email: row.email || "",
      full_name: row.full_name || row.name || "Staff Member",
      role: row.role || "teacher",
      status: row.status || "active",
      mobile: normalizePhoneNumber(row.mobile || extraMeta.mobile || ""),
      photo_url: row.photo_url || extraMeta.photo_url || "",
      date_of_birth: row.date_of_birth || extraMeta.date_of_birth || "",
      gender: row.gender || extraMeta.gender || "Male",
      blood_group: extraMeta.blood_group || row.house || "O+",
      address: extraMeta.streetAddress || (row.address && !row.address.startsWith("{") ? row.address : ""),
      city: extraMeta.city || "",
      state: extraMeta.state || "",
      pincode: extraMeta.pincode || "",
      alternate_phone: normalizePhoneNumber(extraMeta.alternate_phone || ""),

      emergency_contact_name: extraMeta.emergency_contact_name || row.parent_name || "",
      emergency_contact_relation: extraMeta.emergency_contact_relation || "Family",
      emergency_phone: normalizePhoneNumber(extraMeta.emergency_phone || ""),

      employee_id: row.employee_id || extraMeta.employee_id || row.login_id,
      department: row.department || extraMeta.department || "Academic",
      designation: row.designation || extraMeta.designation || (row.role === "teacher" ? "Faculty" : "Staff"),
      subject: row.subject || extraMeta.subject || "General",
      joining_date: row.joining_date || extraMeta.joining_date || new Date().toISOString().slice(0, 10),
      employment_type: extraMeta.employment_type || "Full-Time",
      qualification: extraMeta.qualification || "",
      specialization: extraMeta.specialization || "",
      experience: Number(row.experience || extraMeta.experience || 0),
      branch: row.branch || "Main Branch",

      profile_completed: Boolean(extraMeta.profile_completed || row.status === "verified_completed"),
      profile_completed_at: extraMeta.profile_completed_at || "",
      must_change_password: Boolean(row.must_change_password),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return profile;
  } catch {
    return null;
  }
}

export async function saveStaffProfile(profile: Partial<StaffProfile> & { id: string }): Promise<{ success: boolean; error?: string; data?: StaffProfile }> {
  // Validate Primary Phone (must be exactly 10 digits)
  if (profile.mobile) {
    const pCheck = validatePhoneNumber(profile.mobile, true);
    if (!pCheck.valid) {
      return { success: false, error: `Primary Phone: ${pCheck.error}` };
    }
    profile.mobile = pCheck.normalized;
  } else {
    return { success: false, error: "Primary Phone is required (10 digits)." };
  }

  // Validate Alternate Phone if provided
  if (profile.alternate_phone) {
    const altCheck = validatePhoneNumber(profile.alternate_phone, false);
    if (!altCheck.valid) {
      return { success: false, error: `Alternate Phone: ${altCheck.error}` };
    }
    profile.alternate_phone = altCheck.normalized;
  }

  // Validate Emergency Phone if provided
  if (profile.emergency_phone) {
    const emCheck = validatePhoneNumber(profile.emergency_phone, false);
    if (!emCheck.valid) {
      return { success: false, error: `Emergency Phone: ${emCheck.error}` };
    }
    profile.emergency_phone = emCheck.normalized;
  }

  // Validate required identity & contact fields
  if (!profile.full_name || !profile.full_name.trim()) {
    return { success: false, error: "Full Name is required." };
  }
  if (!profile.email || !profile.email.includes("@")) {
    return { success: false, error: "A valid Email address is required." };
  }

  const nowIso = new Date().toISOString();
  const addressMeta = {
    streetAddress: profile.address || "",
    city: profile.city || "",
    state: profile.state || "",
    pincode: profile.pincode || "",
    alternate_phone: profile.alternate_phone || "",
    emergency_contact_name: profile.emergency_contact_name || "",
    emergency_contact_relation: profile.emergency_contact_relation || "",
    emergency_phone: profile.emergency_phone || "",
    blood_group: profile.blood_group || "O+",
    department: profile.department || "Academic",
    employment_type: profile.employment_type || "Full-Time",
    qualification: profile.qualification || "",
    specialization: profile.specialization || "",
    experience: profile.experience || 0,
    photo_url: profile.photo_url || "",
    date_of_birth: profile.date_of_birth || "",
    gender: profile.gender || "Male",
    joining_date: profile.joining_date || nowIso.slice(0, 10),
    profile_completed: true,
    profile_completed_at: nowIso,
  };

  const payload: any = {
    id: profile.id,
    login_id: profile.login_id || profile.employee_id || profile.id,
    full_name: profile.full_name.trim(),
    email: profile.email.trim().toLowerCase(),
    mobile: profile.mobile,
    photo_url: profile.photo_url || null,
    date_of_birth: profile.date_of_birth || null,
    gender: profile.gender || "Male",
    address: JSON.stringify(addressMeta),
    employee_id: profile.employee_id || profile.id,
    designation: profile.designation || "Faculty",
    subject: profile.subject || "General",
    experience: Number(profile.experience || 0),
    status: "active",
    updated_at: nowIso,
  };

  try {
    const { data, error } = await supabase
      .from("gv_users")
      .upsert([payload], { onConflict: "id" })
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    notifyAutoRefresh("staff");
    notifyAutoRefresh("teachers");

    const updated = await fetchStaffProfile(profile.id);
    return { success: true, data: updated || undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save profile to database." };
  }
}
