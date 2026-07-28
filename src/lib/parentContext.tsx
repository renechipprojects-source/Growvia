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

import { getSession } from "./auth";

export function ParentProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const household = useMemo(() => pickDemoHousehold(), []);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setAllStudents(data as any);
      }
    });
  }, []);

  const kids = useMemo(() => {
    const source = allStudents.length > 0 ? allStudents : STUDENTS;
    if (session?.role === "parent") {
      const matching = source.filter(
        (s) =>
          s.id === session.linkId ||
          s.parentId === session.linkId ||
          (session.name && s.parent && s.parent.toLowerCase() === session.name.toLowerCase()) ||
          (session.loginId && s.phone && session.loginId.includes(s.phone.replace(/\D/g, "")))
      );
      if (matching.length > 0) return matching;
    }
    const fallbackList = household.childrenIds.map((id) => source.find((s) => s.id === id)!).filter(Boolean);
    return fallbackList.length > 0 ? fallbackList : [source[0]];
  }, [allStudents, session, household]);

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

  const active = kids.find((k) => k.id === activeId) ?? kids[0];

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
