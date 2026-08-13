import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  from: string;
  to: string;
  reason: string;
  description?: string;
  medicalCertificateName?: string;
  medicalCertificateDataUrl?: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
}

interface LeaveState {
  requests: LeaveRequest[];
  submit: (r: Omit<LeaveRequest, "id" | "status" | "submittedAt">) => LeaveRequest;
  setStatus: (id: string, status: LeaveRequest["status"]) => void;
  forStudent: (studentId: string) => LeaveRequest[];
}

const Ctx = createContext<LeaveState | null>(null);

let memoryLeaveCache: LeaveRequest[] = [];

import { getSession } from "./auth";

export async function fetchLeaveRequestsFromSupabase(): Promise<LeaveRequest[]> {
  try {
    let query = supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "leave");

    const session = getSession();
    if (session && (session.role === "parent" || session.role === "student")) {
      const uId = session.linkId || session.loginId;
      query = query.or(`applicant_or_child_name.eq.${uId},reason_or_notes.cs.{"studentId":"${uId}"}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error || !data) return memoryLeaveCache;

    const mapped: LeaveRequest[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      return {
        id: d.id,
        studentId: meta.studentId || d.applicant_or_child_name || d.id,
        studentName: d.applicant_or_child_name || meta.studentName || "Student",
        className: d.class_name || meta.className || "Nursery",
        section: d.section || meta.section || "A",
        from: meta.from || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        to: meta.to || meta.from || new Date().toISOString().slice(0, 10),
        reason: meta.reason || d.leave_type_or_interested_class || "Personal Leave",
        description: meta.description || d.reason_or_notes,
        medicalCertificateName: meta.medicalCertificateName,
        medicalCertificateDataUrl: meta.medicalCertificateDataUrl,
        status: (d.status as any) || meta.status || "Pending",
        submittedAt: d.created_at || new Date().toISOString(),
      };
    });

    memoryLeaveCache = mapped;
    return mapped;
  } catch {
    return memoryLeaveCache;
  }
}

export function LeaveProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => memoryLeaveCache);

  useEffect(() => {
    fetchLeaveRequestsFromSupabase().then((res) => {
      if (res) setRequests(res);
    });

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_requests",
      onPayload: () => {
        fetchLeaveRequestsFromSupabase().then((res) => {
          if (res) setRequests(res);
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const submit: LeaveState["submit"] = useCallback((r) => {
    const newId = `LV-${Date.now()}`;
    const created: LeaveRequest = {
      ...r,
      id: newId,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => {
      const next = [created, ...prev];
      memoryLeaveCache = next;
      return next;
    });

    Promise.resolve(
      supabase.from("gv_requests").insert([{
        id: newId,
        request_type: "leave",
        applicant_or_child_name: r.studentName,
        leave_type_or_interested_class: r.reason,
        status: "Pending",
        reason_or_notes: JSON.stringify(created),
      }])
    ).catch(() => {});

    return created;
  }, []);

  const setStatus: LeaveState["setStatus"] = useCallback((id, status) => {
    setRequests((prev) => {
      const next = prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, status };
          Promise.resolve(
            supabase.from("gv_requests").update({
              status,
              reason_or_notes: JSON.stringify(updated),
            }).eq("id", id)
          ).catch(() => {});
          return updated;
        }
        return r;
      });
      memoryLeaveCache = next;
      return next;
    });
  }, []);

  const forStudent = useCallback((studentId: string) => requests.filter((r) => r.studentId === studentId), [requests]);

  const value = useMemo(() => ({ requests, submit, setStatus, forStudent }), [requests, submit, setStatus, forStudent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeave(): LeaveState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
