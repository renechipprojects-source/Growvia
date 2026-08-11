import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

export interface Activity {
  id: string | number;
  title: string;
  className: string;
  cover: string;
  date: string;
}

let memoryActivitiesCache: Activity[] = [];

function readActivities(): Activity[] {
  return memoryActivitiesCache;
}

function writeActivities(acts: Activity[]) {
  memoryActivitiesCache = acts;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sunshine-activities"));
  }
}

export async function fetchActivitiesFromSupabase(): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "activity")
      .order("created_at", { ascending: false });

    if (error || !data) return readActivities();

    const mapped: Activity[] = data.map((d: any) => {
      let meta: any = {};
      try {
        const rawContent = d.body || d.content;
        if (rawContent && (rawContent.startsWith("{") || rawContent.startsWith("["))) {
          meta = JSON.parse(rawContent);
        }
      } catch { }

      return {
        id: d.id,
        title: d.title || meta.title || "Class Activity",
        className: meta.className || d.recipient_role || d.target_audience || "Nursery",
        cover: meta.cover || "/placeholder.svg",
        date: d.published_at?.slice(0, 10) || d.published_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      };
    });

    writeActivities(mapped);
    return mapped;
  } catch {
    return readActivities();
  }
}

export function createActivity(input: {
  title: string;
  className: string;
  cover?: string;
}): Activity {
  const newId = `ACT-${Date.now().toString().slice(-4)}`;
  const newAct: Activity = {
    id: newId,
    title: input.title,
    className: input.className,
    cover: input.cover || "/placeholder.svg",
    date: new Date().toLocaleDateString(),
  };

  const list = readActivities();
  const nextList = [newAct, ...list];
  writeActivities(nextList);

  const meta = {
    title: input.title,
    className: input.className,
    cover: input.cover || "/placeholder.svg",
  };

  Promise.resolve(
    supabase.from("gv_communications").insert([{
      id: newId,
      message_type: "activity",
      title: input.title,
      body: JSON.stringify(meta),
      sender_id: "TCH100",
      sender_name: "Class Teacher",
      sender_role: "teacher",
      recipient_role: "all",
      published_at: new Date().toISOString(),
    }])
  ).catch(() => { });

  return newAct;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>(readActivities);

  useEffect(() => {
    fetchActivitiesFromSupabase().then((res) => {
      if (res) setActivities(res);
    });

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_communications",
      onPayload: () => {
        fetchActivitiesFromSupabase().then((res) => {
          if (res) setActivities(res);
        });
      },
    });

    const sync = () => setActivities(readActivities());
    window.addEventListener("sunshine-activities", sync);

    return () => {
      unsubscribe();
      window.removeEventListener("sunshine-activities", sync);
    };
  }, []);

  return { activities, createActivity };
}
