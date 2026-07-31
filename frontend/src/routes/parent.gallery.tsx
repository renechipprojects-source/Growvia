import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useT } from "@/lib/i18n";
import { useState } from "react";

export const Route = createFileRoute("/parent/gallery")({ component: ParentGallery });

function ParentGallery() {
  const { t } = useT();
  const [photos] = useState<string[]>([]);

  return (
    <div>
      <PageHeader title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
      <SectionCard title={t("gallery.fromClass")}>
        {photos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No gallery photos uploaded yet.</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className="mb-3 w-full rounded-2xl object-cover break-inside-avoid" style={{ height: 140 + (i * 41) % 160 }} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
