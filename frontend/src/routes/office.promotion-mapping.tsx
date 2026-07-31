import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, Save, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getPromotionMapping, savePromotionMapping, DEFAULT_PROMOTION_MAPPING } from "@/lib/promotionStore";
import { toast } from "sonner";

export const Route = createFileRoute("/office/promotion-mapping")({ component: PromotionMappingPage });

const ALL_CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"] as const;
const DESTINATION_OPTIONS = [...ALL_CLASSES, "Alumni / Graduated"] as const;

function PromotionMappingPage() {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMapping(getPromotionMapping());
  }, []);

  const handleUpdate = (sourceClass: string, targetClass: string) => {
    setMapping((prev) => ({
      ...prev,
      [sourceClass]: targetClass,
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      savePromotionMapping(mapping, "Office Staff");
      setIsSaving(false);
      toast.success("Default Academic Promotion Mapping saved successfully!");
    }, 600);
  };

  const handleResetDefault = () => {
    setMapping(DEFAULT_PROMOTION_MAPPING);
    savePromotionMapping(DEFAULT_PROMOTION_MAPPING, "Office Staff");
    toast.success("Reset to commercial default promotion mappings!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Settings — Default Promotion Mapping"
        subtitle="Configure standard class progression rules for automated annual student promotions."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetDefault} className="rounded-xl text-xs">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Defaults
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-4 shadow-md">
              <Save className="mr-1.5 h-4 w-4" /> Save Progression Mapping
            </Button>
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950">
          <span className="font-semibold block">Office Operational Control & Commercial Business Rules</span>
          This configuration sets the default destination grade for each class during annual promotion. Every class maps to exactly one default next grade. Office Staff is the only role authorized to edit these rules. The Promotion Wizard will automatically populate destination classes using this mapping.
        </div>
      </div>

      <SectionCard title="Class Progression Rules (Source → Target)">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Source Class (Current)</th>
                <th className="px-4 py-3 text-center">Progression Flow</th>
                <th className="px-4 py-3">Default Target Class (Next Grade)</th>
                <th className="px-4 py-3 text-right">Mapping Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ALL_CLASSES.map((srcClass) => {
                const targetClass = mapping[srcClass] || DEFAULT_PROMOTION_MAPPING[srcClass] || "Nursery";
                const isGraduating = targetClass.includes("Alumni") || targetClass.includes("Graduated");

                return (
                  <tr key={srcClass} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{srcClass}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1 text-indigo-600 font-semibold text-xs">
                        <Badge variant="outline" className="bg-white">{srcClass}</Badge>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <Badge className={isGraduating ? "bg-purple-600 text-white" : "bg-indigo-600 text-white"}>{targetClass}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={targetClass} onValueChange={(val) => handleUpdate(srcClass, val)}>
                        <SelectTrigger className="w-[220px] rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DESTINATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isGraduating ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">Terminal Class / Graduation</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active Progression</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
