import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotebookPen, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NotificationService } from "@/lib/notifications";
import { useEffect, useState } from "react";
import { fetchDiaryEntries, createDiaryEntry, type DiaryEntry } from "@/lib/supabaseService";

export const Route = createFileRoute("/teacher/diary")({ component: Diary });

function Diary() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ date: string; mood: string; note: string }>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const data = await fetchDiaryEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
    const handleRefresh = () => loadEntries();
    window.addEventListener("sunshine-auto-refresh-diary", handleRefresh);
    window.addEventListener("sunshine-auto-refresh", handleRefresh);
    return () => {
      window.removeEventListener("sunshine-auto-refresh-diary", handleRefresh);
      window.removeEventListener("sunshine-auto-refresh", handleRefresh);
    };
  }, []);

  const onSubmit = async (values: { date: string; mood: string; note: string }) => {
    try {
      await createDiaryEntry({
        date: values.date || new Date().toISOString().slice(0, 10),
        mood: values.mood || "😊",
        note: values.note,
      });
      NotificationService.diaryPublished("Diya");
      toast.success("Diary shared with parents");
      reset();
      loadEntries();
    } catch {
      toast.error("Failed to publish diary entry");
    }
  };

  return (
    <div>
      <PageHeader title="Daily Diary" subtitle="Little updates make big memories." />
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="New entry">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} {...register("date")} className="bg-white/70" />
            <Input placeholder="Mood emoji (e.g. 😊)" defaultValue="😊" {...register("mood")} className="bg-white/70" />
            <Textarea rows={5} placeholder="What did they do today?" {...register("note", { required: true })} className="bg-white/70" />
            <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <NotebookPen className="h-4 w-4 mr-2" />}Publish
            </Button>
          </form>
        </SectionCard>
        <SectionCard title="Recent entries" className="lg:col-span-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading diary entries...</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No diary entries found.</div>
          ) : (
            <ul className="space-y-3">
              {entries.map((d) => (
                <li key={d.id} className="rounded-2xl bg-white/60 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                    <div className="text-lg">{d.mood}</div>
                  </div>
                  <div className="mt-1 text-sm">{d.note}</div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
