import { useState, useEffect, useCallback } from "react";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  studentId: string;
  toParentId: string;
  subject: string;
  body: string;
  time: string;
  priority: "Normal" | "High";
  read: boolean;
  direction: "incoming" | "outgoing";
  attachments?: string[];
}

const KEY = "sunshine.messages.v3";

function readMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMessages(msgs: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(msgs));
    window.dispatchEvent(new CustomEvent("sunshine-message"));
  } catch {}
}

export function getMessages(): Message[] {
  return readMessages();
}

export function dispatchMessage(input: {
  fromId: string;
  fromName: string;
  recipientRole: "parent" | "teacher" | "office" | "principal" | "all";
  subject: string;
  body: string;
  studentId?: string;
  toParentId?: string;
  priority?: "Normal" | "High";
  attachments?: string[];
}): Message {
  const newMsg: Message = {
    id: `MSG-${Date.now().toString().slice(-6)}`,
    fromId: input.fromId,
    fromName: input.fromName,
    studentId: input.studentId || "GENERAL",
    toParentId: input.toParentId || "ALL",
    subject: input.subject,
    body: input.body,
    time: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    priority: input.priority || "Normal",
    read: false,
    direction: "outgoing",
    attachments: input.attachments || [],
  };

  const list = readMessages();
  const updated = [newMsg, ...list];
  writeMessages(updated);

  try {
    (NotificationService as any).messageReceived?.(input.fromName, input.subject);
  } catch {}

  try {
    Promise.resolve(
      supabase.from("messages").insert([{
        id: newMsg.id,
        sender_id: input.fromId,
        sender_name: input.fromName,
        sender_role: input.fromName.includes("Teacher") ? "teacher" : "office",
        receiver_id: input.toParentId || "ALL",
        receiver_role: input.recipientRole,
        message_text: `${input.subject}: ${input.body}`,
        sent_at: new Date().toISOString(),
        read_status: false,
      }])
    ).catch(() => {});
  } catch {}

  return newMsg;
}

export function markMessageRead(id: string) {
  const list = readMessages().map((m) => (m.id === id ? { ...m, read: true } : m));
  writeMessages(list);
  Promise.resolve(
    supabase.from("messages").update({ read_status: true }).eq("id", id)
  ).catch(() => {});
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(readMessages);

  const fetchLiveMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("sent_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: Message[] = data.map((d: any) => {
          const parts = (d.message_text || "").split(":");
          const subj = parts.length > 1 ? parts[0].trim() : "Notification";
          const body = parts.length > 1 ? parts.slice(1).join(":").trim() : d.message_text || "";
          return {
            id: d.id || `MSG-${Math.random()}`,
            fromId: d.sender_id || "USR",
            fromName: d.sender_name || "School Office",
            studentId: "GENERAL",
            toParentId: d.receiver_id || "ALL",
            subject: subj,
            body: body,
            time: d.sent_at ? new Date(d.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now",
            priority: "Normal",
            read: Boolean(d.read_status),
            direction: d.sender_role === "office" ? "outgoing" : "incoming",
          };
        });
        setMessages(mapped);
        writeMessages(mapped);
        return;
      }
    } catch {}
    setMessages(readMessages());
  }, []);

  useEffect(() => {
    fetchLiveMessages();

    const sync = () => fetchLiveMessages();
    window.addEventListener("sunshine-message", sync);
    window.addEventListener("storage", sync);

    const unsub = subscribeToRealtimeTable({
      table: "messages",
      onPayload: () => sync(),
    });

    return () => {
      window.removeEventListener("sunshine-message", sync);
      window.removeEventListener("storage", sync);
      unsub();
    };
  }, [fetchLiveMessages]);

  return { messages, dispatchMessage, markMessageRead, refetch: fetchLiveMessages };
}
