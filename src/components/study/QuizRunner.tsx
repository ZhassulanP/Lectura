import { useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SlideRef } from "@/components/common/States";
import { useSubmitAttempt } from "@/lib/api/queries";
import type { Quiz, QuizAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const submit = useSubmitAttempt(quiz.presentationId, quiz.id);

  const q = quiz.questions[index];
  const answered = quiz.questions.filter((x) => answers[x.id]?.trim()).length;
  const set = (v: string) => setAnswers((a) => ({ ...a, [q.id]: v }));

  const onSubmit = () =>
    submit.mutate(
      quiz.questions.map((x) => ({ questionId: x.id, answer: answers[x.id]?.trim() || null })),
      { onSuccess: setResult, onError: (e) => toast.error(e.message) },
    );

  if (result) {
    return (
      <QuizResults
        quiz={quiz}
        attempt={result}
        onRetry={() => {
          setResult(null);
          setAnswers({});
          setIndex(0);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {index + 1} of {quiz.questions.length}</span>
          <span>{answered} answered</span>
        </div>
        <Progress value={((index + 1) / quiz.questions.length) * 100} aria-label="Quiz progress" />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold">{q.prompt}</h2>
          <SlideRef slides={q.sourceSlides} />
        </div>
        <div className="mt-6">
          {q.type === "MULTIPLE_CHOICE" && q.options ? (
            <div role="radiogroup" aria-label="Answer options" className="grid gap-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set(opt)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <span className={cn("grid size-6 place-items-center rounded-full border font-mono text-xs", selected && "border-primary bg-primary text-primary-foreground")}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={`ans-${q.id}`}>Your answer</Label>
              <Input id={`ans-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => set(e.target.value)} placeholder="Type your answer" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</Button>
        <div className="flex gap-2">
          {index < quiz.questions.length - 1 && (
            <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>Next</Button>
          )}
          <Button onClick={onSubmit} disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="animate-spin" />}
            Submit{answered < quiz.questions.length ? ` (${quiz.questions.length - answered} unanswered)` : ""}
          </Button>
        </div>
      </div>

      <nav aria-label="Jump to question" className="flex flex-wrap gap-1.5">
        {quiz.questions.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answers[x.id] ? ", answered" : ", unanswered"}`}
            aria-current={i === index}
            className={cn(
              "size-8 rounded-md border font-mono text-xs",
              answers[x.id]?.trim() ? "bg-secondary text-secondary-foreground" : "border-dashed text-muted-foreground",
              i === index && "ring-2 ring-ring",
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>
    </div>
  );
}

function QuizResults({ quiz, attempt, onRetry }: { quiz: Quiz; attempt: QuizAttempt; onRetry: () => void }) {
  const pct = Math.round((attempt.score / attempt.total) * 100);
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your score</p>
          <p className="font-display text-5xl font-semibold">{attempt.score}<span className="text-2xl text-muted-foreground"> / {attempt.total}</span></p>
          <p className="text-sm text-muted-foreground">{pct}% correct</p>
        </div>
        <Button onClick={onRetry}><RotateCcw /> Try again</Button>
      </div>
      <ol className="space-y-3">
        {quiz.questions.map((q, i) => {
          const r = attempt.results.find((x) => x.questionId === q.id);
          if (!r) return null;
          const unanswered = r.givenAnswer == null;
          const Icon = unanswered ? CircleDashed : r.correct ? CheckCircle2 : XCircle;
          return (
            <li key={q.id} className={cn("rounded-xl border bg-card p-5", r.correct ? "border-success/40" : unanswered ? "border-dashed" : "border-destructive/40")}>
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-5 shrink-0", r.correct ? "text-success" : unanswered ? "text-muted-foreground" : "text-destructive")} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{i + 1}. {q.prompt}</p>
                    <SlideRef slides={q.sourceSlides} />
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Your answer: </span>
                    {unanswered ? <em className="text-muted-foreground">Not answered</em> : r.givenAnswer}
                  </p>
                  {!r.correct && <p className="text-sm"><span className="text-muted-foreground">Correct answer: </span><strong>{r.correctAnswer}</strong></p>}
                  {r.explanation && <p className="text-sm text-muted-foreground">{r.explanation}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
