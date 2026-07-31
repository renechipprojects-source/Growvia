// Parent-portal state: which household is signed in, and which child is
// currently being viewed. Supports 1..N children per parent.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Household, Student } from "./mockData";
import { fetchStudents } from "./supabaseService";
import { getSession } from "./auth";

const emptyHousehold: Household = {
  id: "HH-000",
  fatherName: "Parent",
  motherName: "Parent",
  primaryContact: "Parent",
  phone: "N/A",
  email: "N/A",
  address: "N/A",
  childrenIds: [],
};

const emptyStudent: Student = {
  id: "STU-NONE",
  rollNo: 0,
  admissionNo: "N/A",
  name: "No Enrolled Child Found",
  age: 0,
  dob: "N/A",
  className: "Nursery",
  section: "A",
  parent: "N/A",
  parentId: "N/A",
  phone: "N/A",
  gender: "Boy",
  house: "Red",
  admissionDate: "N/A",
  feeStatus: "Paid",
  avatar: "/avatars/student.svg",
  attendance: 0,
  branch: "Main",
};

interface ParentState {
  household: Household;
  children: Student[];
  activeChild: Student;
  setActiveChildId: (id: string) => void;
}

const Ctx = createContext<ParentState | null>(null);

const STORAGE_KEY = "sunshine.parent.activeChildId";

export function ParentProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      setAllStudents((data as any) || []);
    });
  }, []);

  const kids = useMemo(() => {
    if (session?.role === "parent") {
      const matching = allStudents.filter(
        (s) =>
          s.id === session.linkId ||
          s.parentId === session.linkId ||
          (session.name && s.parent && s.parent.toLowerCase() === session.name.toLowerCase()) ||
          (session.loginId && s.phone && session.loginId.includes(s.phone.replace(/\D/g, "")))
      );
      if (matching.length > 0) return matching;
    }
    return allStudents.length > 0 ? allStudents : [emptyStudent];
  }, [allStudents, session]);

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

  const active = kids.find((k) => k.id === activeId) ?? kids[0] ?? emptyStudent;

  const value: ParentState = {
    household: emptyHousehold,
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
