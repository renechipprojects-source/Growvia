import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

export function LeaveProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => load());

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(requests));
  }, [requests]);

  const submit: LeaveState["submit"] = useCallback((r) => {
    const created: LeaveRequest = {
      ...r,
      id: `LV-${Date.now()}`,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const setStatus: LeaveState["setStatus"] = useCallback((id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
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
