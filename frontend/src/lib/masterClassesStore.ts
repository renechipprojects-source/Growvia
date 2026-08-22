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

const STORAGE_KEY = "sunshine.master_classes.v4";
const INITIALIZED_KEY = "sunshine.master_classes.initialized.v4";
const DELETED_KEY = "sunshine.master_classes.deleted.v4";
const EVENT_NAME = "sunshine_classes_updated";

let memoryCache: MasterClassItem[] | null = null;
let deletedIdsCache: Set<string> = new Set();

const DEFAULT_INITIAL_CLASSES: MasterClassItem[] = [
  { id: "CLS-Playgroup-A", name: "Playgroup", section: "A", fullName: "Playgroup - Section A", classTeacher: "Unassigned", room: "Room 101", capacity: 25 },
  { id: "CLS-Nursery-A", name: "Nursery", section: "A", fullName: "Nursery - Section A", classTeacher: "Ananya Sen", room: "Room 102", capacity: 30 },
  { id: "CLS-LKG-A", name: "LKG", section: "A", fullName: "LKG - Section A", classTeacher: "Vikram Malhotra", room: "Room 103", capacity: 30 },
  { id: "CLS-UKG-A", name: "UKG", section: "A", fullName: "UKG - Section A", classTeacher: "Pooja Sharma", room: "Room 104", capacity: 30 },
  { id: "CLS-Grade1-A", name: "Grade 1", section: "A", fullName: "Grade 1 - Section A", classTeacher: "Rahul Verma", room: "Room 105", capacity: 35 },
  { id: "CLS-Grade2-A", name: "Grade 2", section: "A", fullName: "Grade 2 - Section A", classTeacher: "Sneha Patel", room: "Room 106", capacity: 35 },
];

export function getStoredDeletedIds(): Set<string> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(DELETED_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
  }
  return deletedIdsCache;
}

export function getStoredMasterClasses(): MasterClassItem[] {
  const deleted = getStoredDeletedIds();
  if (memoryCache) {
    return memoryCache.filter((c) => !deleted.has(c.id));
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((c) => !deleted.has(c.id));
          memoryCache = filtered;
          return filtered;
        }
      }
    } catch {}
  }
  memoryCache = DEFAULT_INITIAL_CLASSES.filter((c) => !deleted.has(c.id));
  return memoryCache;
}

export async function fetchMasterClassesFromSupabase(): Promise<MasterClassItem[]> {
  try {
    const [{ data: classData }, { data: delMarker }] = await Promise.all([
      supabase.from("gv_requests").select("*").eq("request_type", "class"),
      supabase.from("gv_requests").select("*").eq("id", "SYSTEM_DELETED_CLASSES").maybeSingle(),
    ]);

    let remoteDeleted = new Set<string>();
    if (delMarker && delMarker.reason_or_notes) {
      try {
        const parsed = JSON.parse(delMarker.reason_or_notes);
        if (Array.isArray(parsed)) remoteDeleted = new Set(parsed);
      } catch {}
    }

    const localDeleted = getStoredDeletedIds();
    const mergedDeleted = new Set([...Array.from(remoteDeleted), ...Array.from(localDeleted)]);
    deletedIdsCache = mergedDeleted;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(mergedDeleted)));
      } catch {}
    }

    if (classData && classData.length > 0) {
      const activeRows = classData.filter((d: any) => d.id !== "SYSTEM_DELETED_CLASSES" && !mergedDeleted.has(d.id));
      const mapped: MasterClassItem[] = activeRows.map((d: any) => {
        let meta: any = {};
        try {
          if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
            meta = JSON.parse(d.reason_or_notes);
          }
        } catch {}

        let name = meta.name;
        let section = meta.section;
        if (!name && d.leave_type_or_interested_class) {
          const raw = d.leave_type_or_interested_class.trim();
          const lastSpace = raw.lastIndexOf(" ");
          if (lastSpace > 0) {
            name = raw.slice(0, lastSpace).trim();
            section = raw.slice(lastSpace + 1).trim();
          } else {
            name = raw;
            section = "A";
          }
        }
        if (!name) name = "Nursery";
        if (!section) section = "A";

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
          localStorage.setItem(INITIALIZED_KEY, "true");
        } catch {}
      }
      return mapped;
    }

    const isInitialized = typeof window !== "undefined" && localStorage.getItem(INITIALIZED_KEY) === "true";
    if (isInitialized || delMarker) {
      memoryCache = [];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        } catch {}
      }
      return [];
    } else {
      const activeDefaults = DEFAULT_INITIAL_CLASSES.filter((c) => !mergedDeleted.has(c.id));
      saveStoredMasterClasses(activeDefaults);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(INITIALIZED_KEY, "true");
        } catch {}
      }
      return activeDefaults;
    }
  } catch (err) {
    console.warn("Error fetching master classes from Supabase:", err);
  }

  return getStoredMasterClasses();
}

export async function saveStoredMasterClasses(list: MasterClassItem[]): Promise<void> {
  const deleted = getStoredDeletedIds();
  const cleanList = list.filter((c) => !deleted.has(c.id));
  memoryCache = cleanList;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
      localStorage.setItem(INITIALIZED_KEY, "true");
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {}
  }

  notifyAutoRefresh("classes");

  const payloads = cleanList.map((c) => ({
    id: c.id,
    request_type: "class",
    leave_type_or_interested_class: `${c.name} ${c.section}`.trim(),
    applicant_or_child_name: c.classTeacher,
    status: "active",
    reason_or_notes: JSON.stringify(c),
  }));

  if (payloads.length > 0) {
    try {
      await supabase.from("gv_requests").upsert(payloads, { onConflict: "id" });
    } catch (err) {
      console.warn("Failed to persist master classes to Supabase:", err);
    }
  }
}

