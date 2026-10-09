export type FileType = "PDF" | "PPTX";
export type ProcessingStatus = "UPLOADING" | "EXTRACTING" | "READY" | "FAILED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";

export interface Presentation {
  id: string;
  title: string;
  filename: string;
  fileType: FileType;
  fileSizeBytes: number;
  uploadedAt: string;
  slideCount: number | null;
  status: ProcessingStatus;
  subject?: string | null;
  description?: string | null;
  errorMessage?: string | null;
}

export interface Slide {
  number: number;
  title?: string | null;
  content: string;
}

export interface NoteSection {
  heading: string;
  summary: string;
  definitions?: { term: string; definition: string }[];
  formulas?: string[];
  examples?: string[];
  sourceSlides: number[];
}

export interface StudyNotes {
  id: string;
  presentationId: string;
  createdAt: string;
  title: string;
  sections: NoteSection[];
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  sourceSlides: number[];
}

export interface Quiz {
  id: string;
  presentationId: string;
  createdAt: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string | null;
}

export interface QuestionResult {
  questionId: string;
  givenAnswer: string | null;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  submittedAt: string;
  score: number;
  total: number;
  results: QuestionResult[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sourceSlides: number[];
}

export interface FlashcardDeck {
  id: string;
  presentationId: string;
  createdAt: string;
  cards: Flashcard[];
}

export interface StudyMaterials {
  notes: StudyNotes[];
  quizzes: Quiz[];
  flashcards: FlashcardDeck[];
  attempts: QuizAttempt[];
}

export interface UploadInput {
  file: File;
  subject?: string;
  description?: string;
}

export interface QuizOptions {
  questionCount: number;
  difficulty: Difficulty;
}
