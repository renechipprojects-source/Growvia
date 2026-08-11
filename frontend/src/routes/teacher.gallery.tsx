import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useActivities } from "@/lib/activitiesStore";

export const Route = createFileRoute("/teacher/gallery")({ component: TeacherGallery });

function TeacherGallery() {
  const { activities, createActivity } = useActivities();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        createActivity({
          title: file.name.replace(/\.[^/.]+$/, "") || "Class Activity Photo",
          className: "Nursery A",
          cover: dataUrl,
        });
        toast.success(`Uploaded "${file.name}" successfully!`);
      }
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const images = activities.filter((a) => a.cover && a.cover !== "/placeholder.svg");

  return (
    <div>
      <PageHeader
        title="Gallery"
        subtitle="Every giggle. Every mess. Every masterpiece."
        action={
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </>
        }
      />
      <SectionCard title="Recent photos">
        <div className="max-h-[calc(100vh-280px)] min-h-[320px] overflow-y-auto pr-1 -mr-1">
          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No photos in gallery yet. Click "Upload Photo" to add your first photo.
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
              {images.map((item, i) => (
                <div key={item.id || i} className="mb-3 break-inside-avoid group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <img
                    src={item.cover}
                    alt={item.title || `Gallery ${i}`}
                    className="w-full object-cover"
                    style={{ height: 140 + (i * 37) % 120 }}
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
        </div>
      </SectionCard>
    </div>
  );
}
