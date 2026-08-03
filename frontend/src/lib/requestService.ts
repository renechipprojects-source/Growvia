import { supabase } from "./supabase";
import type { LeaveRequest } from "./supabaseService";
import type { Enquiry } from "./mockData";

// ─── REQUESTS SERVICE (Module 5: GV_requests) ───────────────────────────────────

export async function fetchLeaveRequestsFromModule(): Promise<{ data: LeaveRequest[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "leave");

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: LeaveRequest[] = rows.map((d: any) => ({
      id: d.id,
      applicant_name: d.applicant_or_child_name,
      applicant_role: d.leave_type_or_interested_class || "Teacher",
      start_date: d.start_date || new Date().toISOString().split("T")[0],
      end_date: d.end_date || new Date().toISOString().split("T")[0],
      reason: d.reason_or_notes || "Personal leave",
      status: d.status || "Pending",
      applied_on: new Date(d.created_at).toISOString().split("T")[0],
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchEnquiriesFromModule(): Promise<{ data: Enquiry[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "enquiry");

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: Enquiry[] = rows.map((d: any) => ({
      id: d.id,
      childName: d.applicant_or_child_name,
      parentName: d.parent_name || "Parent",
      phone: d.phone || "",
      altPhone: "",
      email: d.email || "",
      address: d.address || "",
      gender: d.gender === "Girl" ? "Girl" : "Boy",
      dob: d.dob || "2022-01-01",
      previousSchool: "",
      age: 3,
      interestedClass: d.leave_type_or_interested_class || "Nursery",
      source: d.source || "Walk-in",
      status: d.status || "New",
      followUp: d.follow_up_date || d.created_at?.slice(0, 10),
      notes: d.reason_or_notes || "",
      createdAt: d.created_at || new Date().toISOString(),
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createLeaveRequestToModule(leave: Partial<LeaveRequest>) {
  const payload = {
    id: leave.id || `LR-${Date.now()}`,
    request_type: "leave",
    applicant_or_child_name: leave.applicant_name,
    leave_type_or_interested_class: leave.applicant_role,
    start_date: leave.start_date,
    end_date: leave.end_date,
    reason_or_notes: leave.reason,
    status: leave.status || "Pending",
  };

  try {
    const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
    Promise.resolve(supabase.from("requests").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}

export async function createEnquiryToModule(enquiry: Partial<Enquiry>) {
  const payload = {
    id: enquiry.id || `ENQ-${Date.now()}`,
    request_type: "enquiry",
    applicant_or_child_name: enquiry.childName,
    parent_name: enquiry.parentName,
    phone: enquiry.phone,
    email: enquiry.email,
    address: enquiry.address,
    gender: enquiry.gender,
    dob: enquiry.dob,
    leave_type_or_interested_class: enquiry.interestedClass,
    source: enquiry.source,
    status: enquiry.status || "New",
    follow_up_date: enquiry.followUp,
    reason_or_notes: enquiry.notes,
  };

  try {
    const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
    Promise.resolve(supabase.from("requests").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
