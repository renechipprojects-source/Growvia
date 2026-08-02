import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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

let memoryStudentDocsCache: Record<string, StudentDocs> = {};

export async function fetchStudentDocsFromSupabase(): Promise<Record<string, StudentDocs>> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "student_docs");

    if (error || !data) return memoryStudentDocsCache;

    const recs: Record<string, StudentDocs> = {};
    data.forEach((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      const admNo = meta.admissionNo || d.applicant_or_child_name || d.id;
      recs[admNo] = {
        admissionNo: admNo,
        studentName: meta.studentName || d.applicant_or_child_name || "Student",
        documents: meta.documents || [],
        medicalCertificates: meta.medicalCertificates || [],
      };
    });

    memoryStudentDocsCache = recs;
    return recs;
  } catch {
    return memoryStudentDocsCache;
  }
}

export function StudentDocsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, StudentDocs>>(() => memoryStudentDocsCache);

  useEffect(() => {
    fetchStudentDocsFromSupabase().then((res) => {
      if (res) setRecords(res);
    });
  }, []);

  const saveToSupabase = (updatedRecords: Record<string, StudentDocs>, targetAdmNo: string) => {
    memoryStudentDocsCache = updatedRecords;
    const docData = updatedRecords[targetAdmNo];
    if (docData) {
      Promise.resolve(
        supabase.from("gv_requests").upsert([{
          id: `DOC-${targetAdmNo}`,
          request_type: "student_docs",
          applicant_or_child_name: docData.studentName || targetAdmNo,
          status: "Verified",
          reason_or_notes: JSON.stringify(docData),
        }])
      ).catch(() => {});
    }
  };

  const upsert: State["upsert"] = useCallback((admissionNo, studentName, documents) => {
    setRecords((prev) => {
      const next = {
        ...prev,
        [admissionNo]: {
          admissionNo,
          studentName,
          documents,
          medicalCertificates: prev[admissionNo]?.medicalCertificates ?? [],
        },
      };
      saveToSupabase(next, admissionNo);
      return next;
    });
  }, []);

  const addMedicalCertificate: State["addMedicalCertificate"] = useCallback((admissionNo, cert) => {
    setRecords((prev) => {
      const existing = prev[admissionNo] ?? { admissionNo, documents: [], medicalCertificates: [] };
      const next = {
        ...prev,
        [admissionNo]: {
          ...existing,
          medicalCertificates: [
            { name: cert.name, uploadedOn: new Date().toISOString(), leaveId: cert.leaveId },
            ...existing.medicalCertificates,
          ],
        },
      };
      saveToSupabase(next, admissionNo);
      return next;
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
