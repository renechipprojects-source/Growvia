import { supabase } from "./supabase";
import type { ERPModule } from "./autoRefreshContext";

export type RealtimeCallback = (payload: { eventType: string; new: any; old: any; table: string }) => void;

interface RealtimeSubscriptionOptions {
  table: string;
  onPayload: RealtimeCallback;
  filter?: string;
}

const activeChannels = new Map<string, any>();

/**
 * Subscribe to realtime changes on a specific Supabase table.
 * Automatically cleans up subscription when returned unsubscribe function is called.
 */
export function subscribeToRealtimeTable({
  table,
  onPayload,
  filter,
}: RealtimeSubscriptionOptions): () => void {
  const channelKey = `rt_${table}_${filter || "all"}_${Math.random().toString(36).substring(7)}`;
  let isUnsubscribed = false;

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload: any) => {
          if (isUnsubscribed) return;
          try {
            onPayload({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
              table: table,
            });
          } catch {}
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED" && !isUnsubscribed) {
          activeChannels.set(channelKey, channel);
        }
      });

    return () => {
      isUnsubscribed = true;
      try {
        supabase.removeChannel(channel);
      } catch {}
      activeChannels.delete(channelKey);
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
  gv_users: ["students", "staff", "attendance", "promotion", "assignments"],
  gv_inventory_expenses: ["inventory", "reports"],
  gv_fees_payments: ["fees", "reports"],
  gv_communications: ["circulars", "messages", "notifications"],
  gv_requests: ["leaveRequests", "admissions"],
  gv_system_settings: ["reports"],
  GV_users: ["students", "staff", "attendance", "promotion", "assignments"],
  GV_inventory_expenses: ["inventory", "reports"],
  GV_fees_payments: ["fees", "reports"],
  GV_communications: ["circulars", "messages", "notifications"],
  GV_requests: ["leaveRequests", "admissions"],
  GV_system_settings: ["reports"],
  users: ["students", "staff", "attendance", "promotion"],
  students: ["students"],
  teachers: ["staff"],
  fees: ["fees"],
  fees_payments: ["fees"],
  inventory_expenses: ["inventory"],
  communications: ["circulars", "messages", "notifications"],
  circulars: ["circulars"],
  messages: ["messages"],
  requests: ["leaveRequests", "admissions"],
  leave_requests: ["leaveRequests"],
  enquiries: ["admissions"],
  system_settings: ["reports"],
};
