import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/teacher/circulars")({
  component: TeacherCircularsPage,
});

function TeacherCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);

  const loadCirculars = useCallback(() => {
    return fetchCirculars().then(({ data }) => setCirculars(data || []));
  }, []);

  useEffect(() => {
    loadCirculars();
  }, [loadCirculars]);

  useAutoRefresh("circulars", loadCirculars);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none p-6 space-y-6">
      <PageHeader
        title="Teacher Circulars & Notices"
        description="Official notices and staff announcements from the Principal"
      />

      <CircularList circulars={circulars} role="teacher" />
    </div>
  );
}
