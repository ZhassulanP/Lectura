import { useRef, useState, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useUpload, usePresentation } from "@/lib/api/queries";
import { MAX_UPLOAD_BYTES, USE_MOCKS } from "@/lib/api/config";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { validateFile } from "./validateFile";
import { StatusBadge } from "@/components/presentations/StatusBadge";
import { ErrorState } from "@/components/common/States";
import type { Presentation } from "@/lib/types";

export function UploadPanel({ id = "upload" }: { id?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const upload = useUpload(setProgress);

  const pick = (f: File | undefined) => {
    if (upload.isPending) return;
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    setFile(err ? null : f);
    upload.reset();
    setProgress(0);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 1) {
      setError("Upload one presentation at a time.");
      return;
    }
    pick(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setSubject("");
    setDescription("");
    setProgress(0);
    upload.reset();
  };

  if (upload.isSuccess)
    return (
      <div id={id}>
        <UploadedStatus initial={upload.data} onAnother={reset} />
      </div>
    );

  return (
    <div id={id} className="space-y-5">
      {USE_MOCKS && (
        <p className="text-sm text-muted-foreground">
          File uploads require the backend. You can explore the sample presentation below in demo
          mode.
        </p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-accent" : "border-input",
        )}
      >
        <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
          <FileUp className="size-5" />
        </span>
        <p className="mt-4 font-medium">Drag and drop your lecture slides</p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF or PPTX · up to {formatBytes(MAX_UPLOAD_BYTES)}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="sr-only"
          aria-label="Choose a presentation file"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {file && (
        <form
          className="space-y-4 rounded-xl border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!upload.isPending)
              upload.mutate({ file, subject: subject.trim(), description: description.trim() });
          }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            {!upload.isPending && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove file"
                onClick={reset}
              >
                <X />
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-subject`}>Subject (optional)</Label>
              <Input
                id={`${id}-subject`}
                value={subject}
                maxLength={100}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics 201"
                disabled={upload.isPending}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${id}-desc`}>Description (optional)</Label>
              <Textarea
                id={`${id}-desc`}
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this lecture about?"
                rows={2}
                disabled={upload.isPending}
              />
            </div>
          </div>
          {upload.isPending && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress === 100 ? "Extracting content…" : "Uploading…"}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Upload progress" />
            </div>
          )}
          {upload.isError && (
            <p role="alert" className="text-sm text-destructive">
              {upload.error.message}
            </p>
          )}
          <Button type="submit" disabled={upload.isPending} className="w-full sm:w-auto">
            {upload.isPending ? <Loader2 className="animate-spin" /> : <FileUp />}
            {upload.isPending
              ? "Uploading"
              : upload.isError
                ? "Retry upload"
                : "Upload presentation"}
          </Button>
        </form>
      )}
    </div>
  );
}

function UploadedStatus({ initial, onAnother }: { initial: Presentation; onAnother: () => void }) {
  const { data, isError, error, refetch } = usePresentation(initial.id);
  const id = initial.id;
  const status = data?.status ?? initial.status;
  const steps = ["Uploading", "Extracting content", "Ready"];
  const current = status === "READY" ? 2 : status === "UPLOADING" ? 0 : 1;
  return (
    <div className="space-y-5 rounded-xl border bg-card p-6" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-medium">{data?.filename ?? initial.filename}</p>
        <StatusBadge status={status} />
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="space-y-2">
            <div
              className={cn(
                "h-1.5 rounded-full",
                status === "FAILED"
                  ? "bg-destructive/40"
                  : i <= current
                    ? "bg-primary"
                    : "bg-muted",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                i <= current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {i < current || status === "READY" ? (
                <CheckCircle2 className="size-3.5 text-success" />
              ) : i === current && status !== "FAILED" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {s}
            </span>
          </li>
        ))}
      </ol>
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {status === "FAILED" && (
        <p className="text-sm text-destructive">
          {data?.errorMessage ?? "Content extraction failed."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/presentations/$id" params={{ id }}>
            {status === "READY" ? "Open presentation" : "View progress"}
          </Link>
        </Button>
        <Button variant="outline" onClick={onAnother}>
          Upload another
        </Button>
      </div>
    </div>
  );
}
