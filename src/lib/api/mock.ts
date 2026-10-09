/**
 * DEVELOPMENT MOCK BACKEND — sample data only, NOT AI-generated.
 * Used when VITE_USE_MOCKS !== "false". Mirrors the real API's shapes.
 */
import type {
  FlashcardDeck,
  Presentation,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizOptions,
  Slide,
  StudyMaterials,
  StudyNotes,
  UploadInput,
} from "../types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const sampleSlides: Slide[] = [
  {
    number: 1,
    title: "Introduction to Thermodynamics",
    content:
      "Course overview. Systems, surroundings and boundaries. Why energy accounting matters.",
  },
  {
    number: 2,
    title: "The First Law",
    content: "Energy is conserved. ΔU = Q − W. Internal energy is a state function.",
  },
  {
    number: 3,
    title: "Work and Heat",
    content:
      "Work: energy transfer by macroscopic force. Heat: transfer due to temperature difference. Sign conventions.",
  },
  {
    number: 4,
    title: "Entropy",
    content:
      "Entropy as a measure of dispersal. dS = δQ_rev / T. Second law: total entropy of an isolated system never decreases.",
  },
  {
    number: 5,
    title: "Carnot Engine",
    content:
      "Ideal reversible cycle. Efficiency η = 1 − T_c / T_h. No real engine exceeds Carnot efficiency.",
  },
];

const mockQuizAnswers: Record<string, { correct: string; explanation: string }> = {};

const db: {
  presentations: Presentation[];
  slides: Record<string, Slide[]>;
  materials: Record<string, StudyMaterials>;
} = {
  presentations: [
    {
      id: "demo-thermo",
      title: "Thermodynamics — Lecture 3",
      filename: "thermo-lecture-03.pdf",
      fileType: "PDF",
      fileSizeBytes: 2_480_000,
      uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      slideCount: sampleSlides.length,
      status: "READY",
      subject: "Physics 201",
      description: "Laws of thermodynamics and heat engines",
    },
  ],
  slides: { "demo-thermo": sampleSlides },
  materials: {},
};

function materialsFor(id: string): StudyMaterials {
  return (db.materials[id] ??= { notes: [], quizzes: [], flashcards: [], attempts: [] });
}

function find(id: string) {
  const p = db.presentations.find((x) => x.id === id);
  if (!p) throw new Error("Presentation not found");
  return p;
}

