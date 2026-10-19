"use client";

import { useEffect, useState } from "react";
import { Menu, ScanLine, X } from "lucide-react";

const NAV_ITEMS = [
  { num: "00", label: "SYS", id: "sys" },
  { num: "01", label: "ANALYZE", id: "analyze" },
  { num: "02", label: "SCORE", id: "score" },
  { num: "03", label: "STRUCTURE", id: "structure" },
  { num: "04", label: "MAP", id: "map" },
  { num: "05", label: "ISSUES", id: "issues" },
  { num: "06", label: "AI INSIGHTS", id: "insights" },
  { num: "07", label: "STATUS", id: "status" },
] as const;

export function TopBar({ active, phase }: { active: string; phase: string }) {
  const [open, setOpen] = useState(false);

  const jump = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line-strong bg-bg/95 backdrop-blur-[2px]">
      <div className="flex h-14 items-center justify-between gap-6 px-5 md:px-10">
        <a href="#analyze" onClick={(e) => (jump("analyze"), e.preventDefault())} className="flex items-center gap-3 focus-visible:outline-acid">
          <ScanLine className="size-5" aria-hidden />
          <span className="font-mono text-sm font-bold tracking-[0.08em]">XRAY / ID</span>
          <span className="hidden border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted md:inline">
            {phase}
            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-acid animate-blink align-middle" aria-hidden />
          </span>
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => (jump(item.id), e.preventDefault())}
              className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-acid ${
                active === item.id ? "bg-ink text-acid" : "text-muted hover:text-ink"
              }`}
            >
              <span className={active === item.id ? "text-acid" : "text-violet"}>{item.num}</span>{" "}
              {item.label}
  </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted md:inline">
            NODE: CXR-01 · SECURE
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="border border-line-strong p-2 text-ink hover:bg-acid focus-visible:outline-acid lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Sections"
          className="border-t border-line-strong bg-bg px-5 pb-4 lg:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => (jump(item.id), e.preventDefault())}
              className={`flex items-center justify-between border-b border-line px-1 py-3 font-mono text-xs uppercase tracking-[0.18em] focus-visible:outline-acid ${
                active === item.id ? "text-violet" : "text-ink"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-muted">/{item.num}</span>
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
