import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/build")({
  component: BuildPage,
});

/** Keystone API base. Dev uses a locally-trusted cert; prod is the deployed API */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:4000";

interface Page {
  html: string;
  css: string;
  js?: string;
}
interface SiteFiles {
  theme: string;
  shell: { header: string; footer: string };
  pages: Record<string, Page>;
}
interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
  at: string;
}

const MODELS = [
  { id: "claude-opus-5", label: "Opus 5" },
  { id: "claude-sonnet-5", label: "Sonnet 5" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5" },
];

const DEFAULT_MODEL = MODELS[0]?.id ?? "claude-opus-5";

const EXAMPLES = [
  "A bold landing page for an artisanal coffee roaster with a hero, featured beans, and a newsletter signup",
  "A minimal portfolio for a landscape photographer, dark and elegant",
  "A launch page for a productivity app with pricing tiers and testimonials",
];

/** Compose theme + shell + a page into a preview document for the iframe */
const assemblePreview = (files: SiteFiles | null): string => {
  if (!files) {
    return "<!doctype html><title>Preview</title><body style='margin:0'></body>";
  }

  const page = files.pages.home ?? Object.values(files.pages)[0];

  if (!page) return "<!doctype html><title>Preview</title>";

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${files.theme}\n${page.css}</style></head><body>${files.shell.header}${page.html}${files.shell.footer}${page.js ? `<script>${page.js}</script>` : ""}</body></html>`;
};

/**
 * Keystone builder. Chat on the left, live preview on the right. Styled with the
 * Omni design system (thornberry tokens + Tailwind); the Keystone brand comes
 * from the brass `primary` ramp and the Fraunces display font set in globals.css.
 */
function BuildPage() {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [files, setFiles] = useState<SiteFiles | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [dsMode, setDsMode] = useState<"freeform" | "themed" | "design-system">(
    "freeform",
  );
  const [dsOpen, setDsOpen] = useState(false);
  const [dsTokens, setDsTokens] = useState("");
  const [dsSaving, setDsSaving] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/sites`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Untitled site" }),
    })
      .then((res) => res.json())
      .then((data) => setSiteId(data.siteId))
      .catch(() =>
        setError(
          "Cannot reach the Keystone API. Open https://localhost:4000/health once to trust the certificate, then reload.",
        ),
      );
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new turns
  useEffect(() => {
    if (transcript.length) {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
    }
  }, [transcript.length, loading]);

  const applyExample = (text: string) => {
    setPrompt(text);
    input.current?.focus();
  };

  const send = async () => {
    if (!siteId || !prompt.trim() || loading) return;

    const request = prompt.trim();
    setPrompt("");
    setError(null);
    setLoading(true);
    setTranscript((t) => [
      ...t,
      { role: "user", content: request, at: new Date().toISOString() },
    ]);

    try {
      const genRes = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, request, model }),
      });

      if (!genRes.ok) throw new Error("generation failed");

      const gen = await genRes.json();
      setCredits(gen.credits ?? null);
      setTranscript((t) => [
        ...t,
        {
          role: "assistant",
          content: gen.reply ?? "Done.",
          at: new Date().toISOString(),
        },
      ]);

      const site = await fetch(`${API_BASE}/sites/${siteId}`).then((r) =>
        r.json(),
      );
      setFiles(site.files);
      if (site.mode) setDsMode(site.mode);
    } catch {
      setError(
        "Generation failed. Check the API server and your Anthropic credits.",
      );
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!siteId || !files || publishing) return;

    setPublishing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok) throw new Error("publish failed");

      const data = await res.json();
      setPublishedUrl(data.url);
    } catch {
      setError("Publish failed. Check the API server.");
    } finally {
      setPublishing(false);
    }
  };

  const applyDesignSystem = async () => {
    if (!siteId || dsSaving) return;

    setDsSaving(true);
    setError(null);

    try {
      const body = dsTokens.trim()
        ? { tokens: dsTokens.trim() }
        : { detach: true };
      const res = await fetch(`${API_BASE}/sites/${siteId}/design-system`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Invalid design system");

      setDsMode(data.mode);
      setDsOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not apply the design system.",
      );
    } finally {
      setDsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-base-200 border-b bg-background/75 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Keystone</title>
            <defs>
              <linearGradient id="kxg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.752 0.112 77)" />
                <stop offset="1" stopColor="oklch(0.604 0.108 74)" />
              </linearGradient>
            </defs>
            <path d="M5 4 L19 4 L15.5 20 L8.5 20 Z" fill="url(#kxg)" />
            <path
              d="M9.7 4 L14.3 4 L13.2 20 L10.8 20 Z"
              fill="#17130f"
              opacity="0.16"
            />
          </svg>
          <span className="font-display font-semibold text-xl tracking-tight">
            Keystone
          </span>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 font-semibold text-[10px] text-primary-800 uppercase tracking-wider">
            Preview
          </span>
        </div>
        <div className="flex items-center gap-3">
          {credits !== null && (
            <span className="text-muted-foreground text-xs">
              {credits} credits last turn
            </span>
          )}
          <select
            className="rounded-md border border-base-200 bg-card px-3 py-1.5 text-sm outline-none focus:border-primary-500"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            aria-label="Model"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-base-200 bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary-500 disabled:opacity-40"
            onClick={() => setDsOpen(true)}
            disabled={!siteId}
            title="Ground generation in a design system"
          >
            {dsMode === "design-system"
              ? "Design system ✓"
              : dsMode === "themed"
                ? "Themed ✓"
                : "Design system"}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary-700 disabled:opacity-40"
            onClick={publish}
            disabled={!files || publishing}
          >
            {publishing
              ? "Publishing..."
              : publishedUrl
                ? "Republish"
                : "Publish"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-96 shrink-0 flex-col border-base-200 border-r bg-card/50">
          <div
            ref={scroller}
            className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5"
          >
            {transcript.length === 0 && !loading ? (
              <div className="my-auto">
                <h2 className="mb-2 font-display font-medium text-2xl tracking-tight">
                  What will you build?
                </h2>
                <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
                  Describe a site in plain language. Keystone designs and builds
                  it, then you refine it turn by turn.
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="rounded-xl border border-base-200 bg-card p-3 text-left text-sm leading-snug transition-colors hover:border-primary-400"
                      onClick={() => applyExample(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {transcript.map((entry, i) => (
                  <div
                    key={`${entry.at}-${i}`}
                    className={
                      entry.role === "user"
                        ? "max-w-[92%] self-end rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2.5 text-background text-sm"
                        : "max-w-[92%] self-start rounded-2xl rounded-bl-sm border border-base-200 bg-card px-3.5 py-2.5 text-sm"
                    }
                  >
                    {entry.content}
                  </div>
                ))}
                {loading && (
                  <div className="flex max-w-[92%] items-center gap-1 self-start rounded-2xl rounded-bl-sm border border-base-200 bg-card px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:300ms]" />
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="border-red-200 border-t bg-red-50 px-5 py-2.5 text-red-700 text-xs leading-snug">
              {error}
            </div>
          )}

          <div className="border-base-200 border-t p-4">
            <textarea
              ref={input}
              className="h-24 w-full resize-none rounded-xl border border-base-200 bg-card p-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
              placeholder={
                siteId
                  ? "Describe your site, or a change to make..."
                  : "Connecting..."
              }
              value={prompt}
              disabled={!siteId || loading}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            <button
              type="button"
              className="mt-2.5 w-full rounded-xl bg-primary-600 py-3 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary-700 disabled:opacity-40"
              onClick={send}
              disabled={!siteId || loading || !prompt.trim()}
            >
              {loading ? "Composing..." : "Generate"}
            </button>
            <p className="mt-2 text-center text-muted-foreground text-xs">
              ⌘ / Ctrl + Enter to send
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-base-100 p-5">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-base-200 bg-card shadow-xl">
            <div className="flex items-center gap-3 border-base-200 border-b bg-base-100 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-300" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-green-300" />
              </div>
              <div className="flex-1 truncate rounded-full border border-base-200 bg-card px-3.5 py-1 text-muted-foreground text-xs">
                <span
                  className={
                    publishedUrl
                      ? "font-medium text-primary-700"
                      : "font-medium text-foreground"
                  }
                >
                  {publishedUrl ? "published" : "draft"}
                </span>
                .keystone.omni.dev
              </div>
              {publishedUrl && (
                <a
                  className="font-semibold text-primary-700 text-xs hover:underline"
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View live →
                </a>
              )}
            </div>
            <iframe
              title="Site preview"
              className="w-full flex-1 border-none bg-white"
              sandbox="allow-scripts"
              srcDoc={assemblePreview(files)}
            />
          </div>
        </main>
      </div>

      {dsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Design system"
        >
          <div className="w-full max-w-lg rounded-xl border border-base-200 bg-card p-6 shadow-2xl">
            <h2 className="font-display font-medium text-xl tracking-tight">
              Ground in a design system
            </h2>
            <p className="mt-1.5 text-muted-foreground text-sm">
              Paste W3C design tokens (DTCG) to theme every generation in your
              brand.{" "}
              <a
                href="https://aura.omni.dev"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary-700 hover:underline"
              >
                Design and export them in Aura ↗
              </a>
            </p>
            <textarea
              className="mt-4 h-48 w-full resize-none rounded-md border border-base-200 bg-background p-3 font-mono text-xs outline-none focus:border-primary-500"
              placeholder={
                '{\n  "color": {\n    "brand": { "$type": "color", "$value": "#b0781c" }\n  }\n}'
              }
              value={dsTokens}
              onChange={(e) => setDsTokens(e.target.value)}
              aria-label="Design tokens (DTCG JSON)"
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Current mode: {dsMode}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-base-100"
                  onClick={() => setDsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary-700 disabled:opacity-40"
                  onClick={applyDesignSystem}
                  disabled={dsSaving}
                >
                  {dsSaving
                    ? "Applying..."
                    : dsTokens.trim()
                      ? "Apply"
                      : "Remove"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
