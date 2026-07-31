import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useHomework, type Homework } from "@/lib/homeworkStore";

export const Route = createFileRoute("/teacher/homework")({ component: HW });

function HW() {
  const { homework, createHomework } = useHomework();
  const { register, handleSubmit, reset, setValue, watch } = useForm<{ subject: string; title: string; due: string; details: string; className: string }>({
    defaultValues: { className: "Nursery", subject: "Language" },
  });

  const onSubmit = (v: { title: string; subject: string; className: string; due: string; details?: string }) => {
    if (!v.title.trim()) return toast.error("Homework title is required!");
    createHomework({
      title: v.title.trim(),
      subject: v.subject,
      className: v.className,
      due: v.due,
      details: v.details,
    });
    toast.success(`Homework "${v.title.trim()}" assigned & notified to parents!`);
    reset({ className: v.className, subject: v.subject, title: "", due: "", details: "" });
  };

  const handleDelete = (id: string | number, title: string) => {
    toast.success(`Homework "${title}" removed.`);
  };

  return (
    <div>
      <PageHeader title="Homework" subtitle="Keep it playful, keep it light." />
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="Assign homework">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <Select value={watch("className")} onValueChange={(v) => setValue("className", v)}>
                <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
                <SelectContent>{["Playgroup", "Nursery", "LKG", "UKG"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Select value={watch("subject")} onValueChange={(v) => setValue("subject", v)}>
                <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
                <SelectContent>{["Language", "Math", "Art", "Show & Tell", "Music"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Homework Title *" required {...register("title")} className="bg-white/70" />
            <Input type="date" {...register("due")} className="bg-white/70" />
            <Textarea placeholder="Details (optional)" rows={3} {...register("details")} className="bg-white/70" />
            <Button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">Assign Homework</Button>
          </form>
        </SectionCard>

        <SectionCard title="Active homework" className="lg:col-span-2">
          {homework.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No active homework assigned yet.</div>
          ) : (
            <ul className="space-y-2 max-h-[calc(100vh-320px)] min-h-[300px] overflow-y-auto pr-1 -mr-1">
              {homework.map((h: Homework) => (
                <li key={h.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3 shadow-sm hover:shadow-md transition">
                  <div>
                    <div className="font-medium text-slate-900">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{h.className} • {h.subject}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs bg-sky-100 text-sky-700 rounded-full px-2.5 py-1 font-medium">Due {h.due}</div>
                    <button
                      onClick={() => handleDelete(h.id, h.title)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      title="Delete homework"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
