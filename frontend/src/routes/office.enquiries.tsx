import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { EnquiryKanban } from "@/components/EnquiryKanban";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useEnquiries } from "@/lib/enquiryContext";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/office/enquiries")({ component: Enquiries });

function Enquiries() {
  const { convertibleEnquiries } = useEnquiries();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const options = convertibleEnquiries();

  const startConvert = () => {
    if (options.length === 0) {
      toast.info("No enquiries are ready for conversion yet. Move a card to Visit Completed, Docs Pending or Approved first.");
      return;
    }
    if (options.length === 1) {
      navigate({ to: "/office/admissions", search: { enquiryId: options[0].id } });
      return;
    }
    setPicked(options[0].id);
    setOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          title="Enquiries"
          subtitle="Drag cards to move through the pipeline."
          action={
            <Button
              onClick={startConvert}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg"
            >
              Convert to Admission <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          }
        />
      </div>
      <div className="flex-1 min-h-0">
        <EnquiryKanban />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pick an enquiry to convert</DialogTitle></DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {options.map((e) => (
              <label
                key={e.id}
                className={`flex items-center justify-between rounded-2xl p-3 border cursor-pointer ${picked === e.id ? "bg-orange-50 border-orange-200" : "bg-white/70 border-white/60"}`}
              >
                <div>
                  <div className="font-medium text-sm">{e.childName}</div>
                  <div className="text-xs text-muted-foreground">{e.parentName} • {e.interestedClass} • {e.status}</div>
                </div>
                <input
                  type="radio"
                  name="enq"
                  checked={picked === e.id}
                  onChange={() => setPicked(e.id)}
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setOpen(false);
                navigate({ to: "/office/admissions", search: { enquiryId: picked } });
              }}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
      </Dialog>
    </div>
  );
}
