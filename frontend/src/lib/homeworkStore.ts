import { useState, useEffect } from "react";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

export interface Homework {
  id: string | number;
  title: string;
  className: string;
  subject: string;
  due: string;
}

let memoryHomeworkCache: Homework[] = [];

function readHomework(): Homework[] {
  return memoryHomeworkCache;
}

function writeHomework(items: Homework[]) {
  memoryHomeworkCache = items;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sunshine-homework"));
  }
}

export async function fetchHomeworkFromSupabase(): Promise<Homework[]> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "homework")
      .order("created_at", { ascending: false });

    if (error || !data) return readHomework();

    const mapped: Homework[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.body && (d.body.startsWith("{") || d.body.startsWith("["))) {
          meta = JSON.parse(d.body);
        }
      } catch {}

      return {
        id: d.id,
        title: d.title || meta.title || "Homework Assignment",
        className: meta.className || "Nursery",
        subject: meta.subject || "General",
        due: meta.due || (d.published_at ? d.published_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      };
    });

    writeHomework(mapped);
    return mapped;
  } catch {
    return readHomework();
  }
}

export function createHomework(input: {
  title: string;
  className: string;
  subject: string;
  due: string;
  details?: string;
}): Homework {
  const newId = `HW-${Date.now().toString().slice(-4)}`;
  const newHW: Homework = {
    id: newId,
    title: input.title,
    className: input.className,
    subject: input.subject,
    due: input.due,
  };

  const list = readHomework();
  const nextList = [newHW, ...list];
  writeHomework(nextList);
  notifyAutoRefresh("homework");

  try {
    NotificationService.homeworkAssigned(input.subject, input.className);
  } catch {}

  const meta = {
    title: input.title,
    className: input.className,
    subject: input.subject,
    due: input.due,
    details: input.details || input.title,
  };

  Promise.resolve(
    supabase.from("gv_communications").insert([{
      id: newId,
      message_type: "homework",
      title: input.title,
      body: JSON.stringify(meta),
      sender_id: "USR-TEACHER",
      sender_name: "Teacher",
      sender_role: "teacher",
      recipient_role: "parent",
      published_at: input.due ? new Date(input.due).toISOString() : new Date().toISOString(),
    }])
  ).catch(() => {});

  return newHW;
}

import { notifyAutoRefresh, useAutoRefresh } from "./autoRefreshContext";

export function deleteHomework(id: string | number) {
  const list = readHomework().filter((h) => String(h.id) !== String(id));
  writeHomework(list);
  notifyAutoRefresh("homework");
  Promise.resolve(supabase.from("gv_communications").delete().eq("id", String(id))).catch(() => {});
}

export function useHomework() {
  const [homework, setHomework] = useState<Homework[]>(readHomework);

  const loadData = () => {
    fetchHomeworkFromSupabase().then((res) => {
      if (res) setHomework(res);
    });
  };

  useAutoRefresh("homework", loadData);

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_communications",
      onPayload: () => {
        loadData();
      },
    });

    const sync = () => setHomework(readHomework());
    window.addEventListener("sunshine-homework", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("sunshine-homework", sync);
    };
  }, []);

  return { homework, createHomework, deleteHomework };
}
