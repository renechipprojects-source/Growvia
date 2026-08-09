import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Enquiry } from "@/lib/mockData";
import { fetchEnquiries, getStoredEnquiries, saveStoredEnquiries } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { supabase } from "@/lib/supabase";

interface Ctx {
  enquiries: Enquiry[];
  convertedIds: Set<string>;
  addEnquiry: (e: Omit<Enquiry, "id" | "createdAt" | "age"> & { age?: number }) => void;
  updateStatus: (id: string, status: Enquiry["status"]) => void;
  markConverted: (id: string) => void;
  dropEnquiry: (id: string, reason: string) => void;
  isConverted: (id: string) => boolean;
  getEnquiry: (id: string) => Enquiry | undefined;
  convertibleEnquiries: () => Enquiry[];
}

const EnquiryCtx = createContext<Ctx | null>(null);

const CONVERTIBLE_STATUSES: Enquiry["status"][] = [
  "Visit Completed",
  "Documents Pending",
  "Admission Approved",
];

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => getStoredEnquiries());
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(() => {
    fetchEnquiries().then((res) => {
      if (res.data && res.data.length > 0) {
        setEnquiries(res.data);
      }
    }).catch(() => {});
  }, []);

  useAutoRefresh("enquiries", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEnquiry = useCallback((e: Omit<Enquiry, "id" | "createdAt" | "age"> & { age?: number }) => {
    const newEnquiry: Enquiry = {
      ...e,
      id: `ENQ-${Date.now()}`,
      age: e.age || 4,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setEnquiries((prev) => [newEnquiry, ...prev]);
    saveStoredEnquiries([newEnquiry, ...enquiries]);
    Promise.resolve(supabase.from("gv_requests").insert([{
      id: newEnquiry.id,
      request_type: "enquiry",
      applicant_or_child_name: newEnquiry.childName,
      parent_name: newEnquiry.parentName,
      phone: newEnquiry.phone,
      reason_or_notes: newEnquiry.notes || "",
      status: newEnquiry.status,
      created_at: new Date().toISOString(),
    }])).catch(() => {});
  }, [enquiries]);

  const updateStatus = useCallback((id: string, status: Enquiry["status"]) => {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    Promise.resolve(supabase.from("gv_requests").update({ status }).eq("id", id)).catch(() => {});
  }, []);

  const markConverted = useCallback((id: string) => {
    setConvertedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "Enrolled" } : e)));
    Promise.resolve(supabase.from("gv_requests").update({ status: "Enrolled" }).eq("id", id)).catch(() => {});
  }, []);

  const dropEnquiry = useCallback((id: string, reason: string) => {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "Dropped", notes: `Dropped: ${reason}` } : e)));
    Promise.resolve(supabase.from("gv_requests").update({ status: "Dropped", notes: `Dropped: ${reason}` }).eq("id", id)).catch(() => {});
  }, []);

  const isConverted = useCallback((id: string) => convertedIds.has(id), [convertedIds]);
  const getEnquiry = useCallback((id: string) => enquiries.find((e) => e.id === id), [enquiries]);
  const convertibleEnquiries = useCallback(
    () => enquiries.filter((e) => !convertedIds.has(e.id) && CONVERTIBLE_STATUSES.includes(e.status)),
    [enquiries, convertedIds],
  );

  const value = useMemo<Ctx>(
    () => ({
      enquiries,
      convertedIds,
      addEnquiry,
      updateStatus,
      markConverted,
      dropEnquiry,
      isConverted,
      getEnquiry,
      convertibleEnquiries,
    }),
    [enquiries, convertedIds, addEnquiry, updateStatus, markConverted, dropEnquiry, isConverted, getEnquiry, convertibleEnquiries],
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
