import { supabase } from "./supabase";
import type { LeaveRequest } from "./supabaseService";
import type { Enquiry } from "./mockData";

// ─── REQUESTS SERVICE (Module 5: GV_requests) ───────────────────────────────────

export async function fetchLeaveRequestsFromModule(): Promise<{ data: LeaveRequest[]; isFromSupabase: boolean }> {
  try {
    let { data, error } = await supabase
      .from("GV_requests")
      .select("*")
      .eq("request_type", "leave");

    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("requests").select("*").eq("request_type", "leave");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      // Fallback query to legacy leave_requests table
      const { data: legacy } = await supabase.from("leave_requests").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: LeaveRequest[] = legacy.map((d: any) => ({
          id: d.id,
          applicant_name: d.applicant_name,
          applicant_role: d.applicant_role,
          start_date: d.start_date,
          end_date: d.end_date,
          reason: d.reason,
          status: d.status,
          applied_on: d.applied_on || d.created_at,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: LeaveRequest[] = data.map((d: any) => ({
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
    let { data, error } = await supabase
      .from("GV_requests")
      .select("*")
      .eq("request_type", "enquiry");

    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("requests").select("*").eq("request_type", "enquiry");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      // Fallback query to legacy enquiries table
      const { data: legacy } = await supabase.from("enquiries").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: Enquiry[] = legacy.map((d: any) => ({
          id: d.id,
          childName: d.child_name,
          parentName: d.parent_name,
          phone: d.phone,
          altPhone: d.alt_phone,
          email: d.email,
          address: d.address,
          gender: d.gender,
          dob: d.dob,
          previousSchool: d.previous_school,
          age: d.age,
          interestedClass: d.interested_class,
          source: d.source,
          status: d.status,
          followUp: d.follow_up,
          notes: d.notes,
          createdAt: d.created_at,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: Enquiry[] = data.map((d: any) => ({
      id: d.id,
      childName: d.applicant_or_child_name,
      parentName: d.parent_name || "Parent",
      phone: d.phone || "9876543210",
      altPhone: undefined,
      email: d.email || "",
      address: d.address || "",
      gender: (d.gender as any) || "Boy",
      dob: d.dob || "2021-01-01",
      previousSchool: undefined,
      age: 4,
      interestedClass: d.leave_type_or_interested_class || "Nursery",
      source: (d.source as any) || "Walk-in",
      status: (d.status as any) || "New",
      followUp: d.follow_up_date || new Date().toISOString().split("T")[0],
      notes: d.reason_or_notes || "",
      createdAt: d.created_at,
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
    const { data, error } = await supabase.from("GV_requests").insert([payload]).select();
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
    const { data, error } = await supabase.from("GV_requests").insert([payload]).select();
    Promise.resolve(supabase.from("requests").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
