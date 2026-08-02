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
const KEY = "sunshine.leave.v1";

function load(): LeaveRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LeaveRequest[];
  } catch { /* noop */ }
  return [];
}

export async function fetchLeaveRequestsFromSupabase(): Promise<LeaveRequest[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "leave")
      .order("created_at", { ascending: false });

    if (error || !data) return load();

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

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(mapped));
      } catch {}
    }
    return mapped;
  } catch {
    return load();
  }
}

export function LeaveProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => load());

  useEffect(() => {
    fetchLeaveRequestsFromSupabase().then((res) => {
      if (res && res.length > 0) setRequests(res);
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

  const saveLocalAndRemote = (nextRequests: LeaveRequest[]) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(nextRequests));
      } catch {}
    }
  };

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
      saveLocalAndRemote(next);
      return next;
    });

    Promise.resolve(
      supabase.from("gv_requests").insert([{
        id: newId,
        request_type: "leave",
        applicant_or_child_name: r.studentName,
        class_name: r.className,
        section: r.section,
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
      saveLocalAndRemote(next);
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
