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

const KEY = "sunshine.homework.v2";

function readHomework(): Homework[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHomework(items: Homework[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("sunshine-homework"));
  } catch {}
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
        if (d.content && (d.content.startsWith("{") || d.content.startsWith("["))) {
          meta = JSON.parse(d.content);
        }
      } catch {}

      return {
        id: d.id,
        title: d.title || meta.title || "Homework Assignment",
        className: meta.className || d.target_audience || "Nursery",
        subject: meta.subject || "General",
        due: meta.due || d.published_date || new Date().toISOString().slice(0, 10),
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
      content: JSON.stringify(meta),
      target_audience: input.className,
      author: "Class Teacher",
      published_date: input.due,
    }])
  ).catch(() => {});

  return newHW;
}

export function useHomework() {
  const [homework, setHomework] = useState<Homework[]>(readHomework);

  useEffect(() => {
    fetchHomeworkFromSupabase().then((res) => {
      if (res && res.length > 0) setHomework(res);
    });

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_communications",
      onPayload: () => {
        fetchHomeworkFromSupabase().then((res) => {
          if (res) setHomework(res);
        });
      },
    });

    const sync = () => setHomework(readHomework());
    window.addEventListener("sunshine-homework", sync);
    window.addEventListener("storage", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("sunshine-homework", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { homework, createHomework };
}
