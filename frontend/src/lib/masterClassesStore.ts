export interface MasterClassItem {
  id: string;
  name: string;
  section: string;
  fullName: string;
  classTeacher: string;
  teacherId?: string;
  room: string;
  capacity: number;
}

import { supabase } from "@/lib/supabase";
import { notifyAutoRefresh } from "@/lib/supabaseService";

export const INITIAL_CLASSES: MasterClassItem[] = [];

const STORAGE_KEY = "sunshine.master_classes.v3";
const EVENT_NAME = "sunshine_classes_updated";

let memoryCache: MasterClassItem[] | null = null;

export function getStoredMasterClasses(): MasterClassItem[] {
  if (memoryCache) return memoryCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  memoryCache = [];
  return [];
}

export async function fetchMasterClassesFromSupabase(): Promise<MasterClassItem[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "class");

    if (!error && data && data.length > 0) {
      const mapped: MasterClassItem[] = data.map((d: any) => {
        let meta: any = {};
        try {
          if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
            meta = JSON.parse(d.reason_or_notes);
          }
        } catch {}

        const name = d.class_name || meta.name || "Nursery";
        const section = d.section || meta.section || "A";

        return {
          id: d.id,
          name,
          section,
          fullName: meta.fullName || `${name} - Section ${section}`,
          classTeacher: meta.classTeacher || d.applicant_or_child_name || "Unassigned",
          teacherId: meta.teacherId || "",
          room: meta.room || "Room 101",
          capacity: Number(meta.capacity || 30),
        };
      });

      memoryCache = mapped;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {}
      }
      return mapped;
    }
  } catch {}

  return getStoredMasterClasses();
}

export function saveStoredMasterClasses(list: MasterClassItem[]) {
  memoryCache = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {}
  }

  notifyAutoRefresh("classes");

  const payloads = list.map((c) => ({
    id: c.id,
    request_type: "class",
    class_name: c.name,
    section: c.section,
    applicant_or_child_name: c.classTeacher,
    status: "active",
    reason_or_notes: JSON.stringify(c),
  }));

  Promise.resolve(supabase.from("gv_requests").upsert(payloads, { onConflict: "id" })).catch(() => {});
}

export function addMasterClass(item: Omit<MasterClassItem, "id" | "fullName"> & { id?: string }): MasterClassItem {
  const current = getStoredMasterClasses();
  const name = item.name.trim();
  const section = (item.section || "A").trim().toUpperCase();
  const id = item.id || `CLS-${name.replace(/\s+/g, "")}-${section}`;
  const newItem: MasterClassItem = {
    id,
    name,
    section,
    fullName: `${name} - Section ${section}`,
    classTeacher: item.classTeacher || "Unassigned",
    teacherId: item.teacherId || "",
    room: item.room || "Room 101",
    capacity: item.capacity || 30,
  };
  const updated = [...current.filter((c) => c.id !== id), newItem];
  saveStoredMasterClasses(updated);
  return newItem;
}

export function updateMasterClass(id: string, updates: Partial<MasterClassItem>): MasterClassItem | null {
  const current = getStoredMasterClasses();
  let updatedItem: MasterClassItem | null = null;
  const next = current.map((c) => {
    if (c.id === id) {
      const name = updates.name ? updates.name.trim() : c.name;
      const section = updates.section ? updates.section.trim().toUpperCase() : c.section;
      updatedItem = {
        ...c,
        ...updates,
        name,
        section,
        fullName: `${name} - Section ${section}`,
      };
      return updatedItem;
    }
    return c;
  });
  saveStoredMasterClasses(next);
  return updatedItem;
}

export function deleteMasterClass(id: string) {
  const current = getStoredMasterClasses();
  const next = current.filter((c) => c.id !== id);
  saveStoredMasterClasses(next);
  Promise.resolve(supabase.from("gv_requests").delete().eq("id", id)).catch(() => {});
}

export function subscribeMasterClasses(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }
  return () => {};
}
