import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { ACTIVITIES } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/activities")({ component: () => (
  <div>
    <PageHeader title="Activities" subtitle="Share what today felt like."
      action={<Button onClick={() => toast.success("Activity posted!")} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg"><Plus className="h-4 w-4 mr-2" />New Activity</Button>}
    />
    <div className="max-h-[calc(100vh-220px)] min-h-[300px] overflow-y-auto pr-1 -mr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIVITIES.concat(ACTIVITIES).map((a, i) => (
          <Card key={`${a.id}-${i}`} className="rounded-3xl overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow-lg">
            <img src={a.cover} className="h-44 w-full object-cover" alt={a.title} />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{a.title}</div>
                <Badge className="bg-sky-100 text-sky-700">{a.className}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{a.date}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
) });
