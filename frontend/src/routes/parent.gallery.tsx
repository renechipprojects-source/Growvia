import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useT } from "@/lib/i18n";
import { useActivities } from "@/lib/activitiesStore";

export const Route = createFileRoute("/parent/gallery")({ component: ParentGallery });

function ParentGallery() {
  const { t } = useT();
  const { activities } = useActivities();

  const photos = activities.filter((a) => a.cover && a.cover !== "/placeholder.svg");

  return (
    <div>
      <PageHeader title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
      <SectionCard title={t("gallery.fromClass")}>
        {photos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No gallery photos uploaded yet.</div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {photos.map((item, i) => (
              <div key={item.id || i} className="mb-3 break-inside-avoid group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                <img
                  src={item.cover}
                  alt={item.title || `Gallery photo ${i}`}
                  className="w-full object-cover"
                  style={{ height: 140 + (i * 41) % 160 }}
                />
                {item.title && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white font-medium truncate">
                    {item.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
