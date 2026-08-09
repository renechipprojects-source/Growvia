import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { type Student } from "@/lib/mockData";
import { fetchStudents, updateStudent } from "@/lib/supabaseService";
import { StudentProfileModal } from "@/components/students/StudentProfileModal";
import { PromotionWizardModal } from "@/components/students/PromotionWizardModal";
import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, GraduationCap, Users, User, Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/office/students")({ component: OfficeStudents });

import { useAutoRefresh } from "@/lib/autoRefreshContext";

function OfficeStudents() {
  const [data, setData] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParent, setSelectedParent] = useState<Student | null>(null);
  const [openPromotionModal, setOpenPromotionModal] = useState(false);

  // Photo Edit Modal State
  const [editingPhotoStudent, setEditingPhotoStudent] = useState<Student | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const loadStudents = useCallback(() => {
    fetchStudents().then(({ data }) => setData(data || []));
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useAutoRefresh("students", loadStudents);

  const handleOpenPhotoEdit = (s: Student) => {
    setEditingPhotoStudent(s);
    setPhotoPreview(s.avatar || "");
  };

  const handleLocalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      setPhotoPreview(rawDataUrl); // Immediately populate preview so Save button works instantly!

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setPhotoPreview(compressedDataUrl);
        } catch {}
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!editingPhotoStudent) {
      toast.error("No student selected.");
      return;
    }
    if (!photoPreview) {
      toast.error("Please select a local image file first.");
      return;
    }
    try {
      setIsSavingPhoto(true);
      await updateStudent(editingPhotoStudent.id, { avatar: photoPreview });
      toast.success(`Photo saved successfully for ${editingPhotoStudent.name}!`);
      setEditingPhotoStudent(null);
      setPhotoPreview("");
      loadStudents();
    } catch (err: any) {
      toast.error("Failed to save photo: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const cols: ColumnDef<Student>[] = [
    { header: "ID", accessorKey: "id" },
    {
      header: "Student", accessorKey: "name",
      cell: (c) => {
        const s = c.row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border"><AvatarImage src={s.avatar} /><AvatarFallback>{s.name ? s.name[0] : "S"}</AvatarFallback></Avatar>
            <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.parent}</div></div>
          </div>
        );
      },
    },
    { accessorKey: "className", header: "Class" },
    { accessorKey: "admissionDate", header: "Joined" },
    {
      accessorKey: "feeStatus", header: "Fees",
      cell: (c) => {
        const v = c.getValue<string>();
        return <Badge className={v === "Paid" ? "bg-emerald-100 text-emerald-700" : v === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>{v || "Pending"}</Badge>;
      },
    },
    { accessorKey: "phone", header: "Phone" },
    {
      header: "Actions",
      id: "actions",
      cell: (c) => {
        const s = c.row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setSelectedStudent(s)}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> View Profile
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-indigo-600 hover:text-indigo-800" onClick={() => handleOpenPhotoEdit(s)}>
              <Camera className="mr-1 h-3.5 w-3.5" /> Edit Photo
            </Button>
          </div>
        );
      },
    },
  ];

  const parentCols: ColumnDef<Student>[] = [
    {
      header: "Parent Name",
      accessorKey: "parent",
      cell: (c) => <span className="font-medium text-slate-900">{c.getValue<string>() || "Parent"}</span>,
    },
    {
      header: "Child",
      accessorKey: "name",
      cell: (c) => {
        const s = c.row.original;
        return <span>{s.name} ({s.className})</span>;
      },
    },
    {
      header: "Occupation",
      accessorKey: "occupation",
      cell: (c) => <span className="text-sm font-medium text-slate-700">{(c.row.original as any).occupation || "Business / Service"}</span>,
    },
    { accessorKey: "phone", header: "Mobile" },
    {
      header: "Actions",
      id: "parentActions",
      cell: (c) => {
        const s = c.row.original;
        return (
          <Button size="sm" variant="outline" onClick={() => setSelectedParent(s)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3 w-full max-w-none">
      <div className="shrink-0">
        <PageHeader
          title="Students & Parents Directory"
          subtitle="Directory of enrolled students, parent profiles, fee ledgers, and academic session promotions."
          action={
            <Button
              onClick={() => setOpenPromotionModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs shadow-md font-semibold px-4 py-2"
            >
              <GraduationCap className="mr-2 h-4 w-4" /> Annual Promotion Wizard
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="students" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 bg-slate-100 p-1 rounded-xl w-fit">
          <TabsTrigger value="students" className="gap-2 text-xs font-semibold rounded-lg"><User className="h-3.5 w-3.5" /> Students Directory</TabsTrigger>
          <TabsTrigger value="parents" className="gap-2 text-xs font-semibold rounded-lg"><Users className="h-3.5 w-3.5" /> Parents Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="flex-1 min-h-0 mt-3">
          <DataTable data={data} columns={cols} searchKey="name" fillParent />
        </TabsContent>

        <TabsContent value="parents" className="flex-1 min-h-0 mt-3">
          <DataTable data={data} columns={parentCols} searchKey="parent" fillParent />
        </TabsContent>
      </Tabs>

      <StudentProfileModal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />

      {/* Parent View Details Modal */}
      <Dialog open={!!selectedParent} onOpenChange={() => setSelectedParent(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" /> Parent Information Details
            </DialogTitle>
          </DialogHeader>
          {selectedParent && (
            <div className="space-y-4 pt-2 text-sm text-slate-700">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div><span className="font-semibold text-slate-900">Parent / Guardian:</span> {selectedParent.parent}</div>
                <div><span className="font-semibold text-slate-900">Occupation:</span> {(selectedParent as any).occupation || (selectedParent as any).father_name ? "Business / Professional" : "Service"}</div>
                <div><span className="font-semibold text-slate-900">Mobile Phone:</span> {selectedParent.phone || "N/A"}</div>
                <div><span className="font-semibold text-slate-900">Email Address:</span> {selectedParent.email || `${selectedParent.id.toLowerCase()}@growvia.edu`}</div>
                <div><span className="font-semibold text-slate-900">Residential Address:</span> {(selectedParent as any).address || "123 Sunshine Street, Playtown"}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1 text-xs">
                <div className="font-bold text-indigo-900">Enrolled Child Details</div>
                <div><span className="font-semibold">Child Name:</span> {selectedParent.name}</div>
                <div><span className="font-semibold">Class & Section:</span> {selectedParent.className}</div>
                <div><span className="font-semibold">Admission No:</span> {selectedParent.admissionNo || selectedParent.id}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PromotionWizardModal
        open={openPromotionModal}
        onClose={() => setOpenPromotionModal(false)}
        onPromoteSuccess={loadStudents}
      />

      {/* Office Edit Student Photo Dialog */}
      <Dialog open={!!editingPhotoStudent} onOpenChange={(open) => !open && setEditingPhotoStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Student Profile Photo — {editingPhotoStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
              <AvatarImage src={photoPreview} className="object-cover" />
              <AvatarFallback className="text-xl font-bold bg-indigo-100 text-indigo-700">
                {editingPhotoStudent?.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Upload new photo from local device</Label>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Select an image file (JPG, PNG, WEBP). This change will update instantly across all portals and Parent Portal.
              </p>
            </div>
            <input
              type="file"
              id="office-edit-student-photo"
              accept="image/*"
              className="hidden"
              onChange={handleLocalPhotoSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("office-edit-student-photo")?.click()}
              className="bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Select Local Image File
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhotoStudent(null)}>Cancel</Button>
            <Button onClick={handleSavePhoto} disabled={isSavingPhoto} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow">
              {isSavingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving Photo...
                </>
              ) : (
                "Save Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
