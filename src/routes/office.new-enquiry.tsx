import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { createEnquiry } from "@/lib/supabaseService";

const schema = z.object({
  childName: z.string().min(2),
  age: z.string().min(1),
  parentName: z.string().min(2),
  phone: z.string().min(10),
  interestedClass: z.string().min(1),
  source: z.string().min(1),
  notes: z.string().optional(),
});
type V = z.infer<typeof schema>;

export const Route = createFileRoute("/office/new-enquiry")({ component: NewEnquiry });

function NewEnquiry() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<V>({ resolver: zodResolver(schema), defaultValues: { interestedClass: "", source: "" } });

  return (
    <div>
      <PageHeader title="New Enquiry" subtitle="Capture every walk-in, call and WhatsApp." />
      <div className="grid grid-cols-1 gap-4">
        <SectionCard title="Enquiry details">
          <form
            onSubmit={handleSubmit(async (v) => {
              const { error } = await createEnquiry({
                childName: v.childName,
                parentName: v.parentName,
                phone: v.phone,
                age: parseInt(v.age || "3", 10),
                interestedClass: v.interestedClass,
                source: v.source as any,
                status: "New",
                notes: v.notes,
              });
              if (error) {
                toast.error(`Error creating enquiry: ${error.message}`);
                return;
              }
              toast.success(`Enquiry created for ${v.childName} — synced to Supabase.`);
              reset();
            })}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <F label="Child's name" err={errors.childName?.message}><Input {...register("childName")} className="bg-white/70" /></F>
            <F label="Age" err={errors.age?.message}><Input type="number" {...register("age")} className="bg-white/70" /></F>
            <F label="Parent name" err={errors.parentName?.message}><Input {...register("parentName")} className="bg-white/70" /></F>
            <F label="Phone" err={errors.phone?.message}><Input {...register("phone")} className="bg-white/70" /></F>
            <F label="Interested class" err={errors.interestedClass?.message}>
              <Select value={watch("interestedClass")} onValueChange={(v) => setValue("interestedClass", v, { shouldValidate: true })}>
                <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Playgroup", "Nursery", "LKG", "UKG"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Source" err={errors.source?.message}>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v, { shouldValidate: true })}>
                <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Walk-in", "Phone", "WhatsApp", "Referral"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <div className="md:col-span-2"><F label="Notes"><Textarea rows={3} {...register("notes")} className="bg-white/70" /></F></div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg">
                <Sparkles className="h-4 w-4 mr-2" />Create Enquiry
              </Button>
              <p className="mt-2 text-xs text-muted-foreground text-center">Enquiry enters the pipeline for follow up & admission.</p>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (<div><Label>{label}</Label><div className="mt-1.5">{children}</div>{err && <p className="mt-1 text-xs text-rose-600">{err}</p>}</div>);
}
