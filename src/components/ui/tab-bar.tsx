"use client";

import { useRef } from "react";

interface TabBarProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  /** accessible label for the tablist */
  name: string;
}

/** Sharp technical tabs: box style, acid underline on active, arrow-key navigable. */
export function TabBar({ tabs, active, onChange, name }: TabBarProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div role="tablist" aria-label={name} className="flex border border-line-strong bg-paper">
      {tabs.map((tab, i) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative flex-1 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-75 focus-visible:outline-acid ${
              isActive ? "bg-ink text-acid" : "text-muted hover:bg-bg hover:text-ink"
            } ${i > 0 ? "border-l border-line-strong" : ""}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
