import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { CircularList } from "@/components/circulars/CircularList";
import { fetchCirculars } from "@/lib/supabaseService";
import { initialCirculars } from "@/lib/principal-mock-data";

export const Route = createFileRoute("/parent/circulars")({
  component: ParentCircularsPage,
});

function ParentCircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      setCirculars(data || []);
    });
  }, []);

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
