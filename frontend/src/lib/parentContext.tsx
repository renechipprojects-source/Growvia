// Parent-portal state: which household is signed in, and which child is
// currently being viewed. Supports 1..N children per parent.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Household, Student } from "./mockData";
import { fetchStudents } from "./supabaseService";
import { getSession, getUserScopedStorageKey } from "./auth";

const BASE_STORAGE_KEY = "sunshine.parent.active_child";
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

export function getLiveParentChildren(session: any, allStudents: Student[] = []): Student[] {
  if (!session || !allStudents.length) return [];
  const role = (session.role || "").toLowerCase();

  if (role !== "parent" && role !== "student") {
    return allStudents;
  }

  const loginId = (session.loginId || "").toLowerCase().trim();
  const linkId = (session.linkId || "").toLowerCase().trim();
  const sessionName = (session.name || "").toLowerCase().trim();
  const sessionEmail = (session.email || "").toLowerCase().trim();
  const cleanLoginDigits = loginId.replace(/\D/g, "");
  const cleanLinkDigits = linkId.replace(/\D/g, "");

  const matching = allStudents.filter((s) => {
    const sId = (s.id || "").toLowerCase().trim();
    const sParentId = (s.parentId || "").toLowerCase().trim();
    const sAdmissionNo = (s.admissionNo || "").toLowerCase().trim();
    const sParentName = (s.parent || "").toLowerCase().trim();
    const sPhone = (s.phone || "").replace(/\D/g, "");
    const sEmail = (s.email || (typeof s.parent === "object" ? (s.parent as any)?.email : "") || "").toLowerCase().trim();

    // 1. Check parent_id (REAL database relationship field from gv_users)
    if (sParentId) {
      if (sParentId === loginId || sParentId === linkId) return true;
      const sParentIdClean = sParentId.replace(/^par-?/i, "");
      const loginIdClean = loginId.replace(/^par-?/i, "");
      const linkIdClean = linkId.replace(/^par-?/i, "");
      if (sParentIdClean && (sParentIdClean === loginIdClean || sParentIdClean === linkIdClean)) return true;
    }

    // 2. Student ID or Admission No match
    if (sId && (sId === loginId || sId === linkId)) return true;
    if (sAdmissionNo && (sAdmissionNo === loginId || sAdmissionNo === linkId)) return true;

    // 3. Email match
    if (sessionEmail && sEmail && sEmail === sessionEmail) return true;

    // 4. Parent Name match (gv_users.parent_name)
    if (sessionName && sParentName && (sParentName === sessionName || sessionName.includes(sParentName) || sParentName.includes(sessionName))) return true;

    // 5. Mobile / Phone match
    if (sPhone && sPhone.length >= 10) {
      const clean10 = sPhone.slice(-10);
      if ((cleanLoginDigits && cleanLoginDigits.includes(clean10)) || (cleanLinkDigits && cleanLinkDigits.includes(clean10))) return true;
    }

    return false;
  });

  if (matching.length > 0) return matching;

  if (role === "student") {
    const singleStu = allStudents.filter(
      (s) => (s.id || "").toLowerCase() === loginId || (s.admissionNo || "").toLowerCase() === loginId
    );
    if (singleStu.length > 0) return singleStu;
  }

  // Safe fallback if parent user has no explicitly linked student records in DB yet
  return allStudents.length > 0 ? [allStudents[0]] : [];
}

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
    return getLiveParentChildren(session, allStudents);
  }, [allStudents, session]);

  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(getUserScopedStorageKey(BASE_STORAGE_KEY));
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
      window.localStorage.setItem(getUserScopedStorageKey(BASE_STORAGE_KEY), activeId);
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
