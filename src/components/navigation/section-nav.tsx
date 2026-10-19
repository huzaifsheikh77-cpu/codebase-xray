"use client";

import { useEffect, useState } from "react";

/**
 * Observe [data-section] nodes; return the id currently in view (scrollspy).
 * `ready` re-arms the observer when the observed set changes (e.g. result
 * sections mount only after the scan completes).
 */
export function useScrollSpy(sectionIds: string[], ready = true): string {
  const [active, setActive] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (!ready) return;
    const sections = sectionIds
      .map((id) => document.querySelector(`[data-section="${id}"]`))
      .filter((el): el is Element => Boolean(el));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [sectionIds, ready]);

  return active;
}
