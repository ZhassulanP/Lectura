import type { ReactNode } from "react";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSlides } from "@/lib/api/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="break-words text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center"
    >
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 break-words text-sm">{msg}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function SlideRef({ slides }: { slides: number[] }) {
  const [open, setOpen] = useState(false);
  const presentationId = useRouterState({
    select: (state) =>
      state.matches.find((match) => "id" in match.params)?.params as { id?: string } | undefined,
  })?.id;
  const content = useSlides(presentationId ?? "", open && !!presentationId);
  if (!slides.length) return null;
  const label = slides.length === 1 ? `Slide ${slides[0]}` : `Slides ${slides.join(", ")}`;
  if (!presentationId) return <span className="text-xs text-muted-foreground">{label}</span>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-full shrink-0 rounded-md border bg-muted px-2 py-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Read source ${label.toLowerCase()}`}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Source slides / pages</DialogTitle>
          <DialogDescription>Original extracted text supporting this material.</DialogDescription>
        </DialogHeader>
        {content.isPending ? (
          <LoadingState />
        ) : content.isError ? (
          <ErrorState error={content.error} onRetry={() => content.refetch()} />
        ) : (
          slides.map((number) => {
            const slide = content.data?.find((item) => item.number === number);
            return (
              <section key={number} className="space-y-2 rounded-lg border p-4">
                <h3 className="font-semibold">
                  Slide / page {number}
                  {slide?.title ? ` — ${slide.title}` : ""}
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {slide?.content || "Source text is unavailable."}
                </p>
              </section>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
}
