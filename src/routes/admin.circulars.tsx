import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { initialCirculars } from "@/lib/principal-mock-data";

export const Route = createFileRoute("/admin/circulars")({
  component: AdminCircularsPage,
});

function AdminCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>(initialCirculars);

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      if (data && data.length > 0) {
        setCirculars(data);
      }
    });
  }, []);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none p-6 space-y-6">
      <PageHeader
        title="Circulars & Notices"
        description="Read-only organization-wide notice archive"
      />

      <CircularList circulars={circulars} role="admin" />
    </div>
  );
}
