import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "@/lib/api/http";
import { mockApi } from "@/lib/api/mock";
import { validateFile } from "@/components/upload/validateFile";
import { MAX_UPLOAD_BYTES } from "@/lib/api/config";

afterEach(() => vi.unstubAllGlobals());

describe("API failure handling", () => {
  it("reports a backend error without falling back to samples", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "AI is not configured" }), { status: 503 }),
        ),
    );
    await expect(request("/presentations/id/notes", { method: "POST" })).rejects.toThrow(
      "AI is not configured",
    );
  });
  it("reports unreachable servers and malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network failed")));
    await expect(request("/presentations")).rejects.toThrow("Can't reach");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
    await expect(request("/presentations")).rejects.toThrow("invalid response");
  });
  it("handles deletion responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request("/presentations/id", { method: "DELETE" })).resolves.toBeUndefined();
  });
  it("refuses to simulate extraction of uploaded files in demo mode", async () => {
    await expect(
      mockApi.upload({ file: new File(["lecture"], "lecture.pdf") }, vi.fn()),
    ).rejects.toThrow("cannot upload or extract");
  });
});

describe("Upload validation", () => {
  it("accepts PDF/PPTX extensions and rejects unsupported or empty files", () => {
    expect(validateFile(new File(["content"], "lecture.PPTX"))).toBeNull();
    expect(validateFile(new File(["content"], "lecture.pdf"))).toBeNull();
    expect(validateFile(new File(["content"], "lecture.txt"))).toContain("isn't supported");
    expect(validateFile(new File([], "lecture.pdf"))).toContain("empty");
  });
  it("rejects oversized files before upload", () => {
    const file = new File(["x"], "lecture.pdf");
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_BYTES + 1 });
    expect(validateFile(file)).toContain("Maximum size");
  });
});
