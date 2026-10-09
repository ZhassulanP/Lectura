import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileSearch, BookOpenText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { StatusBadge } from "@/components/presentations/StatusBadge";
import { GeneratePanel } from "@/components/study/GeneratePanel";
import { MaterialsList } from "@/components/study/MaterialsList";
import { useDeletePresentation, useMaterials, usePresentation, useSlides } from "@/lib/api/queries";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { USE_MOCKS } from "@/lib/api/config";
import { formatBytes, formatDate } from "@/lib/format";

export const Route = createFileRoute("/presentations/$id/")({
  head: () => ({
    meta: [
      { title: "Presentation — Lectura" },
      { name: "description", content: "Extracted slide content and study material generation." },
      { property: "og:title", content: "Presentation — Lectura" },
      {
        property: "og:description",
        content: "Extracted slide content and study material generation.",
      },
    ],
  }),
  component: PresentationDetail,
});

function PresentationDetail() {
  const { id } = Route.useParams();
  const p = usePresentation(id);
  const navigate = useNavigate();
  const deletion = useDeletePresentation(id);
  const ready = p.data?.status === "READY";
  const slides = useSlides(id, ready);
  const materials = useMaterials(id, ready);

  if (p.isPending) return <LoadingState />;
  if (p.isError) return <ErrorState error={p.error} onRetry={() => p.refetch()} />;
  const pres = p.data!;
  const unit = pres.fileType === "PPTX" ? "Slide" : "Page";

  return (
    <div className="space-y-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/presentations">
          <ArrowLeft /> All presentations
        </Link>
      </Button>
      <PageHeader
        eyebrow={pres.subject ?? pres.fileType}
        title={pres.title}
        description={pres.description ?? undefined}
        actions={
          <>
            <StatusBadge status={pres.status} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this presentation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the presentation, extracted text, study materials and quiz
                    attempts. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deletion.isError && <ErrorState error={deletion.error} />}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletion.isPending}>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={deletion.isPending}
                    onClick={() =>
                      deletion.mutate(undefined, {
                        onSuccess: () => navigate({ to: "/presentations" }),
                      })
                    }
                  >
                    {deletion.isPending ? "Deleting…" : "Delete presentation"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
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

      <section id="generate" className="scroll-mt-20 space-y-3" aria-labelledby="gen-h">
        <h2 id="gen-h" className="text-xl font-semibold">
          Generate study materials
        </h2>
        {!ready && (
          <p className="text-sm text-muted-foreground">
            {pres.status === "FAILED"
              ? "Extraction failed, so materials can't be generated."
              : "Available once content extraction finishes."}
          </p>
        )}
        <GeneratePanel presentationId={id} disabled={!ready} />
      </section>

      {ready && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            {USE_MOCKS ? "Sample study materials" : "Generated for this presentation"}
          </h2>
          {materials.isPending ? (
            <LoadingState label="Loading study materials…" />
          ) : materials.isError ? (
            <ErrorState error={materials.error} onRetry={() => materials.refetch()} />
          ) : materials.data &&
            materials.data.notes.length +
              materials.data.quizzes.length +
              materials.data.flashcards.length >
              0 ? (
            <MaterialsList presentationId={id} materials={materials.data} />
          ) : (
            <EmptyState
              icon={BookOpenText}
              title="No study materials yet"
              description="Choose notes, a quiz or flashcards above to get started."
            />
          )}
        </section>
      )}

      <section className="space-y-3" aria-labelledby="content-h">
        <h2 id="content-h" className="text-xl font-semibold">
          Extracted content
        </h2>
        {!ready ? (
          pres.status === "FAILED" ? (
            <ErrorState
              error={new Error(pres.errorMessage ?? "We couldn't extract content from this file.")}
            />
          ) : (
            <LoadingState label="Extracting content — this page updates automatically…" />
          )
        ) : slides.isPending ? (
          <LoadingState label="Loading slides…" />
        ) : slides.isError ? (
          <ErrorState error={slides.error} onRetry={() => slides.refetch()} />
        ) : !slides.data?.length ? (
          <EmptyState
            icon={FileSearch}
            title="No text found"
            description="This file didn't contain extractable text. Scanned slides may need OCR on the server."
          />
        ) : (
          <ol className="space-y-3">
            {slides.data.map((s) => (
              <li
                id={`slide-${s.number}`}
                key={s.number}
                className="scroll-mt-20 grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[5rem_1fr]"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {unit} {s.number}
                </span>
                <div className="min-w-0 break-words">
                  {s.title && <h3 className="text-lg font-semibold">{s.title}</h3>}
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                    {s.content || "No extractable text on this slide / page."}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
