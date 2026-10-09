import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import type { ProcessingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const map: Record<ProcessingStatus, { label: string; cls: string; icon: typeof Loader2; spin?: boolean }> = {
  UPLOADING: { label: "Uploading", cls: "bg-secondary text-secondary-foreground", icon: UploadCloud },
  EXTRACTING: { label: "Extracting content", cls: "bg-warning/20 text-warning-foreground", icon: Loader2, spin: true },
  READY: { label: "Ready", cls: "bg-success/15 text-success", icon: CheckCircle2 },
  FAILED: { label: "Failed", cls: "bg-destructive/10 text-destructive", icon: XCircle },
};

export function StatusBadge({ status }: { status: ProcessingStatus }) {
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.cls)}>
      <s.icon className={cn("size-3.5", s.spin && "animate-spin")} aria-hidden />
      {s.label}
    </span>
  );
}
