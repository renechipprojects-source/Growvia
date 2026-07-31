import React, { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/office/circulars")({
  component: OfficeCircularsPage,
});

function OfficeCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);

  const loadCirculars = useCallback(() => {
    return fetchCirculars().then(({ data }) => setCirculars(data || []));
  }, []);

  useAutoRefresh("circulars", loadCirculars);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none p-6 space-y-6">
      <PageHeader
        title="Office Staff Circulars"
        description="Administrative notices, policy updates, and staff circulars"
      />

      <CircularList circulars={circulars} role="office" />
    </div>
  );
}
