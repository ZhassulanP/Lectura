import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/api/config";
import { formatBytes } from "@/lib/format";

export function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `"${file.name}" isn't supported. Upload a PDF or PPTX file.`;
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is ${formatBytes(file.size)}. Maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}
