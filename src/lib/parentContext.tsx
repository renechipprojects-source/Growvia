// Parent-portal state: which household is signed in, and which child is
// currently being viewed. Supports 1..N children per parent.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PARENT_HOUSEHOLDS, STUDENTS, type Household, type Student } from "./mockData";
import { fetchStudents } from "./supabaseService";

// Pick a demo household that has multiple children if possible, else fallback.
function pickDemoHousehold(): Household {
  const multi = PARENT_HOUSEHOLDS.find((h) => h.childrenIds.length >= 2);
  return multi ?? PARENT_HOUSEHOLDS[0];
}

interface ParentState {
  household: Household;
  children: Student[];
  activeChild: Student;
  setActiveChildId: (id: string) => void;
}

const Ctx = createContext<ParentState | null>(null);

const STORAGE_KEY = "sunshine.parent.activeChildId";

export function ParentProvider({ children }: { children: ReactNode }) {
  const household = useMemo(() => pickDemoHousehold(), []);
  const [kidsList, setKidsList] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setKidsList(data as any);
      }
    });
  }, []);

  const fallbackKids = useMemo(
    () => household.childrenIds.map((id) => STUDENTS.find((s) => s.id === id)!).filter(Boolean),
    [household],
  );

  const kids = kidsList.length > 0 ? kidsList : fallbackKids;

  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && kids.some((k) => k.id === stored)) return stored;
    }
    return kids[0]?.id ?? "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, activeId);
    }
  }, [activeId]);

  const active = kids.find((k) => k.id === activeId) ?? kids[0] ?? fallbackKids[0];

  const value: ParentState = {
    household,
    children: kids,
    activeChild: active,
    setActiveChildId: setActiveId,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParent(): ParentState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useParent must be used inside <ParentProvider>");
  return ctx;
}
