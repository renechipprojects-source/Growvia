import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DocStatus = "Submitted" | "Pending";

export const DEFAULT_DOCS = [
  "Birth Certificate",
  "Parent Aadhaar",
  "Passport Photo",
  "Vaccination Record",
  "Transfer Certificate",
] as const;

export interface DocEntry {
  name: string;
  status: DocStatus;
  submittedOn?: string;
}

export interface StudentDocs {
  admissionNo: string;
  studentName?: string;
  documents: DocEntry[];
  medicalCertificates: { name: string; uploadedOn: string; leaveId?: string }[];
}

interface State {
  records: Record<string, StudentDocs>;
  upsert: (admissionNo: string, studentName: string, documents: DocEntry[]) => void;
  addMedicalCertificate: (admissionNo: string, cert: { name: string; leaveId?: string }) => void;
  get: (admissionNo: string) => StudentDocs | undefined;
}

const Ctx = createContext<State | null>(null);
const KEY = "sunshine.studentDocs.v1";

function load(): Record<string, StudentDocs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Record<string, StudentDocs>;
  } catch { /* noop */ }
  return {};
}

export function StudentDocsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, StudentDocs>>(() => load());

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(records));
  }, [records]);

  const upsert: State["upsert"] = useCallback((admissionNo, studentName, documents) => {
    setRecords((prev) => ({
      ...prev,
      [admissionNo]: {
        admissionNo,
        studentName,
        documents,
        medicalCertificates: prev[admissionNo]?.medicalCertificates ?? [],
      },
    }));
  }, []);

  const addMedicalCertificate: State["addMedicalCertificate"] = useCallback((admissionNo, cert) => {
    setRecords((prev) => {
      const existing = prev[admissionNo] ?? { admissionNo, documents: [], medicalCertificates: [] };
      return {
        ...prev,
        [admissionNo]: {
          ...existing,
          medicalCertificates: [
            { name: cert.name, uploadedOn: new Date().toISOString(), leaveId: cert.leaveId },
            ...existing.medicalCertificates,
          ],
        },
      };
    });
  }, []);

  const get = useCallback((admissionNo: string) => records[admissionNo], [records]);

  const value = useMemo(() => ({ records, upsert, addMedicalCertificate, get }), [records, upsert, addMedicalCertificate, get]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudentDocs(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudentDocs must be used inside <StudentDocsProvider>");
  return ctx;
}

export function makeInitialDocs(): DocEntry[] {
  return DEFAULT_DOCS.map((name) => ({ name, status: "Pending" }));
}
