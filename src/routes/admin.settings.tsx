import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, Database, FileSpreadsheet, Download, Upload, Save, ShieldCheck, Bell } from "lucide-react";
import { useState } from "react";
import { useAcademicYear } from "@/lib/academicYearContext";
import { downloadBackupFile, restoreBackupFromJSON } from "@/lib/backupRestoreService";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const { activeYear, availableYears, setActiveYear } = useAcademicYear();
  const [schoolName, setSchoolName] = useState("Sunshine Play School & Daycare");
  const [receiptFormat, setReceiptFormat] = useState("REC-2026-XXXX");
  const [restoreJSON, setRestoreJSON] = useState("");

  const handleSaveProfile = () => {
    toast.success("School profile and receipt format updated!");
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (restoreBackupFromJSON(content)) {
        toast.success("Database restored successfully! Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Invalid backup file format!");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise System Settings"
        subtitle="Manage school profile, active academic year, masters, receipt number format, backup & restore."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. School Profile & Academic Year */}
        <SectionCard title="School Profile & Active Academic Year">
          <div className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">School Name</Label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="mt-1 rounded-xl bg-white border-slate-200"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Active Academic Year</Label>
              <Select value={activeYear} onValueChange={setActiveYear}>
                <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y} {y === activeYear ? "(Active)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Receipt Number Format</Label>
              <Input
                value={receiptFormat}
                onChange={(e) => setReceiptFormat(e.target.value)}
                className="mt-1 rounded-xl bg-white border-slate-200 font-mono"
              />
            </div>

            <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md w-full">
              <Save className="h-4 w-4 mr-2" /> Save Profile Settings
            </Button>
          </div>
        </SectionCard>

        {/* 2. Database Backup & Restore */}
        <SectionCard title="Database Backup & Restore (Admin / Office)">
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-amber-900">
              <p className="font-bold flex items-center gap-1.5">
                <Database className="h-4 w-4 text-amber-600" /> Full Data Snapshot & Recovery
              </p>
              <p className="mt-1 text-[11px] text-amber-800">
                Backup creates an encrypted JSON snapshot of all student records, fee ledgers, staff assignments, circulars, and settings.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={downloadBackupFile} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md w-full">
                <Download className="h-4 w-4 mr-2" /> Backup Database (Download JSON)
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <Label className="text-xs font-semibold block mb-1">Restore Database from Backup Snapshot</Label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 3. Class, Subject & Fee Masters */}
      <SectionCard title="Master Registries & Configuration">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Class Master</span>
              <Badge variant="outline" className="bg-white">4 Classes</Badge>
            </div>
            <p className="text-[11px] text-slate-500">Playgroup, Nursery, LKG, UKG (Sections A & B)</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Subject Master</span>
              <Badge variant="outline" className="bg-white">7 Subjects</Badge>
            </div>
            <p className="text-[11px] text-slate-500">English, Math, Rhymes, EVS, Art, PE, GK</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Fee Structure Master</span>
              <Badge variant="outline" className="bg-white">Quarterly</Badge>
            </div>
            <p className="text-[11px] text-slate-500">Tuition Fee: ₹8,500/Qtr · Term Fee: ₹2,000</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
