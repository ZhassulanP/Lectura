import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./index";
import type { QuizAnswer, QuizOptions, UploadInput } from "../types";

export const keys = {
  presentations: ["presentations"] as const,
  presentation: (id: string) => ["presentations", id] as const,
  slides: (id: string) => ["presentations", id, "slides"] as const,
  materials: (id: string) => ["presentations", id, "materials"] as const,
};

function useClientReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export function usePresentations() {
  const ready = useClientReady();
  return useQuery({
    queryKey: keys.presentations,
    queryFn: api.listPresentations,
    enabled: ready,
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.status === "UPLOADING" || p.status === "EXTRACTING")
        ? 2000
        : false,
  });
}

export function usePresentation(id: string) {
  const ready = useClientReady();
  return useQuery({
    queryKey: keys.presentation(id),
    queryFn: () => api.getPresentation(id),
    enabled: ready,
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "EXTRACTING" || q.state.data.status === "UPLOADING")
        ? 2000
        : false,
  });
}

export function useSlides(id: string, enabled: boolean) {
  const ready = useClientReady();
  return useQuery({
    queryKey: keys.slides(id),
    queryFn: () => api.getSlides(id),
    enabled: enabled && ready,
  });
}

export function useMaterials(id: string, enabled = true) {
  const ready = useClientReady();
  return useQuery({
    queryKey: keys.materials(id),
    queryFn: () => api.getMaterials(id),
    enabled: enabled && ready,
  });
}

export function useMaterialGroups(ids: string[]) {
  const ready = useClientReady();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: keys.materials(id),
      queryFn: () => api.getMaterials(id),
      enabled: ready,
    })),
  });
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

export function useDeletePresentation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deletePresentation(id),
    onSuccess: async () => {
      qc.removeQueries({ queryKey: keys.presentation(id) });
      await qc.invalidateQueries({ queryKey: keys.presentations });
    },
  });
}
