import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/States";
import { API_BASE_URL, USE_MOCKS } from "@/lib/api";
import { MAX_UPLOAD_BYTES } from "@/lib/api/config";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Lectura" },
      { name: "description", content: "Connection and upload settings for Lectura." },
      { property: "og:title", content: "Settings — Lectura" },
      { property: "og:description", content: "Connection and upload settings for Lectura." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const rows = [
    ["Data source", USE_MOCKS ? "Demo mode (sample data in your browser)" : "Lectura server"],
    ["Server address", API_BASE_URL],
    ["Accepted formats", "PDF, PPTX"],
    ["Maximum file size", formatBytes(MAX_UPLOAD_BYTES)],
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="How this app connects to the Lectura server." />
      <dl className="divide-y rounded-xl border bg-card">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr]">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="break-all font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {USE_MOCKS && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          Demo mode shows sample content so you can try the interface — it is not generated from
          your files. Set <code className="font-mono">VITE_USE_MOCKS=false</code> and{" "}
          <code className="font-mono">VITE_API_BASE_URL</code> to connect the real server.
        </p>
      )}
    </div>
  );
}
