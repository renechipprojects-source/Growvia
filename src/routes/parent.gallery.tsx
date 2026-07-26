import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { GALLERY } from "@/lib/mockData";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/parent/gallery")({ component: ParentGallery });

function ParentGallery() {
  const { t } = useT();
  return (
    <div>
      <PageHeader title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
      <SectionCard title={t("gallery.fromClass")}>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
          {GALLERY.concat(GALLERY).map((src, i) => (
            <img key={i} src={src} alt="" className="mb-3 w-full rounded-2xl object-cover break-inside-avoid" style={{ height: 140 + (i * 41) % 160 }} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
