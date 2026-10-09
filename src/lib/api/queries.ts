import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./index";
import type { QuizAnswer, QuizOptions, UploadInput } from "../types";

export const keys = {
  presentations: ["presentations"] as const,
  presentation: (id: string) => ["presentations", id] as const,
  slides: (id: string) => ["presentations", id, "slides"] as const,
  materials: (id: string) => ["presentations", id, "materials"] as const,
};

export function usePresentations() {
  return useQuery({
    queryKey: keys.presentations,
    queryFn: api.listPresentations,
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.status === "UPLOADING" || p.status === "EXTRACTING") ? 2000 : false,
  });
}

export function usePresentation(id: string) {
  return useQuery({
    queryKey: keys.presentation(id),
    queryFn: () => api.getPresentation(id),
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "EXTRACTING" || q.state.data.status === "UPLOADING")
        ? 2000
        : false,
  });
}

export function useSlides(id: string, enabled: boolean) {
  return useQuery({ queryKey: keys.slides(id), queryFn: () => api.getSlides(id), enabled });
}

export function useMaterials(id: string) {
  return useQuery({ queryKey: keys.materials(id), queryFn: () => api.getMaterials(id) });
}

export function useUpload(onProgress: (pct: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadInput) => api.upload(input, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.presentations }),
  });
}

function useInvalidateMaterials(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.materials(id) });
}

export function useGenerateNotes(id: string) {
  const inv = useInvalidateMaterials(id);
  return useMutation({ mutationFn: () => api.generateNotes(id), onSuccess: inv });
}
export function useGenerateQuiz(id: string) {
  const inv = useInvalidateMaterials(id);
  return useMutation({ mutationFn: (o: QuizOptions) => api.generateQuiz(id, o), onSuccess: inv });
}
export function useGenerateFlashcards(id: string) {
  const inv = useInvalidateMaterials(id);
  return useMutation({ mutationFn: () => api.generateFlashcards(id), onSuccess: inv });
}
export function useSubmitAttempt(presentationId: string, quizId: string) {
  const inv = useInvalidateMaterials(presentationId);
  return useMutation({
    mutationFn: (answers: QuizAnswer[]) => api.submitAttempt(quizId, answers),
    onSuccess: inv,
  });
}
