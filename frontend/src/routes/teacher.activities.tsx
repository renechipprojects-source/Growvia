import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActivities, type Activity } from "@/lib/activitiesStore";

export const Route = createFileRoute("/teacher/activities")({ component: TeacherActivitiesPage });

const COVER_PRESETS = [
  { name: "Finger Painting", url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80" },
  { name: "Story Time", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80" },
  { name: "Outdoor Play", url: "https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=600&q=80" },
  { name: "Clay Modeling", url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80" },
];

function TeacherActivitiesPage() {
  const { activities, createActivity } = useActivities();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("Nursery A");
  const [cover, setCover] = useState(COVER_PRESETS[0].url);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Activity title is required!");

    createActivity({ title: title.trim(), className, cover });
    toast.success(`Activity "${title.trim()}" posted & live!`);
    setTitle("");
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Class Activities"
        subtitle="Share what today felt like with parents and school management."
        action={
          <Button
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" /> New Activity
          </Button>
        }
      />

      <div className="max-h-[calc(100vh-220px)] min-h-[300px] overflow-y-auto pr-1 -mr-1">
        {activities.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white/60 rounded-3xl border border-white/60">
            No activities posted yet. Click "New Activity" to post one!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map((a) => (
              <Card key={a.id} className="rounded-3xl overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow-lg group relative">
                <img src={a.cover} className="h-44 w-full object-cover" alt={a.title} />
                <button
                  onClick={() => toast.success(`Activity "${a.title}" archived.`)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur hover:bg-rose-500 hover:text-white grid place-items-center text-slate-600 transition shadow"
                  title="Delete activity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900 truncate">{a.title}</div>
                    <Badge className="bg-sky-100 text-sky-700 shrink-0">{a.className}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{a.date}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700">Activity Title *</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Coloring & Finger Painting"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700">Class</label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Playgroup A">Playgroup A</SelectItem>
                  <SelectItem value="Nursery A">Nursery A</SelectItem>
                  <SelectItem value="Nursery B">Nursery B</SelectItem>
                  <SelectItem value="LKG A">LKG A</SelectItem>
                  <SelectItem value="UKG A">UKG A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700">Choose Cover Photo</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setCover(p.url)}
                    className={`rounded-xl overflow-hidden border-2 text-left relative transition ${
                      cover === p.url ? "border-sky-500 ring-2 ring-sky-200" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={p.url} className="h-16 w-full object-cover" alt="" />
                    <div className="p-1 text-[10px] font-medium truncate bg-white/90">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-sky-500 to-blue-500 text-white">
                <ImageIcon className="h-4 w-4 mr-2" /> Post Activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
