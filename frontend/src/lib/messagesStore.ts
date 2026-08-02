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
    return raw ? JSON.parse(raw) : [];
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
        fromId: meta.fromId || d.author || "SYSTEM",
        fromName: d.author || meta.fromName || "Staff",
        studentId: meta.studentId || "GENERAL",
        toParentId: d.target_audience || meta.toParentId || "ALL",
        subject: d.title || meta.subject || "Message",
        body: meta.body || d.content || d.title,
        time: d.published_date || d.created_at ? new Date(d.created_at || d.published_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
        priority: meta.priority || "Normal",
        read: meta.read ?? false,
        direction: meta.direction || "outgoing",
        attachments: meta.attachments || [],
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
  const newMsg: Message = {
    id: newId,
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

  const meta = {
    fromId: input.fromId,
    fromName: input.fromName,
    studentId: input.studentId || "GENERAL",
    toParentId: input.toParentId || "ALL",
    subject: input.subject,
    body: input.body,
    priority: input.priority || "Normal",
    read: false,
    direction: "outgoing",
    attachments: input.attachments || [],
  };

  Promise.resolve(
    supabase.from("gv_communications").insert([{
      id: newId,
      message_type: "message",
      title: input.subject,
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
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(readMessages);

  useEffect(() => {
    fetchMessagesFromSupabase().then((res) => {
      if (res && res.length > 0) setMessages(res);
    });

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_communications",
      onPayload: () => {
        fetchMessagesFromSupabase().then((res) => {
          if (res) setMessages(res);
        });
      },
    });

    const sync = () => setMessages(readMessages());
    window.addEventListener("sunshine-message", sync);
    window.addEventListener("storage", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("sunshine-message", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const send = useCallback(
    (input: Parameters<typeof dispatchMessage>[0]) => {
      const created = dispatchMessage(input);
      setMessages(readMessages());
      return created;
    },
    []
  );

  return {
    messages,
    sendMessage: send,
    dispatchMessage: send,
    markRead: (id: string) => {
      markMessageRead(id);
      setMessages(readMessages());
    },
    unreadCount: messages.filter((m) => !m.read).length,
  };
}
