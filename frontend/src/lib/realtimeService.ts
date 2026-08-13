import { supabase } from "./supabase";
import type { ERPModule } from "./autoRefreshContext";

export type RealtimeCallback = (payload: { eventType: string; new: any; old: any; table: string }) => void;

interface RealtimeSubscriptionOptions {
  table: string;
  onPayload: RealtimeCallback;
  filter?: string;
}

interface TableChannelManager {
  channel: any;
  callbacks: Set<RealtimeCallback>;
  isSubscribed: boolean;
}

const tableChannelManagers = new Map<string, TableChannelManager>();

/**
 * Subscribe to realtime changes on a specific Supabase table using singleton channel pooling.
 * Automatically cleans up subscription when all subscribers for a table unmount.
 */
export function subscribeToRealtimeTable({
  table,
  onPayload,
  filter,
}: RealtimeSubscriptionOptions): () => void {
  const managerKey = `${table}_${filter || "all"}`;

  try {
    if (!tableChannelManagers.has(managerKey)) {
      const callbacks = new Set<RealtimeCallback>();

      const channel = supabase
        .channel(`rt_singleton_${managerKey}`)
        .on(
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: table,
            filter: filter,
          },
          (payload: any) => {
            // Ignore internal circular read/ack receipts to prevent realtime loops
            if (payload?.new?.receiver_role === "read" || payload?.new?.receiver_role === "ack") return;
            const mappedPayload = {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: table,
            };
            callbacks.forEach((cb) => {
              try {
                cb(mappedPayload);
              } catch {}
            });
          }
        )
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            const mgr = tableChannelManagers.get(managerKey);
            if (mgr) mgr.isSubscribed = true;
          }
        });

      tableChannelManagers.set(managerKey, { channel, callbacks, isSubscribed: false });
    }

    const manager = tableChannelManagers.get(managerKey)!;
    manager.callbacks.add(onPayload);

    return () => {
      manager.callbacks.delete(onPayload);
      if (manager.callbacks.size === 0) {
        try {
          supabase.removeChannel(manager.channel);
        } catch {}
        tableChannelManagers.delete(managerKey);
      }
    };
  } catch (err) {
    console.warn("Realtime subscription notice:", err);
    return () => {};
  }
}

/**
 * Maps the 6 consolidated Supabase GV_ table names to affected ERP module lists for instant UI refresh.
 */
export const TABLE_TO_MODULE_MAP: Record<string, ERPModule[]> = {
  gv_users: ["students", "staff", "parents", "attendance", "promotion", "assignments", "admissions", "reports"],
  gv_inventory_expenses: ["inventory", "transport", "reports", "expenses"],
  gv_fees_payments: ["fees", "reports"],
  gv_communications: ["circulars", "messages", "notifications", "homework"],
  gv_requests: ["leaveRequests", "admissions", "enquiries", "visits", "attendance", "marks", "assignments"],
  gv_system_settings: ["reports"],
  GV_users: ["students", "staff", "parents", "attendance", "promotion", "assignments", "admissions", "reports"],
  GV_inventory_expenses: ["inventory", "transport", "reports", "expenses"],
  GV_fees_payments: ["fees", "reports"],
  GV_communications: ["circulars", "messages", "notifications", "homework"],
  GV_requests: ["leaveRequests", "admissions", "enquiries", "visits", "attendance", "marks", "assignments"],
  GV_system_settings: ["reports"],
  users: ["students", "staff", "attendance", "promotion"],
  students: ["students"],
  teachers: ["staff"],
  fees: ["fees"],
  fees_payments: ["fees"],
  inventory_expenses: ["inventory", "transport"],
  communications: ["circulars", "messages", "notifications"],
  circulars: ["circulars"],
  messages: ["messages"],
  requests: ["leaveRequests", "admissions"],
  leave_requests: ["leaveRequests"],
  enquiries: ["admissions"],
  system_settings: ["reports"],
};
