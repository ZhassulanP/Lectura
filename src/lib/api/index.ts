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
import { USE_MOCKS } from "./config";
import { request, uploadMultipart } from "./http";
import { mockApi } from "./mock";

export { ApiError } from "./http";
export { USE_MOCKS, API_BASE_URL } from "./config";

const realApi = {
  listPresentations: () => request<Presentation[]>("/presentations"),
  getPresentation: (id: string) => request<Presentation>(`/presentations/${id}`),
  getSlides: (id: string) => request<Slide[]>(`/presentations/${id}/slides`),
  deletePresentation: (id: string) => request<void>(`/presentations/${id}`, { method: "DELETE" }),
  upload: (input: UploadInput, onProgress: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", input.file);
    if (input.subject) form.append("subject", input.subject);
    if (input.description) form.append("description", input.description);
    return uploadMultipart<Presentation>("/presentations", form, onProgress);
  },
  generateNotes: (id: string) =>
    request<StudyNotes>(`/presentations/${id}/notes`, { method: "POST" }),
  generateQuiz: (id: string, opts: QuizOptions) =>
    request<Quiz>(`/presentations/${id}/quizzes`, { method: "POST", body: JSON.stringify(opts) }),
  generateFlashcards: (id: string) =>
    request<FlashcardDeck>(`/presentations/${id}/flashcards`, { method: "POST" }),
  getMaterials: (id: string) => request<StudyMaterials>(`/presentations/${id}/materials`),
  submitAttempt: (quizId: string, answers: QuizAnswer[]) =>
    request<QuizAttempt>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const api: typeof realApi = USE_MOCKS ? mockApi : realApi;
