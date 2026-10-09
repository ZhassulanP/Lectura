import { Link } from "@tanstack/react-router";
import { BookOpenText, Layers, ListChecks } from "lucide-react";
import type { StudyMaterials } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export function MaterialsList({
  presentationId,
  materials,
}: {
  presentationId: string;
  materials: StudyMaterials;
}) {
  const rows = [
    ...materials.notes.map((n) => ({
      key: n.id,
      icon: BookOpenText,
      label: "Study notes",
      meta: `${n.sections.length} sections`,
      at: n.createdAt,
      link: (
        <Link
          to="/presentations/$id/notes/$notesId"
          params={{ id: presentationId, notesId: n.id }}
          className="font-medium hover:underline"
        >
          Study notes
        </Link>
      ),
    })),
    ...materials.quizzes.map((q) => {
      const attempts = materials.attempts.filter((a) => a.quizId === q.id);
      const best = attempts.length
        ? Math.max(...attempts.map((a) => Math.round((a.score / a.total) * 100)))
        : null;
      return {
        key: q.id,
        icon: ListChecks,
        label: "Quiz",
        at: q.createdAt,
        meta: `${q.questions.length} questions · ${q.difficulty.toLowerCase()} · ${attempts.length ? `${attempts.length} attempt${attempts.length > 1 ? "s" : ""}, best ${best}%` : "not attempted"}`,
        link: (
          <Link
            to="/presentations/$id/quiz/$quizId"
            params={{ id: presentationId, quizId: q.id }}
            className="font-medium hover:underline"
          >
            Quiz
          </Link>
        ),
      };
    }),
    ...materials.flashcards.map((d) => ({
      key: d.id,
      icon: Layers,
      label: "Flashcards",
      meta: `${d.cards.length} cards`,
      at: d.createdAt,
      link: (
        <Link
          to="/presentations/$id/flashcards/$deckId"
          params={{ id: presentationId, deckId: d.id }}
          className="font-medium hover:underline"
        >
          Flashcards
        </Link>
      ),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (!rows.length) return null;
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3 px-4 py-3">
          <r.icon className="size-4 text-primary" />
          <div className="min-w-0 flex-1">
            {r.link}
            <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatDateTime(r.at)}</span>
        </li>
      ))}
    </ul>
  );
}
