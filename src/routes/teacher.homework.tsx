import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { HOMEWORK } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { NotificationService } from "@/lib/notifications";


export const Route = createFileRoute("/teacher/homework")({ component: HW });

function HW() {
  const { register, handleSubmit, reset, setValue, watch } = useForm<{ subject: string; title: string; due: string; details: string; className: string }>({ defaultValues: { className: "Nursery", subject: "Language" } });
  return (
    <div>
      <PageHeader title="Homework" subtitle="Keep it playful, keep it light." />
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title="Assign homework">
          <form onSubmit={handleSubmit((v) => { NotificationService.homeworkAssigned(v.title || "New homework", "Miss Anjali"); toast.success("Homework shared"); reset(); })} className="space-y-3">
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
            <Input placeholder="Title" {...register("title")} className="bg-white/70" />
            <Input type="date" {...register("due")} className="bg-white/70" />
            <Textarea placeholder="Details" rows={3} {...register("details")} className="bg-white/70" />
            <Button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">Assign</Button>
          </form>
        </SectionCard>
        <SectionCard title="Active homework" className="lg:col-span-2">
          <ul className="space-y-2 max-h-[calc(100vh-320px)] min-h-[300px] overflow-y-auto pr-1 -mr-1">
            {HOMEWORK.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                <div><div className="font-medium">{h.title}</div><div className="text-xs text-muted-foreground">{h.className} • {h.subject}</div></div>
                <div className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-1">Due {h.due}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
