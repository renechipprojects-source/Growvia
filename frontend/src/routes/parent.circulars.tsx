import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/parent/circulars")({
  component: ParentCircularsPage,
});

function ParentCircularsPage() {
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
        title="School Circulars & Notices"
        description="Important updates, events, and announcements for parents"
      />

      <CircularList circulars={circulars} role="parent" />
    </div>
  );
}
