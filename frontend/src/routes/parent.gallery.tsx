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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {photos.map((item, i) => (
              <div
                key={item.id || i}
                className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-white/60 bg-white/40 aspect-[4/3] flex flex-col justify-end"
              >
                <img
                  src={item.cover}
                  alt={item.title || `Gallery photo ${i}`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="relative z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-xs text-white font-medium truncate">
                  {item.title || `Photo ${i + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
