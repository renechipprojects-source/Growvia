import { useState, useEffect } from "react";
import type { Message } from "@/lib/mockData";
import { MESSAGES as SEED_MESSAGES } from "@/lib/mockData";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

const KEY = "sunshine.messages.v2";

function readMessages(): Message[] {
  if (typeof window === "undefined") return SEED_MESSAGES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_MESSAGES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_MESSAGES;
  } catch {
    return SEED_MESSAGES;
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
    studentId: input.studentId || "STD-ALL",
    toParentId: input.toParentId || "PRT-ALL",
    subject: input.subject,
    body: input.body,
    time: "Just now",
    priority: input.priority || "Normal",
    read: false,
    direction: "outgoing",
  };

  const current = readMessages();
  const existingIds = new Set(current.map((m) => m.id));
  if (!existingIds.has(newMsg.id)) {
    const next = [newMsg, ...current];
    writeMessages(next);
  }

  if (input.recipientRole === "teacher" || input.recipientRole === "parent") {
    NotificationService.messageReceived(input.fromName, input.subject, input.recipientRole);
  }

  // Sync to Supabase in background
  Promise.resolve(
    supabase.from("messages").insert([
      {
        id: newMsg.id,
        sender_id: input.fromId,
        sender_name: input.fromName,
        receiver_role: input.recipientRole,
        subject: input.subject,
        body: input.body,
        created_at: new Date().toISOString(),
      },
    ])
  ).catch(() => {});

  return newMsg;
}

export function markMessageAsRead(id: string) {
  const current = readMessages();
  const next = current.map((m) => (m.id === id ? { ...m, read: true } : m));
  writeMessages(next);
}

export function useLiveMessages() {
  const [msgs, setMsgs] = useState<Message[]>(readMessages);

  useEffect(() => {
    const handleUpdate = () => setMsgs(readMessages());
    window.addEventListener("sunshine-message", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    // Supabase Realtime subscription for instant message updates across devices
    const unsubscribeRealtime = subscribeToRealtimeTable({
      table: "messages",
      onPayload: ({ eventType, new: newRecord }) => {
        if (eventType === "INSERT" && newRecord) {
          const current = readMessages();
          const exists = current.some((m) => m.id === newRecord.id);
          if (!exists) {
            const mappedMsg: Message = {
              id: newRecord.id || `MSG-${Date.now()}`,
              fromId: newRecord.sender_id || "USER",
              fromName: newRecord.sender_name || "School Member",
              studentId: "STD-ALL",
              toParentId: "PRT-ALL",
              subject: newRecord.subject || "New Message",
              body: newRecord.body || "",
              time: "Just now",
              priority: "Normal",
              read: false,
              direction: "incoming",
            };
            writeMessages([mappedMsg, ...current]);
          }
        }
      },
    });

    return () => {
      window.removeEventListener("sunshine-message", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      unsubscribeRealtime();
    };
  }, []);

  return {
    messages: msgs,
    sendMessage: dispatchMessage,
    markRead: markMessageAsRead,
  };
}
