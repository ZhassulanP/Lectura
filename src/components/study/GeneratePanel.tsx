import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpenText, Layers, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateFlashcards, useGenerateNotes, useGenerateQuiz } from "@/lib/api/queries";
import { USE_MOCKS } from "@/lib/api/config";
import { ErrorState } from "@/components/common/States";
import type { Difficulty } from "@/lib/types";

export function GeneratePanel({
  presentationId,
  disabled,
}: {
  presentationId: string;
  disabled: boolean;
}) {
  const navigate = useNavigate();
  const notes = useGenerateNotes(presentationId);
  const quiz = useGenerateQuiz(presentationId);
  const cards = useGenerateFlashcards(presentationId);
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const fail = (e: Error) => toast.error(e.message);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card
        icon={BookOpenText}
        title="Study notes"
        text="Headings, definitions, formulas and examples."
      >
        <Button
          className="w-full"
          disabled={disabled || notes.isPending}
          onClick={() =>
            notes.mutate(undefined, {
              onSuccess: (n) =>
                navigate({
                  to: "/presentations/$id/notes/$notesId",
                  params: { id: presentationId, notesId: n.id },
                }),
              onError: fail,
            })
          }
        >
          {notes.isPending && <Loader2 className="animate-spin" />}{" "}
          {notes.isPending
            ? USE_MOCKS
              ? "Loading sample…"
              : "Generating…"
            : USE_MOCKS
              ? "Load sample notes"
              : "Generate notes"}
        </Button>
        {notes.isError && <ErrorState error={notes.error} />}
      </Card>

      <Card icon={ListChecks} title="Quiz" text="Test yourself one question at a time.">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="q-count" className="text-xs">
              Questions
            </Label>
            <Select disabled={disabled || quiz.isPending} value={count} onValueChange={setCount}>
              <SelectTrigger id="q-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "10", "15", "20"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="q-diff" className="text-xs">
              Difficulty
            </Label>
            <Select
              disabled={disabled || quiz.isPending}
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
            >
              <SelectTrigger id="q-diff">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={disabled || quiz.isPending}
          onClick={() =>
            quiz.mutate(
              { questionCount: Number(count), difficulty },
              {
                onSuccess: (q) =>
                  navigate({
                    to: "/presentations/$id/quiz/$quizId",
                    params: { id: presentationId, quizId: q.id },
                  }),
                onError: fail,
              },
            )
          }
        >
          {quiz.isPending && <Loader2 className="animate-spin" />}{" "}
          {quiz.isPending
            ? USE_MOCKS
              ? "Loading sample…"
              : "Generating…"
            : USE_MOCKS
              ? "Load sample quiz"
              : "Create quiz"}
        </Button>
        {quiz.isError && <ErrorState error={quiz.error} />}
      </Card>

      <Card icon={Layers} title="Flashcards" text="Key concepts on flippable cards.">
        <Button
          className="w-full"
          disabled={disabled || cards.isPending}
          onClick={() =>
            cards.mutate(undefined, {
              onSuccess: (d) =>
                navigate({
                  to: "/presentations/$id/flashcards/$deckId",
                  params: { id: presentationId, deckId: d.id },
                }),
              onError: fail,
            })
          }
        >
          {cards.isPending && <Loader2 className="animate-spin" />}{" "}
          {cards.isPending
            ? USE_MOCKS
              ? "Loading sample…"
              : "Generating…"
            : USE_MOCKS
              ? "Load sample flashcards"
              : "Create flashcards"}
        </Button>
        {cards.isError && <ErrorState error={cards.error} />}
      </Card>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof Layers;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-soft">
      <div>
        <Icon className="size-5 text-primary" />
        <p className="mt-3 font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="mt-auto space-y-3">{children}</div>
    </div>
  );
}
