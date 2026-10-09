export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080/api/v1";

/** Demo mode uses in-browser sample data. Set VITE_USE_MOCKS=false to call the real backend. */
export const USE_MOCKS: boolean = (import.meta.env.VITE_USE_MOCKS as string | undefined) !== "false";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".pptx"] as const;
export const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
