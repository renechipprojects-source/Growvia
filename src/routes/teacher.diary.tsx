import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { DIARY } from "@/lib/mockData";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotebookPen } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NotificationService } from "@/lib/notifications";


export const Route = createFileRoute("/teacher/diary")({ component: Diary });

function Diary() {
  const { register, handleSubmit, reset } = useForm<{ date: string; mood: string; note: string }>();
  return (
    <div>
      <PageHeader title="Daily Diary" subtitle="Little updates make big memories." />
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="New entry">
          <form onSubmit={handleSubmit(() => { NotificationService.diaryPublished("Diya"); toast.success("Diary shared with parents"); reset(); })} className="space-y-3">
            <Input type="date" {...register("date")} className="bg-white/70" />
            <Input placeholder="Mood emoji (e.g. 😊)" {...register("mood")} className="bg-white/70" />
            <Textarea rows={5} placeholder="What did they do today?" {...register("note")} className="bg-white/70" />
            <Button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">
              <NotebookPen className="h-4 w-4 mr-2" />Publish
            </Button>
          </form>
        </SectionCard>
        <SectionCard title="Recent entries" className="lg:col-span-2">
          <ul className="space-y-3">
            {DIARY.map((d) => (
              <li key={d.id} className="rounded-2xl bg-white/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{d.date}</div>
                  <div className="text-lg">{d.mood}</div>
                </div>
                <div className="mt-1 text-sm">{d.note}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
