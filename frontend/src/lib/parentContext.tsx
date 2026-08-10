// Parent-portal state: which household is signed in, and which child is
// currently being viewed. Supports 1..N children per parent.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Household, Student } from "./mockData";
import { fetchStudents } from "./supabaseService";
import { getSession } from "./auth";
import { useAutoRefresh } from "./autoRefreshContext";

const emptyHousehold: Household = {
  id: "HH-NONE",
  fatherName: "Not Provided",
  motherName: "Not Provided",
  primaryContact: "Parent",
  phone: "N/A",
  email: "N/A",
  address: "N/A",
  childrenIds: [],
};

const noLinkedStudent: Student = {
  id: "NO-STUDENT",
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
  hasLinkedChildren: boolean;
}

const Ctx = createContext<ParentState | null>(null);

const STORAGE_KEY = "sunshine.parent.activeChildId.v2";

export function ParentProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const loadData = () => {
    fetchStudents().then(({ data }) => {
      setAllStudents((data as any) || []);
    });
  };

  useAutoRefresh("students", loadData);
  useAutoRefresh("parents", loadData);

  useEffect(() => {
    loadData();
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
      return matching;
    }
    return allStudents;
  }, [allStudents, session]);

  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && kids.some((k) => k.id === stored)) return stored;
    }
    return kids[0]?.id ?? "";
  });

  useEffect(() => {
    if (kids.length > 0 && (!activeId || !kids.some((k) => k.id === activeId))) {
      setActiveId(kids[0].id);
    }
  }, [kids, activeId]);

  useEffect(() => {
    if (typeof window !== "undefined" && activeId) {
      window.localStorage.setItem(STORAGE_KEY, activeId);
    }
  }, [activeId]);

  const active = useMemo(
    () => kids.find((k) => k.id === activeId) ?? kids[0] ?? noLinkedStudent,
    [kids, activeId]
  );

  const household = useMemo<Household>(() => {
    if (!active || active.id === "NO-STUDENT") return emptyHousehold;
    return {
      id: `HH-${active.parentId || active.id}`,
      fatherName: active.parent || "Parent",
      motherName: active.parent || "Parent",
      primaryContact: active.parent || "Parent",
      phone: active.phone || "N/A",
      email: `${(active.parent || "parent").toLowerCase().replace(/\s+/g, ".")}@sunshine.edu`,
      address: "Main Branch",
      childrenIds: kids.map((k) => k.id),
    };
  }, [active, kids]);

  const value = useMemo<ParentState>(
    () => ({
      household,
      children: kids,
      activeChild: active,
      setActiveChildId: setActiveId,
      hasLinkedChildren: kids.length > 0,
    }),
    [household, kids, active]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParent(): ParentState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useParent must be used inside <ParentProvider>");
  return ctx;
}
