import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";
import { useMaterials } from "@/lib/api/queries";

export const Route = createFileRoute("/presentations/$id/flashcards/$deckId")({
  head: () => ({
    meta: [
      { title: "Flashcards — SlideWise" },
      { name: "description", content: "Flip through key concepts from your lecture." },
      { property: "og:title", content: "Flashcards — SlideWise" },
      { property: "og:description", content: "Flip through key concepts from your lecture." },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { id, deckId } = Route.useParams();
  const m = useMaterials(id);
  if (m.isLoading) return <LoadingState />;
  if (m.isError) return <ErrorState error={m.error} onRetry={() => m.refetch()} />;
  const deck = m.data?.flashcards.find((d) => d.id === deckId);
  if (!deck || !deck.cards.length) return <ErrorState error={new Error("This flashcard deck couldn't be found.")} />;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/presentations/$id" params={{ id }}><ArrowLeft /> Back to presentation</Link>
      </Button>
      <PageHeader eyebrow={`${deck.cards.length} cards`} title="Flashcards" />
      <FlashcardViewer deck={deck} />
    </div>
  );
}
