import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { initialCirculars } from "@/lib/principal-mock-data";

export const Route = createFileRoute("/office/circulars")({
  component: OfficeCircularsPage,
});

function OfficeCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      setCirculars(data || []);
    });
  }, []);

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
