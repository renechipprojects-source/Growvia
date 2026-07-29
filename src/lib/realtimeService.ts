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
  const channelName = `realtime:${table}:${filter || "all"}:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: table,
        filter: filter,
      },
      (payload: any) => {
        onPayload({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          table: table,
        });
      }
    )
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        activeChannels.set(channelName, channel);
      }
    });

  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelName);
  };
}

/**
 * Maps Supabase table names to ERP module names for auto-refresh revalidation.
 */
export const TABLE_TO_MODULE_MAP: Record<string, ERPModule> = {
  circulars: "circulars",
  messages: "messages",
  leave_requests: "leaveRequests",
  students: "students",
  fees: "fees",
  enquiries: "admissions",
  notifications: "notifications",
};
