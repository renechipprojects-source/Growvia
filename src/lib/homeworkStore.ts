import { useState, useEffect } from "react";
import { HOMEWORK as SEED_HOMEWORK } from "@/lib/mockData";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export interface Homework {
  id: string | number;
  title: string;
  className: string;
  subject: string;
  due: string;
}

const KEY = "sunshine.homework.v2";

function readHomework(): Homework[] {
  if (typeof window === "undefined") return SEED_HOMEWORK;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_HOMEWORK;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_HOMEWORK;
  } catch {
    return SEED_HOMEWORK;
  }
}

function writeHomework(items: Homework[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("sunshine-homework"));
  } catch {}
}

export function createHomework(input: {
  title: string;
  className: string;
  subject: string;
  due: string;
  details?: string;
}): Homework {
  const newHW: Homework = {
    id: `HW-${Date.now().toString().slice(-4)}`,
    title: input.title,
    className: input.className,
    subject: input.subject,
    due: input.due || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  };

  const current = readHomework();
  const next = [newHW, ...current];
  writeHomework(next);

  // Broadcast notification
  NotificationService.homeworkAssigned(newHW.title, `${newHW.subject} (${newHW.className})`);

  // Sync to Supabase in background
  Promise.resolve(
    supabase.from("homework").insert([{
      id: newHW.id,
      title: newHW.title,
      class_name: newHW.className,
      subject: newHW.subject,
      due_date: newHW.due,
      details: input.details,
      created_at: new Date().toISOString(),
    }])
  ).catch(() => {});

  return newHW;
}

export function deleteHomework(id: string | number) {
  const current = readHomework();
  const next = current.filter((h) => h.id !== id);
  writeHomework(next);
  Promise.resolve(supabase.from("homework").delete().eq("id", id)).catch(() => {});
}

export function useLiveHomework() {
  const [homeworkList, setHomeworkList] = useState<Homework[]>(readHomework);

  useEffect(() => {
    const handleUpdate = () => setHomeworkList(readHomework());
    window.addEventListener("sunshine-homework", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sunshine-homework", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return {
    homeworkList,
    addHomework: createHomework,
    removeHomework: deleteHomework,
  };
}
