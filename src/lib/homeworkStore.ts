import { useState, useEffect } from "react";
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
    due: input.due,
  };

  const list = readHomework();
  writeHomework([newHW, ...list]);

  try {
    NotificationService.homeworkAssigned(input.subject, input.className);
  } catch {}

  try {
    supabase.from("homework").insert([{
      id: newHW.id,
      title: input.title,
      class_name: input.className,
      subject: input.subject,
      due_date: input.due,
      created_at: new Date().toISOString(),
    }]);
  } catch {}

  return newHW;
}

export function useHomework() {
  const [homework, setHomework] = useState<Homework[]>(readHomework);

  useEffect(() => {
    const sync = () => setHomework(readHomework());
    window.addEventListener("sunshine-homework", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sunshine-homework", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { homework, createHomework };
}
