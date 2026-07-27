import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NotificationService } from "./notifications";

export type AlertPriority = "Low" | "Normal" | "High" | "Urgent";
export type AlertAudience = "teachers" | "office" | "both";

export interface CircularAlert {
  id: string;
  title: string;
  description: string;
  priority: AlertPriority;
  attachmentName?: string;
  publishDate: string; // yyyy-mm-dd
  expiryDate: string;  // yyyy-mm-dd
  audience: AlertAudience;
  createdAt: string;
  readBy: string[]; // user ids
}

interface AlertsState {
  alerts: CircularAlert[];
  create: (a: Omit<CircularAlert, "id" | "createdAt" | "readBy">) => void;
  update: (id: string, patch: Partial<CircularAlert>) => void;
  remove: (id: string) => void;
  markRead: (id: string, userId: string) => void;
  liveFor: (audience: "teachers" | "office") => CircularAlert[];
  unreadFor: (audience: "teachers" | "office", userId: string) => number;
}

const Ctx = createContext<AlertsState | null>(null);
const KEY = "sunshine.alerts.v1";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function load(): CircularAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CircularAlert[];
  } catch { /* noop */ }
  // Seed with a couple of demo alerts
  const seed: CircularAlert[] = [
    {
      id: "AL-1001",
      title: "Annual Sports Day Rehearsal",
      description: "All teachers to gather in the assembly at 9:30 AM for rehearsal briefing.",
      priority: "High",
      publishDate: todayISO(),
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      audience: "both",
      createdAt: new Date().toISOString(),
      readBy: [],
    },
    {
      id: "AL-1002",
      title: "Fee reminder circular",
      description: "Office staff to send WhatsApp reminders for pending July fees today.",
      priority: "Normal",
      publishDate: todayISO(),
      expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      audience: "office",
      createdAt: new Date().toISOString(),
      readBy: [],
    },
  ];
  return seed;
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<CircularAlert[]>(() => load());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(alerts));
    }
  }, [alerts]);

  const create: AlertsState["create"] = useCallback((a) => {
    setAlerts((prev) => [
      { ...a, id: `AL-${Date.now()}`, createdAt: new Date().toISOString(), readBy: [] },
      ...prev,
    ]);
    NotificationService.circularPublished(a.title);
  }, []);
  const update: AlertsState["update"] = useCallback((id, patch) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);
  const remove: AlertsState["remove"] = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const markRead: AlertsState["markRead"] = useCallback((id, userId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id && !a.readBy.includes(userId) ? { ...a, readBy: [...a.readBy, userId] } : a)),
    );
  }, []);

  const liveFor = useCallback((audience: "teachers" | "office") => {
    const today = todayISO();
    return alerts
      .filter((a) => a.publishDate <= today && a.expiryDate >= today)
      .filter((a) => a.audience === audience || a.audience === "both")
      .sort((a, b) => {
        const rank: Record<AlertPriority, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
        if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [alerts]);

  const unreadFor = useCallback((audience: "teachers" | "office", userId: string) => {
    return liveFor(audience).filter((a) => !a.readBy.includes(userId)).length;
  }, [liveFor]);

  const value = useMemo<AlertsState>(() => ({ alerts, create, update, remove, markRead, liveFor, unreadFor }), [alerts, create, update, remove, markRead, liveFor, unreadFor]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlerts(): AlertsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlerts must be used inside <AlertsProvider>");
  return ctx;
}
