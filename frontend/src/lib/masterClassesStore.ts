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
import { notifyAutoRefresh, fetchStudents, fetchTeachers } from "@/lib/supabaseService";

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

        const name = meta.name || (d.leave_type_or_interested_class ? d.leave_type_or_interested_class.split(" ")[0] : "Nursery");
        const section = meta.section || (d.leave_type_or_interested_class ? d.leave_type_or_interested_class.split(" ")[1] : "A");

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

  const stored = getStoredMasterClasses();
  if (stored && stored.length > 0) return stored;

  try {
    const [{ data: students }, { data: teachers }] = await Promise.all([
      fetchStudents(),
      fetchTeachers(),
    ]);

    const classMap = new Map<string, MasterClassItem>();

    (teachers || []).forEach((t) => {
      if (t.className) {
        const parts = t.className.trim().split(" ");
        const name = parts[0] || t.className;
        const section = parts[1] || (t as any).section || "A";
        const key = `${name}-${section}`.toLowerCase();
        if (!classMap.has(key)) {
          classMap.set(key, {
            id: `CLS-${name}-${section}`,
            name,
            section,
            fullName: `${name} - Section ${section}`,
            classTeacher: t.name || "Unassigned",
            teacherId: t.id || "",
            room: "Room 101",
            capacity: 30,
          });
        }
      }
    });

    (students || []).forEach((s) => {
      if (s.className) {
        const name = s.className;
        const section = s.section || "A";
        const key = `${name}-${section}`.toLowerCase();
        if (!classMap.has(key)) {
          classMap.set(key, {
            id: `CLS-${name}-${section}`,
            name,
            section,
            fullName: `${name} - Section ${section}`,
            classTeacher: "Unassigned",
            room: "Room 101",
            capacity: 30,
          });
        }
      }
    });

    const derived = Array.from(classMap.values());
    if (derived.length > 0) {
      memoryCache = derived;
      return derived;
    }
  } catch {}

  return [];
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
    leave_type_or_interested_class: `${c.name} ${c.section}`.trim(),
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
