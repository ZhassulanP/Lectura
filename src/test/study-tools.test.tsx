import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";
import { QuizRunner } from "@/components/study/QuizRunner";
import { api } from "@/lib/api";
import type { FlashcardDeck, Quiz, QuizAttempt } from "@/lib/types";

vi.mock("@/components/common/States", () => ({
  SlideRef: ({ slides }: { slides: number[] }) => <button>Source {slides.join(",")}</button>,
  ErrorState: ({ error }: { error: Error }) => <p role="alert">{error.message}</p>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const quiz: Quiz = {
  id: "quiz",
  presentationId: "presentation",
  createdAt: "2026-01-01T00:00:00Z",
  difficulty: "MEDIUM",
  questions: [
    {
      id: "mcq",
      type: "MULTIPLE_CHOICE",
      prompt: "Choose an option",
      options: ["First", "Second"],
      sourceSlides: [1],
    },
    { id: "short", type: "SHORT_ANSWER", prompt: "Write an answer", sourceSlides: [2] },
  ],
};
const attempt: QuizAttempt = {
  id: "attempt",
  quizId: quiz.id,
  submittedAt: quiz.createdAt,
  score: 1,
  total: 2,
  results: [
    {
      questionId: "mcq",
      givenAnswer: "First",
      correct: true,
      correctAnswer: "First",
      explanation: "Explanation",
      sourceSlides: [1],
    },
    {
      questionId: "short",
      givenAnswer: null,
      correct: false,
      correctAnswer: "Expected",
      explanation: "Reason",
      sourceSlides: [2],
    },
  ],
};

function renderQuiz(attempts: QuizAttempt[] = []) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <QuizRunner quiz={quiz} attempts={attempts} />
    </QueryClientProvider>,
  );
}

describe("Quiz interactions", () => {
  it("keeps selected answers across navigation and sends unanswered questions as null", async () => {
    const submit = vi.spyOn(api, "submitAttempt").mockResolvedValue(attempt);
    renderQuiz();
    fireEvent.click(screen.getByRole("radio", { name: /First/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("radio", { name: /First/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    await screen.findByText("Expected");
    expect(submit).toHaveBeenCalledWith("quiz", [
      { questionId: "mcq", answer: "First" },
      { questionId: "short", answer: null },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("radio", { name: /First/ })).not.toBeChecked();
  });

  it("shows submission failures and keeps the user's answer", async () => {
    vi.spyOn(api, "submitAttempt").mockRejectedValue(new Error("Server unavailable"));
    renderQuiz();
    fireEvent.click(screen.getByRole("radio", { name: /Second/ }));
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
    expect(screen.getByRole("radio", { name: /Second/ })).toBeChecked();
  });

  it("reviews a saved attempt without submitting or regenerating", () => {
    const submit = vi.spyOn(api, "submitAttempt");
    renderQuiz([attempt]);
    fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("Flashcard interactions", () => {
  it("flips, marks and resets without nesting source buttons inside the card", () => {
    const deck: FlashcardDeck = {
      id: "deck",
      presentationId: "presentation",
      createdAt: quiz.createdAt,
      cards: [
        { id: "one", front: "First concept", back: "First answer", sourceSlides: [1] },
        { id: "two", front: "Second concept", back: "Second answer", sourceSlides: [2] },
      ],
    };
    render(<FlashcardViewer deck={deck} />);
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(
      screen
        .getByRole("button", { name: "Source 1" })
        .closest('button[aria-label="Show front of card"]'),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Know it" }));
    expect(screen.getByText("Card 2 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review again" }));
    expect(screen.getByRole("status")).toHaveTextContent("Deck complete");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Card 1 of 2")).toBeInTheDocument();
  });
});
