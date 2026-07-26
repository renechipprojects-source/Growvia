import { useParent } from "@/lib/parentContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Baby } from "lucide-react";

/**
 * Child switcher for parents with multiple children. Renders a compact
 * dropdown showing the active child's avatar + class. Hidden entirely when
 * the household has just one child.
 */
export function ChildSwitcher({ className }: { className?: string }) {
  const { children, activeChild, setActiveChildId } = useParent();
  if (children.length <= 1) return null;

  return (
    <div className={className}>
      <div className="rounded-full bg-white/70 backdrop-blur border border-white/60 shadow px-2 py-1.5 flex items-center gap-2">
        <img src={activeChild.avatar} className="h-8 w-8 rounded-full bg-white" alt="" />
        <div className="hidden sm:block min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none">Current child</div>
        </div>
        <Select value={activeChild.id} onValueChange={setActiveChildId}>
          <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 h-8 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <Baby className="h-3 w-3 text-pink-500" />
                  <span>{c.name} · {c.className}-{c.section}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
