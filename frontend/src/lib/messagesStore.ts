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

const MESSAGES_KEY = "sunshine.messages.v3";
let memoryMessagesCache: Message[] = [];

function readMessages(): Message[] {
  if (memoryMessagesCache.length > 0) return memoryMessagesCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
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
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
    } catch {}
    window.dispatchEvent(new CustomEvent("sunshine-message"));
  }
}

export async function fetchMessagesFromSupabase(): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "message")
      .order("created_at", { ascending: false });

    if (error || !data) return readMessages();

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
        studentId: meta.studentId || "GENERAL",
        toParentId: d.receiver_id || d.target_audience || meta.toParentId || "ALL",
        recipientRole: d.receiver_role || d.target_audience || meta.recipientRole || "all",
        subject: d.subject || d.title || meta.subject || "Message",
        body: meta.body || d.message_text || d.body || d.content || d.title,
        time: (d.created_at || d.published_date) ? new Date(d.created_at || d.published_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
        priority: meta.priority || "Normal",
        read: meta.read ?? false,
        direction: meta.direction || "incoming",
        attachments: meta.attachments || [],
      };
    });

    const localList = readMessages();
    const map = new Map<string, Message>();
    mapped.forEach((m) => map.set(m.id, m));
    localList.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });

    const merged = Array.from(map.values());
    writeMessages(merged);
    return merged;
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

  const meta = {
    fromId: input.fromId,
    fromName: input.fromName,
    studentId: input.studentId || "GENERAL",
    toParentId: input.toParentId || "ALL",
    recipientRole: input.recipientRole,
    subject: input.subject,
    body: input.body,
    priority: input.priority || "Normal",
    read: false,
    direction: "incoming",
    attachments: input.attachments || [],
  };

  Promise.resolve(
    supabase.from("gv_communications").insert([{
      id: newId,
      message_type: "message",
      sender_id: input.fromId,
      sender_name: input.fromName,
      receiver_id: input.toParentId || "ALL",
      receiver_role: input.recipientRole,
      subject: input.subject,
      title: input.subject,
      message_text: input.body,
      body: input.body,
      content: JSON.stringify(meta),
      target_audience: input.recipientRole,
      author: input.fromName,
      published_date: new Date().toISOString(),
    }])
  ).catch(() => {});

  return newMsg;
}

export function markMessageRead(id: string) {
  const list = readMessages().map((m) => (m.id === id ? { ...m, read: true } : m));
  writeMessages(list);
  Promise.resolve(
    supabase.from("gv_communications").update({
      content: JSON.stringify({
        ...readMessages().find((m) => m.id === id),
        read: true,
      }),
    }).eq("id", id)
  ).catch(() => {});
}

export function deleteMessage(id: string) {
  const list = readMessages().filter((m) => m.id !== id);
  writeMessages(list);
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
      setMessages([...readMessages()]);
    },
    markRead: (id: string) => {
      markMessageRead(id);
      setMessages([...readMessages()]);
    },
    unreadCount: messages.filter((m) => !m.read).length,
  };
}
