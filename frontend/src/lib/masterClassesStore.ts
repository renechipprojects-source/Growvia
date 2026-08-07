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

export const INITIAL_CLASSES: MasterClassItem[] = [
  { id: "CLS-PG-A", name: "Playgroup", section: "A", fullName: "Playgroup - Section A", classTeacher: "Sumi Sharma", room: "Room 101", capacity: 25 },
  { id: "CLS-PG-B", name: "Playgroup", section: "B", fullName: "Playgroup - Section B", classTeacher: "Ananya Sen", room: "Room 102", capacity: 25 },
  { id: "CLS-NUR-A", name: "Nursery", section: "A", fullName: "Nursery - Section A", classTeacher: "Priya Nair", room: "Room 103", capacity: 30 },
  { id: "CLS-NUR-B", name: "Nursery", section: "B", fullName: "Nursery - Section B", classTeacher: "Meera Gupta", room: "Room 104", capacity: 30 },
  { id: "CLS-LKG-A", name: "LKG", section: "A", fullName: "LKG - Section A", classTeacher: "Kavita Rao", room: "Room 105", capacity: 30 },
  { id: "CLS-LKG-B", name: "LKG", section: "B", fullName: "LKG - Section B", classTeacher: "Sunita Verma", room: "Room 106", capacity: 30 },
  { id: "CLS-UKG-A", name: "UKG", section: "A", fullName: "UKG - Section A", classTeacher: "Pooja Patel", room: "Room 107", capacity: 30 },
  { id: "CLS-UKG-B", name: "UKG", section: "B", fullName: "UKG - Section B", classTeacher: "Rekha Joshi", room: "Room 108", capacity: 30 },
  { id: "CLS-G1-A", name: "Grade 1", section: "A", fullName: "Grade 1 - Section A", classTeacher: "Deepa Singh", room: "Room 201", capacity: 35 },
  { id: "CLS-G1-B", name: "Grade 1", section: "B", fullName: "Grade 1 - Section B", classTeacher: "Ritu Kapoor", room: "Room 202", capacity: 35 },
  { id: "CLS-G2-A", name: "Grade 2", section: "A", fullName: "Grade 2 - Section A", classTeacher: "Aarti Saxena", room: "Room 203", capacity: 35 },
  { id: "CLS-G2-B", name: "Grade 2", section: "B", fullName: "Grade 2 - Section B", classTeacher: "Shalini Menon", room: "Room 204", capacity: 35 },
];

const STORAGE_KEY = "sunshine.master_classes.v2";
const EVENT_NAME = "sunshine_classes_updated";

let memoryCache: MasterClassItem[] | null = null;

export function getStoredMasterClasses(): MasterClassItem[] {
  if (memoryCache && memoryCache.length > 0) return memoryCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  memoryCache = INITIAL_CLASSES;
  return INITIAL_CLASSES;
}

export function saveStoredMasterClasses(list: MasterClassItem[]) {
  memoryCache = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {}
  }
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
}

export function subscribeMasterClasses(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }
  return () => {};
}
