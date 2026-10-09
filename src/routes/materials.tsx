import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenText, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { MaterialsList } from "@/components/study/MaterialsList";
import { useMaterialGroups, usePresentations } from "@/lib/api/queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/materials")({
  head: () => ({
    meta: [
      { title: "Study Materials — Lectura" },
      {
        name: "description",
        content: "Your generated notes, quizzes, flashcards and quiz history.",
      },
      { property: "og:title", content: "Study Materials — Lectura" },
      {
        property: "og:description",
        content: "Your generated notes, quizzes, flashcards and quiz history.",
      },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const pres = usePresentations();
  const ready = (pres.data ?? []).filter((p) => p.status === "READY");
  const mats = useMaterialGroups(ready.map((p) => p.id));

  if (pres.isPending || mats.some((m) => m.isPending)) return <LoadingState />;
  if (pres.isError) return <ErrorState error={pres.error} onRetry={() => pres.refetch()} />;
  const err = mats.find((m) => m.isError);

  const groups = ready
    .map((p, i) => ({ p, m: mats[i]?.data }))
    .filter((g) => g.m && g.m.notes.length + g.m.quizzes.length + g.m.flashcards.length > 0);

  const attempts = groups
    .flatMap(({ p, m }) => m!.attempts.map((a) => ({ ...a, presentation: p })))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Study Materials"
        description="Everything you've generated, grouped by presentation."
      />
      {err && (
        <ErrorState
          error={err.error}
          onRetry={() => {
            mats.filter((m) => m.isError).forEach((m) => m.refetch());
          }}
        />
      )}
      {!groups.length && !err ? (
        <EmptyState
          icon={BookOpenText}
          title="No study materials yet"
          description="Open a presentation and generate notes, a quiz or flashcards. They'll be collected here."
          action={
            <Button asChild>
              <Link to="/presentations">Go to presentations</Link>
            </Button>
          }
        />
      ) : (
        groups.map(({ p, m }) => (
          <section key={p.id} className="space-y-3">
            <Link
              to="/presentations/$id"
              params={{ id: p.id }}
              className="text-xl font-semibold hover:underline font-display"
            >
              {p.title}
            </Link>
            <MaterialsList presentationId={p.id} materials={m!} />
          </section>
        ))
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quiz attempts</h2>
        {!attempts.length ? (
          <EmptyState
            icon={Trophy}
            title="No attempts yet"
            description="Finish a quiz to see your scores here."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="w-14 font-display text-2xl font-semibold">
                  {a.total ? Math.round((a.score / a.total) * 100) : 0}%
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/presentations/$id/quiz/$quizId"
                    params={{ id: a.presentation.id, quizId: a.quizId }}
                    className="font-medium hover:underline"
                  >
                    {a.presentation.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.score} of {a.total} correct
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(a.submittedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
