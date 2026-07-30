import { useState, useEffect } from "react";
import type { Message } from "@/lib/mockData";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

const KEY = "sunshine.messages.v2";

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
}): Message {
  const newMsg: Message = {
    id: `MSG-${Date.now().toString().slice(-4)}`,
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
  };

  const list = readMessages();
  const updated = [newMsg, ...list];
  writeMessages(updated);

  try {
    (NotificationService as any).messageReceived?.(input.fromName, input.subject);
  } catch {}

  try {
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
    }]);
  } catch {}

  return newMsg;
}

export function markMessageRead(id: string) {
  const list = readMessages().map((m) => (m.id === id ? { ...m, read: true } : m));
  writeMessages(list);
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(readMessages);

  useEffect(() => {
    const sync = () => setMessages(readMessages());
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
  }, []);

  return { messages, dispatchMessage, markMessageRead };
}
