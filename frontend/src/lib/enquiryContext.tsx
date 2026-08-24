import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Enquiry } from "@/lib/mockData";
import { fetchEnquiries, getStoredEnquiries, saveStoredEnquiries } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { supabase } from "@/lib/supabase";

interface Ctx {
  enquiries: Enquiry[];
  allEnquiries: Enquiry[];
  enrolledEnquiries: Enquiry[];
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
  const [allEnquiries, setAllEnquiries] = useState<Enquiry[]>(() => getStoredEnquiries());
  const [convertedIds, setConvertedIds] = useState<Set<string>>(() => {
    const initial = getStoredEnquiries();
    const cIds = new Set<string>();
    initial.forEach((e) => {
      if (e.status === "Enrolled" || (e.status as string) === "Converted") cIds.add(e.id);
    });
    return cIds;
  });

  const loadData = useCallback(() => {
    fetchEnquiries().then((res) => {
      const list = res.data || [];
      setAllEnquiries(list);
      setConvertedIds((prev) => {
        const next = new Set(prev);
        list.forEach((e) => {
          if (e.status === "Enrolled" || (e.status as string) === "Converted") next.add(e.id);
        });
        return next;
      });
    }).catch(() => {});
  }, []);

  useAutoRefresh("enquiries", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active enquiries excludes converted/enrolled records
  const enquiries = useMemo(() => {
    return allEnquiries.filter(
      (e) => e.status !== "Enrolled" && (e.status as string) !== "Converted" && !convertedIds.has(e.id),
    );
  }, [allEnquiries, convertedIds]);

  // Enrolled/Converted enquiries for section/column history tracking
  const enrolledEnquiries = useMemo(() => {
    return allEnquiries.filter(
      (e) => e.status === "Enrolled" || (e.status as string) === "Converted" || convertedIds.has(e.id),
    );
  }, [allEnquiries, convertedIds]);

  const addEnquiry = useCallback((e: Omit<Enquiry, "id" | "createdAt" | "age"> & { age?: number }) => {
    const newEnquiry: Enquiry = {
      ...e,
      id: `ENQ-${Date.now()}`,
      age: e.age || 4,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setAllEnquiries((prev) => {
      const next = [newEnquiry, ...prev];
      saveStoredEnquiries(next);
      return next;
    });
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
  }, []);

  const updateStatus = useCallback((id: string, status: Enquiry["status"]) => {
    setAllEnquiries((prev) => {
      const target = prev.find((e) => e.id === id);
      // Guard: never allow status changes on converted/enrolled enquiries
      if (target && (target.status === "Enrolled" || (target.status as string) === "Converted")) {
        return prev;
      }
      const updated = prev.map((e) => (e.id === id ? { ...e, status } : e));
      saveStoredEnquiries(updated);
      return updated;
    });
    Promise.resolve(supabase.from("gv_requests").update({ status }).eq("id", id)).catch(() => {});
  }, []);

  const markConverted = useCallback((id: string) => {
    setConvertedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setAllEnquiries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, status: "Enrolled" as Enquiry["status"] } : e));
      saveStoredEnquiries(updated);
      return updated;
    });
    Promise.resolve(supabase.from("gv_requests").update({ status: "Enrolled" }).eq("id", id)).catch(() => {});
  }, []);

  const dropEnquiry = useCallback((id: string, reason: string) => {
    setAllEnquiries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, status: "Dropped" as Enquiry["status"], notes: `Dropped: ${reason}` } : e));
      saveStoredEnquiries(updated);
      return updated;
    });
    Promise.resolve(supabase.from("gv_requests").update({ status: "Dropped", reason_or_notes: `Dropped: ${reason}` }).eq("id", id)).catch(() => {});
  }, []);

  const isConverted = useCallback((id: string) => {
    if (convertedIds.has(id)) return true;
    const item = allEnquiries.find((e) => e.id === id);
    return item ? item.status === "Enrolled" || (item.status as string) === "Converted" : false;
  }, [allEnquiries, convertedIds]);

  const getEnquiry = useCallback((id: string) => allEnquiries.find((e) => e.id === id), [allEnquiries]);

  const convertibleEnquiries = useCallback(
    () => enquiries.filter((e) => CONVERTIBLE_STATUSES.includes(e.status)),
    [enquiries],
  );

  const value = useMemo<Ctx>(
    () => ({
      enquiries,
      allEnquiries,
      enrolledEnquiries,
      convertedIds,
      addEnquiry,
      updateStatus,
      markConverted,
      dropEnquiry,
      isConverted,
      getEnquiry,
      convertibleEnquiries,
    }),
    [enquiries, allEnquiries, enrolledEnquiries, convertedIds, addEnquiry, updateStatus, markConverted, dropEnquiry, isConverted, getEnquiry, convertibleEnquiries],
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
