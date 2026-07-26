import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { GALLERY } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/gallery")({ component: TeacherGallery });

function TeacherGallery() {
  const [images, setImages] = useState<string[]>(GALLERY);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setImages((prev) => [dataUrl, ...prev]);
        toast.success(`Uploaded "${file.name}" successfully!`);
      }
    };
    reader.readAsDataURL(file);
  };

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
              className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg"
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Photo
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
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Gallery ${i}`}
                  className="mb-3 w-full rounded-2xl object-cover break-inside-avoid shadow-sm hover:shadow-md transition-shadow"
                  style={{ height: 140 + (i * 37) % 120 }}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
