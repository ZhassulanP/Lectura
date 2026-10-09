import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body?.message === "string") message = body.message;
  } catch {
    /* ignore */
  }
  return new ApiError(message, res.status);
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new ApiError(
        "The request timed out. Check the server before retrying; a generation may have completed.",
        408,
      );
    throw new ApiError("Can't reach the Lectura server. Is the backend running?", 0);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("The server returned an invalid response.", res.status);
  }
}

/** Multipart upload with progress reporting (fetch has no upload progress). */
export function uploadMultipart<T>(
  path: string,
  form: FormData,
  onProgress: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.timeout = 120_000;
    xhr.ontimeout = () =>
      reject(new ApiError("Upload timed out. Check your presentation list before retrying.", 408));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError("Unexpected server response", xhr.status));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText)?.message ?? msg;
        } catch {
          /* ignore */
        }
        reject(new ApiError(msg, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("Can't reach the Lectura server.", 0));
    xhr.send(form);
  });
}
