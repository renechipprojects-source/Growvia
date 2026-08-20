import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";


export const Route = createFileRoute("/admin/circulars")({
  component: AdminCircularsPage,
});

function AdminCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);

  const loadCirculars = useCallback(() => {
    return fetchCirculars().then(({ data }) => setCirculars(data || []));
  }, []);

  useEffect(() => {
    loadCirculars();
  }, [loadCirculars]);

  useAutoRefresh("circulars", loadCirculars);

  return (
    <div className="space-y-6 w-full max-w-none">
      <PageHeader
        title="Circulars & Notices"
        description="Read-only organization-wide notice archive"
      />

      <CircularList circulars={circulars} role="admin" />
    </div>
  );
}
