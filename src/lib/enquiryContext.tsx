import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ENQUIRIES, type Enquiry } from "@/lib/mockData";
import { fetchEnquiries } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";

interface Ctx {
  enquiries: Enquiry[];
  convertedIds: Set<string>;
  updateStatus: (id: string, status: Enquiry["status"]) => void;
  markConverted: (id: string) => void;
  isConverted: (id: string) => boolean;
  getEnquiry: (id: string) => Enquiry | undefined;
  convertibleEnquiries: () => Enquiry[];
}

const EnquiryCtx = createContext<Ctx | null>(null);

// Statuses that indicate the parent has confirmed and the office may convert.
const CONVERTIBLE_STATUSES: Enquiry["status"][] = [
  "Visit Completed",
  "Documents Pending",
  "Admission Approved",
];

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEnquiries().then((res) => {
      if (res.isFromSupabase) {
        setEnquiries(res.data);
      }
    }).catch(() => {});
  }, []);

  const updateStatus = useCallback((id: string, status: Enquiry["status"]) => {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    Promise.resolve(supabase.from("enquiries").update({ status }).eq("id", id)).catch(() => {});
  }, []);

  const markConverted = useCallback((id: string) => {
    setConvertedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "Enrolled" } : e)));
    Promise.resolve(supabase.from("enquiries").update({ status: "Enrolled" }).eq("id", id)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      enquiries,
      convertedIds,
      updateStatus,
      markConverted,
      isConverted: (id) => convertedIds.has(id),
      getEnquiry: (id) => enquiries.find((e) => e.id === id),
      convertibleEnquiries: () =>
        enquiries.filter(
          (e) => !convertedIds.has(e.id) && CONVERTIBLE_STATUSES.includes(e.status),
        ),
    }),
    [enquiries, convertedIds, updateStatus, markConverted],
  );

  return <EnquiryCtx.Provider value={value}>{children}</EnquiryCtx.Provider>;
}

export function useEnquiries() {
  const ctx = useContext(EnquiryCtx);
  if (!ctx) throw new Error("useEnquiries must be used within EnquiryProvider");
  return ctx;
}

export function useOptionalEnquiries() {
  return useContext(EnquiryCtx);
}
