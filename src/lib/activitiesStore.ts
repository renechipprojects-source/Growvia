import { useState, useEffect } from "react";
import { ACTIVITIES as SEED_ACTIVITIES } from "@/lib/mockData";
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
  if (typeof window === "undefined") return SEED_ACTIVITIES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_ACTIVITIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_ACTIVITIES;
  } catch {
    return SEED_ACTIVITIES;
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
    cover: input.cover || "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };

  const current = readActivities();
  const next = [newAct, ...current];
  writeActivities(next);

  // Broadcast live notification
  NotificationService.announcement(
    `New Activity: "${newAct.title}" for ${newAct.className}`,
    ["parent", "teacher", "principal", "office", "super-admin"]
  );

  // Sync to Supabase in background
  Promise.resolve(
    supabase.from("activities").insert([{
      id: newAct.id,
      title: newAct.title,
      class_name: newAct.className,
      cover_url: newAct.cover,
      created_at: new Date().toISOString(),
    }])
  ).catch(() => {});

  return newAct;
}

export function deleteActivity(id: string | number) {
  const current = readActivities();
  const next = current.filter((a) => a.id !== id);
  writeActivities(next);
  Promise.resolve(supabase.from("activities").delete().eq("id", id)).catch(() => {});
}

export function useLiveActivities() {
  const [activities, setActivities] = useState<Activity[]>(readActivities);

  useEffect(() => {
    const handleUpdate = () => setActivities(readActivities());
    window.addEventListener("sunshine-activities", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sunshine-activities", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return {
    activities,
    addActivity: createActivity,
    removeActivity: deleteActivity,
  };
}
