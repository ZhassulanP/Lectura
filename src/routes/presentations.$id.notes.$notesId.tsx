import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader, SlideRef } from "@/components/common/States";
import { useMaterials } from "@/lib/api/queries";
import { slideRefs } from "@/lib/format";
import type { StudyNotes } from "@/lib/types";
import { USE_MOCKS } from "@/lib/api/config";

export const Route = createFileRoute("/presentations/$id/notes/$notesId")({
  head: () => ({
    meta: [
      { title: "Study notes — Lectura" },
      { name: "description", content: "Structured study notes with source-slide references." },
      { property: "og:title", content: "Study notes — Lectura" },
      {
        property: "og:description",
        content: "Structured study notes with source-slide references.",
      },
    ],
  }),
  component: NotesPage,
});

function toMarkdown(n: StudyNotes) {
  return [
    `# ${n.title}`,
    USE_MOCKS ? "Sample content — not AI generated and not extracted from your files." : "",
    n.overview ?? "",
    ...n.sections.map((s) =>
      [
        `\n## ${s.heading}`,
        s.sourceSlides.length ? `_${slideRefs(s.sourceSlides)}_` : "",
        `\n${s.summary}`,
        s.definitions?.length
          ? `\n**Definitions**\n${s.definitions.map((d) => `- **${d.term}** — ${d.definition}`).join("\n")}`
          : "",
        s.formulas?.length
          ? `\n**Formulas**\n${s.formulas.map((f) => `- \`${f}\``).join("\n")}`
          : "",
        s.examples?.length ? `\n**Examples**\n${s.examples.map((e) => `- ${e}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n");
}

function NotesPage() {
  const { id, notesId } = Route.useParams();
  const m = useMaterials(id);
  if (m.isPending) return <LoadingState />;
  if (m.isError) return <ErrorState error={m.error} onRetry={() => m.refetch()} />;
  const notes = m.data?.notes.find((n) => n.id === notesId);
  if (!notes) return <ErrorState error={new Error("These notes couldn't be found.")} />;

  const md = toMarkdown(notes);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Notes copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notes.title.replace(/[^\w-]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/presentations/$id" params={{ id }}>
          <ArrowLeft /> Back to presentation
        </Link>
      </Button>
      <PageHeader
        eyebrow="Study notes"
        title={notes.title}
        actions={
          <>
            <Button variant="outline" onClick={copy}>
              <Copy /> Copy
            </Button>
            <Button variant="outline" onClick={download}>
              <Download /> Markdown
            </Button>
          </>
        }
      />
      {notes.overview && (
        <p className="max-w-prose whitespace-pre-wrap leading-relaxed">{notes.overview}</p>
      )}
      <div className="space-y-6">
        {notes.sections.map((s, i) => (
          <section
            key={i}
            className="grid gap-4 rounded-xl border bg-card p-6 shadow-soft md:grid-cols-[1fr_8rem]"
          >
            <div className="min-w-0 max-w-prose break-words space-y-4 text-[15px] leading-7">
              <h2 className="text-2xl font-semibold">{s.heading}</h2>
              <p>{s.summary}</p>
              {!!s.definitions?.length && (
                <dl className="space-y-2 rounded-lg bg-secondary/60 p-4">
                  {s.definitions.map((d) => (
                    <div key={d.term}>
                      <dt className="font-semibold">{d.term}</dt>
                      <dd className="text-muted-foreground">{d.definition}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {!!s.formulas?.length && (
                <div className="flex flex-wrap gap-2">
                  {s.formulas.map((f) => (
                    <code
                      key={f}
                      className="max-w-full whitespace-pre-wrap break-words rounded-md border bg-muted px-3 py-1.5 font-mono text-sm"
                    >
                      {f}
                    </code>
                  ))}
                </div>
              )}
              {!!s.examples?.length && (
                <div className="border-l-4 border-highlight pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Example
                  </p>
                  {s.examples.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
            </div>
            <aside className="md:text-right">
              <SlideRef slides={s.sourceSlides} />
            </aside>
          </section>
        ))}
      </div>
    </article>
  );
}
