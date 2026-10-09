import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { QuizRunner } from "@/components/study/QuizRunner";
import { useMaterials } from "@/lib/api/queries";

export const Route = createFileRoute("/presentations/$id/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "Quiz — SlideWise" },
      { name: "description", content: "Test your understanding of the lecture slides." },
      { property: "og:title", content: "Quiz — SlideWise" },
      { property: "og:description", content: "Test your understanding of the lecture slides." },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { id, quizId } = Route.useParams();
  const m = useMaterials(id);
  if (m.isLoading) return <LoadingState />;
  if (m.isError) return <ErrorState error={m.error} onRetry={() => m.refetch()} />;
  const quiz = m.data?.quizzes.find((q) => q.id === quizId);
  if (!quiz) return <ErrorState error={new Error("This quiz couldn't be found.")} />;
  if (!quiz.questions.length) return <ErrorState error={new Error("This quiz has no questions.")} />;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/presentations/$id" params={{ id }}><ArrowLeft /> Back to presentation</Link>
      </Button>
      <PageHeader eyebrow={`${quiz.difficulty.toLowerCase()} · ${quiz.questions.length} questions`} title="Quiz" />
      <QuizRunner quiz={quiz} />
    </div>
  );
}
