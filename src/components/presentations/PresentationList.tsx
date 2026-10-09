import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Presentation as PptIcon } from "lucide-react";
import type { Presentation } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function PresentationList({ items }: { items: Presentation[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
      {items.map((p) => {
        const Icon = p.fileType === "PPTX" ? PptIcon : FileText;
        return (
          <li key={p.id}>
            <Link
              to="/presentations/$id"
              params={{ id: p.id }}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.filename} · {formatDate(p.uploadedAt)}
                  {p.slideCount != null &&
                    ` · ${p.slideCount} ${p.fileType === "PPTX" ? "slide" : "page"}${p.slideCount === 1 ? "" : "s"}`}
                  {p.subject && ` · ${p.subject}`}
                </p>
                <div className="mt-2 sm:hidden">
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <div className="hidden sm:block">
                <StatusBadge status={p.status} />
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
