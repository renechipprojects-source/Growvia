import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String
  user: string;
  role: string;
  module: string;
  action: string;
  previousValue?: string;
  newValue?: string;
}

const KEY = "sunshine.auditLogs.v1";

const SEED: AuditLogEntry[] = [
  { id: "LOG-1001", timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), user: "Super Admin", role: "admin", module: "System", action: "Login", previousValue: "Offline", newValue: "Session Active" },
  { id: "LOG-1002", timestamp: new Date(Date.now() - 3600000 * 20).toISOString(), user: "Office Admin", role: "office", module: "Fees", action: "Fee Collected", previousValue: "Pending ₹8,500", newValue: "Paid ₹8,500 (Cash)" },
  { id: "LOG-1003", timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), user: "Principal", role: "principal", module: "Circulars", action: "Circular Published", previousValue: "Draft", newValue: "Published (All Roles)" },
  { id: "LOG-1004", timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), user: "Mrs. Priya", role: "teacher", module: "Attendance", action: "Attendance Marked", previousValue: "Unmarked", newValue: "Present: 18, Absent: 2" },
  { id: "LOG-1005", timestamp: new Date(Date.now() - 1800000).toISOString(), user: "Office Admin", role: "office", module: "Staff", action: "Teacher Assignment Changed", previousValue: "Class Teacher: None", newValue: "Class Teacher: LKG-A" },
];

export function readAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AuditLogEntry[];
  } catch { /* noop */ }
  window.localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
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
  const updated = [newEntry, ...current].slice(0, 200); // keep last 200 logs
  window.localStorage.setItem(KEY, JSON.stringify(updated));
}
