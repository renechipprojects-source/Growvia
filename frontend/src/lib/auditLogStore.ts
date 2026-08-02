import { supabase } from "./supabase";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  module: string;
  action: string;
  previousValue?: string;
  newValue?: string;
}

const KEY = "sunshine.auditLogs.v1";

export function readAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

export async function fetchAuditLogsFromSupabase(): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "audit_log")
      .order("created_at", { ascending: false });

    if (error || !data) return readAuditLogs();

    const mapped: AuditLogEntry[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      return {
        id: d.id,
        timestamp: d.created_at || meta.timestamp || new Date().toISOString(),
        user: d.applicant_or_child_name || meta.user || "System",
        role: meta.role || "office",
        module: d.class_name || meta.module || "System",
        action: meta.action || d.status || "Action Executed",
        previousValue: meta.previousValue,
        newValue: meta.newValue,
      };
    });

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(mapped));
      } catch {}
    }
    return mapped;
  } catch {
    return readAuditLogs();
  }
}

export const getAuditLogs = readAuditLogs;

export function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  const current = readAuditLogs();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newEntry, ...current].slice(0, 200);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}

  Promise.resolve(
    supabase.from("gv_requests").insert([{
      id: newEntry.id,
      request_type: "audit_log",
      applicant_or_child_name: newEntry.user,
      class_name: newEntry.module,
      status: newEntry.action,
      reason_or_notes: JSON.stringify(newEntry),
    }])
  ).catch(() => {});
}
