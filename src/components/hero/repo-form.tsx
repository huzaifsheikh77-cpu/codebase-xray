"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

/** Accepts https://github.com/owner/repo, github.com/owner/repo, owner/repo.git, etc. */
const GITHUB_REPO_RE =
  /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}?\/?$/;

export interface ExampleRepo {
  slug: string;
  tag?: string;
}

const EXAMPLES: ExampleRepo[] = [
  { slug: "nebula-labs/orbit-forge", tag: "DEMO" },
  { slug: "vercel/next.js" },
  { slug: "microsoft/vscode" },
];

interface RepoFormProps {
  onAnalyze: (url: string) => void;
  disabled?: boolean;
}

/** URL input + ANALYZE trigger with inline validation. */
export function RepoForm({ onAnalyze, disabled }: RepoFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string): string | null => {
    if (!value.trim()) return "REPOSITORY URL REQUIRED";
    if (!GITHUB_REPO_RE.test(value.trim())) return "EXPECTED FORMAT: github.com/owner/repository";
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate(url);
    setError(problem);
    if (!problem) onAnalyze(url.trim());
  };

  const pickExample = (slug: string) => {
    setUrl(`https://github.com/${slug}`);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={submit} noValidate>
        <label htmlFor="repo-url" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          REPOSITORY URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
              [
            </span>
            <input
              id="repo-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="github.com/owner/repository"
              value={url}
              disabled={disabled}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "repo-url-error" : undefined}
              className={`w-full border bg-paper py-3 pl-8 pr-3 font-mono text-sm text-ink placeholder:text-muted/70 disabled:opacity-40 ${
                error ? "border-critical" : "border-line-strong focus:border-ink"
              }`}
            />
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
              ]
            </span>
          </div>
          <ActionButton type="submit" disabled={disabled} aria-label="Analyze repository" className="shrink-0">
            <Radar className="size-4" aria-hidden />
            ANALYZE
          </ActionButton>
        </div>
        {error && (
          <p id="repo-url-error" role="alert" className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-critical">
            ✕ {error}
          </p>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">TRY:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.slug}
            type="button"
            disabled={disabled}
            onClick={() => pickExample(ex.slug)}
            className="border border-line-strong bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.06em] text-ink transition-colors hover:border-ink hover:bg-acid disabled:opacity-40 focus-visible:outline-acid active:translate-y-px"
          >
            {ex.slug}
            {ex.tag && <span className="ml-1.5 text-violet">{ex.tag}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
