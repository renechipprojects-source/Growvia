import { useState, useEffect } from "react";
import { NotificationService } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export interface Activity {
  id: string | number;
  title: string;
  className: string;
  cover: string;
  date: string;
}

const KEY = "sunshine.activities.v2";

function readActivities(): Activity[] {
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

function writeActivities(acts: Activity[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(acts));
    window.dispatchEvent(new CustomEvent("sunshine-activities"));
  } catch {}
}

export function createActivity(input: {
  title: string;
  className: string;
  cover?: string;
}): Activity {
  const newAct: Activity = {
    id: `ACT-${Date.now().toString().slice(-4)}`,
    title: input.title,
    className: input.className,
    cover: input.cover || "/placeholder.svg",
    date: new Date().toLocaleDateString(),
  };

  const list = readActivities();
  writeActivities([newAct, ...list]);



  try {
    supabase.from("events").insert([{
      title: input.title,
      type: "Activity",
      date: new Date().toISOString().split("T")[0],
    }]);
  } catch {}

  return newAct;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>(readActivities);

  useEffect(() => {
    const sync = () => setActivities(readActivities());
    window.addEventListener("sunshine-activities", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sunshine-activities", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { activities, createActivity };
}