export async function addMasterClass(item: Omit<MasterClassItem, "id" | "fullName"> & { id?: string }): Promise<MasterClassItem> {
  const current = getStoredMasterClasses();
  const name = item.name.trim();
  const section = (item.section || "A").trim();
  const cleanSlug = `${name.replace(/[^a-zA-Z0-9]/g, "")}-${section.replace(/[^a-zA-Z0-9]/g, "")}`;
  const id = item.id || `CLS-${cleanSlug}`;

  // Remove from deleted tracking if re-added
  deletedIdsCache.delete(id);
  const localDeleted = getStoredDeletedIds();
  localDeleted.delete(id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(localDeleted)));
    } catch {}
  }

  const newItem: MasterClassItem = {
    id,
    name,
    section,
    fullName: `${name} - Section ${section}`,
    classTeacher: item.classTeacher || "Unassigned",
    teacherId: item.teacherId || "",
    room: item.room || "Room 101",
    capacity: Number(item.capacity || 30),
  };
  const updated = [...current.filter((c) => c.id !== id), newItem];
  await saveStoredMasterClasses(updated);

  // Sync relational Class Assignment
  if (newItem.classTeacher && newItem.classTeacher !== "Unassigned") {
    await syncClassAssignmentForMasterClass(newItem);
  }

  return newItem;
}

export async function updateMasterClass(id: string, updates: Partial<MasterClassItem>): Promise<MasterClassItem | null> {
  const current = getStoredMasterClasses();
  let updatedItem: MasterClassItem | null = null;
  const next = current.map((c) => {
    if (c.id === id) {
      const name = updates.name ? updates.name.trim() : c.name;
      const section = updates.section ? updates.section.trim() : c.section;
      updatedItem = {
        ...c,
        ...updates,
        name,
        section,
        fullName: `${name} - Section ${section}`,
        capacity: updates.capacity !== undefined ? Number(updates.capacity) : c.capacity,
      };
      return updatedItem;
    }
    return c;
  });
  await saveStoredMasterClasses(next);

  if (updatedItem && updates.classTeacher !== undefined) {
    await syncClassAssignmentForMasterClass(updatedItem);
  }

  return updatedItem;
}

export async function deleteMasterClass(id: string): Promise<void> {
  const current = getStoredMasterClasses();
  const target = current.find((c) => c.id === id);
  const next = current.filter((c) => c.id !== id);

  memoryCache = next;
  deletedIdsCache.add(id);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deletedIdsCache)));
      localStorage.setItem(INITIALIZED_KEY, "true");
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {}
  }

  notifyAutoRefresh("classes");

  try {
    // 1. Delete class record from gv_requests
    await supabase.from("gv_requests").delete().eq("id", id);

    // 2. Persist deleted class ID marker in database
    const delArray = Array.from(deletedIdsCache);
    await supabase.from("gv_requests").upsert([
      {
        id: "SYSTEM_DELETED_CLASSES",
        request_type: "system_meta",
        applicant_or_child_name: "SYSTEM_DELETED_CLASSES",
        reason_or_notes: JSON.stringify(delArray),
      },
    ], { onConflict: "id" });

    // 3. Cascading cleanup of class assignments
    if (target) {
      const classStr = `${target.name} ${target.section}`.trim();
      const { data: assignments } = await supabase
        .from("gv_requests")
        .select("id")
        .eq("request_type", "class_assignment")
        .eq("leave_type_or_interested_class", classStr);

      if (assignments && assignments.length > 0) {
        for (const a of assignments) {
          await supabase.from("gv_requests").delete().eq("id", a.id);
        }
      }

      // Clear teacher profile class_name in gv_users
      if (target.classTeacher && target.classTeacher !== "Unassigned") {
        await supabase
          .from("gv_users")
          .update({ class_name: null, section: null })
          .or(`full_name.eq.${target.classTeacher},login_id.eq.${target.teacherId || target.classTeacher}`);
      }
    }
  } catch (err) {
    console.warn("Failed to complete cascading deletion for master class from Supabase:", err);
  }
}

async function syncClassAssignmentForMasterClass(c: MasterClassItem) {
  try {
    const classStr = `${c.name} ${c.section}`.trim();
    const assignmentPayload = {
      id: `CA-${c.id}`,
      request_type: "class_assignment",
      applicant_or_child_name: c.classTeacher,
      leave_type_or_interested_class: classStr,
      status: "active",
      reason_or_notes: JSON.stringify({
        id: `CA-${c.id}`,
        teacherId: c.teacherId || c.classTeacher,
        teacherName: c.classTeacher,
        role: "class",
        className: c.name,
        section: c.section,
        academicYear: "2026-27",
        status: "active",
      }),
    };
    await supabase.from("gv_requests").upsert([assignmentPayload], { onConflict: "id" });

    if (c.classTeacher && c.classTeacher !== "Unassigned") {
      await supabase
        .from("gv_users")
        .update({ class_name: classStr, section: c.section })
        .or(`full_name.eq.${c.classTeacher},login_id.eq.${c.teacherId || c.classTeacher}`);
    }
    notifyAutoRefresh("assignments");
  } catch {}
}

export function subscribeMasterClasses(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }
  return () => {};
}
