import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Presentation, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { PresentationList } from "@/components/presentations/PresentationList";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { usePresentations } from "@/lib/api/queries";

export const Route = createFileRoute("/presentations/")({
  head: () => ({
    meta: [
      { title: "My Presentations — SlideWise" },
      { name: "description", content: "All your uploaded lecture decks and their processing status." },
      { property: "og:title", content: "My Presentations — SlideWise" },
      { property: "og:description", content: "All your uploaded lecture decks and their processing status." },
    ],
  }),
  component: PresentationsPage,
});

function PresentationsPage() {
  const q = usePresentations();
  const [showUpload, setShowUpload] = useState(false);
  return (
    <div className="space-y-8">
      <PageHeader
        title="My Presentations"
        description="Every deck you've uploaded, with its extraction status."
        actions={<Button onClick={() => setShowUpload((s) => !s)}><Upload /> {showUpload ? "Hide upload" : "Upload presentation"}</Button>}
      />
      {showUpload && <UploadPanel id="list-upload" />}
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={Presentation} title="Nothing here yet" description="Upload a PDF or PowerPoint to get started." action={<Button onClick={() => setShowUpload(true)}>Upload presentation</Button>} />
      ) : (
        <PresentationList items={q.data} />
      )}
    </div>
  );
}
