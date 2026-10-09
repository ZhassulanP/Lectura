import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { StatusBadge } from "@/components/presentations/StatusBadge";
import { GeneratePanel } from "@/components/study/GeneratePanel";
import { MaterialsList } from "@/components/study/MaterialsList";
import { useMaterials, usePresentation, useSlides } from "@/lib/api/queries";
import { formatBytes, formatDate } from "@/lib/format";

export const Route = createFileRoute("/presentations/$id/")({
  head: () => ({
    meta: [
      { title: "Presentation — SlideWise" },
      { name: "description", content: "Extracted slide content and study material generation." },
      { property: "og:title", content: "Presentation — SlideWise" },
      { property: "og:description", content: "Extracted slide content and study material generation." },
    ],
  }),
  component: PresentationDetail,
});

function PresentationDetail() {
  const { id } = Route.useParams();
  const p = usePresentation(id);
  const ready = p.data?.status === "READY";
  const slides = useSlides(id, ready);
  const materials = useMaterials(id);

  if (p.isLoading) return <LoadingState />;
  if (p.isError) return <ErrorState error={p.error} onRetry={() => p.refetch()} />;
  const pres = p.data!;
  const unit = pres.fileType === "PPTX" ? "Slide" : "Page";

  return (
    <div className="space-y-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/presentations"><ArrowLeft /> All presentations</Link>
      </Button>
      <PageHeader
        eyebrow={pres.subject ?? pres.fileType}
        title={pres.title}
        description={pres.description ?? undefined}
        actions={<StatusBadge status={pres.status} />}
      />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["File", pres.filename],
          [pres.fileType === "PPTX" ? "Slides" : "Pages", pres.slideCount ?? "—"],
          ["Size", formatBytes(pres.fileSizeBytes)],
          ["Uploaded", formatDate(pres.uploadedAt)],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="truncate text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="gen-h">
        <h2 id="gen-h" className="text-xl font-semibold">Generate study materials</h2>
        {!ready && (
          <p className="text-sm text-muted-foreground">
            {pres.status === "FAILED" ? "Extraction failed, so materials can't be generated." : "Available once content extraction finishes."}
          </p>
        )}
        <GeneratePanel presentationId={id} disabled={!ready} />
      </section>

      {materials.data && (materials.data.notes.length + materials.data.quizzes.length + materials.data.flashcards.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Generated for this presentation</h2>
          <MaterialsList presentationId={id} materials={materials.data} />
        </section>
      )}

      <section className="space-y-3" aria-labelledby="content-h">
        <h2 id="content-h" className="text-xl font-semibold">Extracted content</h2>
        {!ready ? (
          pres.status === "FAILED" ? (
            <ErrorState error={new Error(pres.errorMessage ?? "We couldn't extract content from this file.")} />
          ) : (
            <LoadingState label="Extracting content — this page updates automatically…" />
          )
        ) : slides.isLoading ? (
          <LoadingState label="Loading slides…" />
        ) : slides.isError ? (
          <ErrorState error={slides.error} onRetry={() => slides.refetch()} />
        ) : !slides.data?.length ? (
          <EmptyState icon={FileSearch} title="No text found" description="This file didn't contain extractable text. Scanned slides may need OCR on the server." />
        ) : (
          <ol className="space-y-3">
            {slides.data.map((s) => (
              <li key={s.number} className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[5rem_1fr]">
                <span className="font-mono text-xs text-muted-foreground">{unit} {s.number}</span>
                <div>
                  {s.title && <h3 className="text-lg font-semibold">{s.title}</h3>}
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{s.content}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
