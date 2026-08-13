import { useState, useEffect, useCallback } from "react";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";
import { notifyAutoRefresh, useAutoRefresh } from "./autoRefreshContext";

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  studentId: string;
  toParentId: string;
  recipientRole?: string;
  subject: string;
  body: string;
  time: string;
  priority: "Normal" | "High";
  read: boolean;
  direction: "incoming" | "outgoing";
  attachments?: string[];
}

import { getUserScopedStorageKey } from "./auth";

const BASE_MESSAGES_KEY = "sunshine.messages.v3";
let memoryMessagesCache: Message[] = [];

function readMessages(): Message[] {
  if (memoryMessagesCache.length > 0) return memoryMessagesCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getUserScopedStorageKey(BASE_MESSAGES_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryMessagesCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function writeMessages(msgs: Message[]) {
  memoryMessagesCache = msgs;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getUserScopedStorageKey(BASE_MESSAGES_KEY), JSON.stringify(msgs));
    } catch {}
    window.dispatchEvent(new CustomEvent("sunshine-message"));
  }
}

import { getSession } from "./auth";

export async function fetchMessagesFromSupabase(): Promise<Message[]> {
  try {
    let query = supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "message");

    const session = getSession();
    if (session && (session.role === "teacher" || session.role === "parent" || session.role === "student")) {
      const uId = session.linkId || session.loginId;
      const rName = session.role;
      query = query.or(
        `sender_id.eq.${uId},receiver_id.eq.${uId},recipient_user_id.eq.${uId},receiver_role.eq.${rName},receiver_role.eq.all,recipient_role.eq.all`
      );
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return readMessages();

    const mapped: Message[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.content && (d.content.startsWith("{") || d.content.startsWith("["))) {
          meta = JSON.parse(d.content);
        }
      } catch {}

      return {
        id: d.id,
        fromId: d.sender_id || meta.fromId || d.author || "SYSTEM",
        fromName: d.sender_name || d.author || meta.fromName || "Staff",
        studentId: meta.studentId || d.recipient_user_id || "GENERAL",
        toParentId: d.recipient_user_id || meta.toParentId || "ALL",
        recipientRole: d.recipient_role || d.target_audience || meta.recipientRole || "all",
        subject: d.title || d.subject || meta.subject || "Message",
        body: d.body || meta.body || d.message_text || d.content || d.title,
        time: (d.created_at || d.published_at || d.published_date) ? new Date(d.created_at || d.published_at || d.published_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
        priority: d.priority === "high" || d.priority === "High" || meta.priority === "High" ? "High" : "Normal",
        read: d.read_status ?? meta.read ?? false,
        direction: meta.direction || "incoming",
        attachments: d.attachment_url ? [d.attachment_url] : meta.attachments || [],
      };
    });

    writeMessages(mapped);
    return mapped;
  } catch {
    return readMessages();
  }
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
  const newId = `MSG-${Date.now().toString().slice(-6)}`;
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newMsg: Message = {
    id: newId,
    fromId: input.fromId,
    fromName: input.fromName,
    studentId: input.studentId || "GENERAL",
    toParentId: input.toParentId || "ALL",
    recipientRole: input.recipientRole,
    subject: input.subject,
    body: input.body,
    time: `Today ${timeStr}`,
    priority: input.priority || "Normal",
    read: false,
    direction: "incoming",
    attachments: input.attachments || [],
  };

  const list = readMessages();
  const updated = [newMsg, ...list];
  writeMessages(updated);
  notifyAutoRefresh("messages");

  try {
    (NotificationService as any).messageReceived?.(input.fromName, input.subject);
  } catch {}

  Promise.resolve(
    supabase.from("gv_communications").insert([{
      id: newId,
      message_type: "message",
      title: input.subject,
      body: input.body,
      sender_id: input.fromId,
      sender_name: input.fromName,
      sender_role: "staff",
      recipient_role: input.recipientRole,
      recipient_user_id: input.toParentId || null,
      published_at: new Date().toISOString(),
    }])
  ).catch(() => {});

  return newMsg;
}

export function markMessageRead(id: string) {
  const current = readMessages();
  const updated = current.map((m) => (m.id === id ? { ...m, read: true } : m));
  writeMessages(updated);
  notifyAutoRefresh("messages");
  Promise.resolve(
    supabase.from("gv_communications").update({
      read_status: true,
    }).eq("id", id)
  ).catch(() => {});
}

export function deleteMessage(id: string) {
  const current = readMessages();
  const updated = current.filter((m) => m.id !== id);
  writeMessages(updated);
  notifyAutoRefresh("messages");
  Promise.resolve(
    supabase.from("gv_communications").delete().eq("id", id)
  ).catch(() => {});
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(readMessages);

  const loadData = useCallback(() => {
    fetchMessagesFromSupabase().then((res) => {
      if (res) setMessages(res);
    });
  }, []);

  useAutoRefresh("messages", loadData);

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_communications",
      onPayload: () => {
        loadData();
      },
    });

    const sync = () => {
      const stored = readMessages();
      setMessages([...stored]);
    };
    window.addEventListener("sunshine-message", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("sunshine-message", sync);
    };
  }, [loadData]);

  const send = useCallback(
    (input: Parameters<typeof dispatchMessage>[0]) => {
      const created = dispatchMessage(input);
      setMessages([...readMessages()]);
      return created;
    },
    []
  );

  return {
    messages,
    sendMessage: send,
    dispatchMessage: send,
    deleteMessage: (id: string) => {
      deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    markRead: (id: string) => {
      markMessageRead(id);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    },
    unreadCount: messages.filter((m) => !m.read).length,
  };
}
