import React from "react";
import { FileText, Download, Image as ImageIcon, FileSpreadsheet, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentViewerProps {
  attachmentName?: string;
  attachmentUrl?: string;
}

export function AttachmentViewer({ attachmentName, attachmentUrl }: AttachmentViewerProps) {
  if (!attachmentName && !attachmentUrl) return null;

  const fileName = attachmentName || "Circular_Attachment.pdf";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  const getIcon = () => {
    if (["pdf"].includes(ext)) return <FileText className="w-5 h-5 text-rose-500" />;
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return <ImageIcon className="w-5 h-5 text-sky-500" />;
    if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-indigo-500" />;
  };

  const handleDownload = () => {
    if (attachmentUrl) {
      window.open(attachmentUrl, "_blank");
    } else {
      // Demo download simulation for mock files
      const blob = new Blob([`Attachment Content for ${fileName}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{fileName}</div>
          <div className="text-xs text-slate-500 uppercase">{ext || "Document"} · Ready for download</div>
        </div>
      </div>

      <Button size="sm" variant="outline" onClick={handleDownload} className="rounded-xl border-slate-300 text-slate-700 hover:bg-white shrink-0">
        <Download className="w-4 h-4 mr-1.5" /> Download
      </Button>
    </div>
  );
}