export const mockApi = {
  async listPresentations() {
    await wait(300);
    return [...db.presentations].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },

  async getPresentation(id: string) {
    await wait(200);
    return { ...find(id) };
  },

  async getSlides(id: string) {
    await wait(250);
    return db.slides[id] ?? [];
  },

  async upload(input: UploadInput, onProgress: (pct: number) => void): Promise<Presentation> {
    throw new Error(
      "Demo mode cannot upload or extract your file. Connect the backend to upload presentations.",
    );
  },

  async deletePresentation(id: string): Promise<void> {
    find(id);
    db.presentations = db.presentations.filter((p) => p.id !== id);
    delete db.slides[id];
    delete db.materials[id];
  },

  async generateNotes(id: string): Promise<StudyNotes> {
    await wait(1200);
    const p = find(id);
    const notes: StudyNotes = {
      id: uid(),
      presentationId: id,
      createdAt: now(),
      title: `${p.title} — Notes`,
      sections: [
        {
          heading: "The First Law of Thermodynamics",
          summary:
            "Energy cannot be created or destroyed; changes in internal energy equal heat added minus work done by the system.",
          definitions: [
            {
              term: "Internal energy (U)",
              definition: "Total microscopic energy of a system; a state function.",
            },
          ],
          formulas: ["ΔU = Q − W"],
          examples: [
            "Gas heated in a piston: some heat raises U, the rest does work pushing the piston.",
          ],
          sourceSlides: [2, 3],
        },
        {
          heading: "Entropy and the Second Law",
          summary: "Entropy quantifies energy dispersal. In an isolated system it never decreases.",
          definitions: [
            {
              term: "Entropy (S)",
              definition: "State function; reversible change dS = δQ_rev / T.",
            },
          ],
          formulas: ["dS = δQ_rev / T"],
          sourceSlides: [4],
        },
        {
          heading: "Carnot Efficiency",
          summary:
            "The Carnot cycle sets the upper limit on heat engine efficiency between two reservoirs.",
          formulas: ["η = 1 − T_c / T_h"],
          examples: ["T_h = 500 K, T_c = 300 K → η = 40%."],
          sourceSlides: [5],
        },
      ],
    };
    materialsFor(id).notes.unshift(notes);
    return notes;
  },

  async generateQuiz(id: string, opts: QuizOptions): Promise<Quiz> {
    find(id);
    await wait(1200);
    const bank = [
      {
        type: "MULTIPLE_CHOICE" as const,
        prompt: "Which expression states the first law?",
        options: ["ΔU = Q − W", "ΔS ≥ 0", "PV = nRT", "η = 1 − T_c/T_h"],
        correct: "ΔU = Q − W",
        explanation: "The first law is energy conservation: ΔU = Q − W.",
        src: [2],
      },
      {
        type: "MULTIPLE_CHOICE" as const,
        prompt: "The Carnot efficiency depends on…",
        options: ["Working fluid", "Reservoir temperatures", "Engine size", "Pressure"],
        correct: "Reservoir temperatures",
        explanation: "η = 1 − T_c/T_h depends only on the two temperatures.",
        src: [5],
      },
      {
        type: "SHORT_ANSWER" as const,
        prompt: "Name the quantity that never decreases in an isolated system.",
        correct: "Entropy",
        explanation: "The second law: total entropy of an isolated system never decreases.",
        src: [4],
      },
      {
        type: "MULTIPLE_CHOICE" as const,
        prompt: "Heat is energy transferred due to…",
        options: ["A force", "A temperature difference", "Mass flow", "Pressure"],
        correct: "A temperature difference",
        explanation: "Heat flows because of a temperature difference.",
        src: [3],
      },
      {
        type: "SHORT_ANSWER" as const,
        prompt: "Internal energy is a ___ function.",
        correct: "State",
        explanation: "U depends only on the state, not the path.",
        src: [2],
      },
    ];
    const questions = Array.from({ length: opts.questionCount }, (_, i) => {
      const b = bank[i % bank.length]!;
      const qid = uid();
      mockQuizAnswers[qid] = { correct: b.correct, explanation: b.explanation };
      return {
        id: qid,
        type: b.type,
        prompt: b.prompt,
        ...(b.options ? { options: b.options } : {}),
        sourceSlides: b.src,
      };
    });
    const quiz: Quiz = {
      id: uid(),
      presentationId: id,
      createdAt: now(),
      difficulty: opts.difficulty,
      questions,
    };
    materialsFor(id).quizzes.unshift(quiz);
    return quiz;
  },

  async generateFlashcards(id: string): Promise<FlashcardDeck> {
    find(id);
    await wait(1000);
    const deck: FlashcardDeck = {
      id: uid(),
      presentationId: id,
      createdAt: now(),
      cards: [
        {
          id: uid(),
          front: "First law of thermodynamics",
          back: "ΔU = Q − W — energy is conserved.",
          sourceSlides: [2],
        },
        {
          id: uid(),
          front: "Entropy",
          back: "Measure of energy dispersal; dS = δQ_rev / T.",
          sourceSlides: [4],
        },
        {
          id: uid(),
          front: "Carnot efficiency",
          back: "η = 1 − T_c / T_h, the maximum possible efficiency.",
          sourceSlides: [5],
        },
        {
          id: uid(),
          front: "Heat vs. work",
          back: "Heat: transfer by temperature difference. Work: transfer by macroscopic force.",
          sourceSlides: [3],
        },
      ],
    };
    materialsFor(id).flashcards.unshift(deck);
    return deck;
  },

  async getMaterials(id: string) {
    await wait(250);
    find(id);
    return structuredClone(materialsFor(id));
  },

  async submitAttempt(quizId: string, answers: QuizAnswer[]): Promise<QuizAttempt> {
    await wait(600);
    const results = answers.map((a) => {
      const key = mockQuizAnswers[a.questionId] ?? { correct: "—", explanation: "" };
      const correct = !!a.answer && a.answer.trim().toLowerCase() === key.correct.toLowerCase();
      return {
        questionId: a.questionId,
        givenAnswer: a.answer,
        correct,
        correctAnswer: key.correct,
        explanation: key.explanation,
        sourceSlides:
          Object.values(db.materials)
            .flatMap((m) => m.quizzes)
            .find((q) => q.id === quizId)
            ?.questions.find((q) => q.id === a.questionId)?.sourceSlides ?? [],
      };
    });
    const attempt: QuizAttempt = {
      id: uid(),
      quizId,
      submittedAt: now(),
      score: results.filter((r) => r.correct).length,
      total: results.length,
      results,
    };
    for (const m of Object.values(db.materials)) {
      if (m.quizzes.some((q) => q.id === quizId)) m.attempts.unshift(attempt);
    }
    return attempt;
  },
};
