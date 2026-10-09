import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenText, Layers, ListChecks, Presentation, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { PresentationList } from "@/components/presentations/PresentationList";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { usePresentations } from "@/lib/api/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SlideWise" },
      { name: "description", content: "Upload lecture slides and turn them into notes, quizzes and flashcards." },
      { property: "og:title", content: "SlideWise Dashboard" },
      { property: "og:description", content: "Upload lecture slides and turn them into notes, quizzes and flashcards." },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { icon: BookOpenText, title: "Generate notes", text: "Structured summaries with slide references." },
  { icon: ListChecks, title: "Create quiz", text: "Multiple choice and short answer, your difficulty." },
  { icon: Layers, title: "Create flashcards", text: "Flip, shuffle and track what you know." },
];

function Dashboard() {
  const q = usePresentations();
  const ready = q.data?.find((p) => p.status === "READY");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Welcome back"
        title={<>Study smarter from your <span className="highlight-mark">slides</span></>}
        description="Upload a lecture deck and SlideWise builds notes, quizzes and flashcards grounded in what's actually on the slides."
        actions={
          <Button size="lg" onClick={() => document.getElementById("dash-upload")?.scrollIntoView({ behavior: "smooth" })}>
            <Upload /> Upload presentation
          </Button>
        }
      />

      <section aria-labelledby="upload-h" className="space-y-3">
        <h2 id="upload-h" className="text-xl font-semibold">Upload</h2>
        <UploadPanel id="dash-upload" />
      </section>

      <section aria-labelledby="qa-h" className="space-y-3">
        <h2 id="qa-h" className="text-xl font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((a) => {
            const inner = (
              <>
                <a.icon className="size-5 text-primary" />
                <p className="mt-3 font-medium">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                {!ready && <p className="mt-3 text-xs text-muted-foreground">Upload a presentation first</p>}
              </>
            );
            return ready ? (
              <Link key={a.title} to="/presentations/$id" params={{ id: ready.id }} className="rounded-xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {inner}
              </Link>
            ) : (
              <div key={a.title} aria-disabled className="rounded-xl border bg-card/60 p-5 opacity-70">{inner}</div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recent-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-h" className="text-xl font-semibold">Recent presentations</h2>
          {!!q.data?.length && (
            <Button asChild variant="link"><Link to="/presentations">View all</Link></Button>
          )}
        </div>
        {q.isLoading ? (
          <LoadingState label="Loading presentations…" />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data?.length ? (
          <EmptyState icon={Presentation} title="No presentations yet" description="Drop your first lecture deck above. Once its content is extracted you can generate study materials." />
        ) : (
          <PresentationList items={q.data.slice(0, 5)} />
        )}
      </section>
    </div>
  );
}
