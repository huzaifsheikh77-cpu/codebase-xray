# 11 — Frontend Quality Report

**Status:** PARTIALLY VERIFIED — component behaviour is tested; no real-browser journey was automated

---

## What exists now

| Test file | Tests | What it proves |
|---|---|---|
| `issues-section.test.tsx` | 2 | zero findings renders the empty state (the old crash cannot return); a finding renders its title, detail and file |
| `coverage-section.test.tsx` | 3 | real inspected %, warning list, critical-path coverage rows, and “no coverage reported” when the payload has none |
| `assistant-panel.test.tsx` | 3 | disabled state with the configured reason; no request controls when offline; controls only when a provider exists |

Infrastructure added: `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@vitejs/plugin-react`; `vitest.config.ts` includes `.tsx`; `.tsx` tests opt into jsdom per file. Total suite: **19 files / 110 tests**.

## Flows covered

- Zero findings (the historical crash).
- Finding detail with evidence.
- Partial coverage disclosure and critical-path gaps.
- AI unavailable; AI available (controls rendered).
- Copy that states the assistant cannot produce measurements.

## Flows **not** covered by automation

Repository submission, scan lifecycle, network failure, rate-limit error rendering, severity/category filtering, graph rendering, responsive layouts, keyboard navigation, and the full ask-AI round trip.

Reason: no browser automation framework is installed. Playwright/Puppeteer would add a large dependency and browser binaries; the brief allows documenting the blocker instead of silently claiming coverage. The production build was started and probed over HTTP (page 200, demo analysis 200, AI 503), but that is not a UI interaction test.

## UX honesty changes

- The AI panel says “ONLY THE ANALYSIS SUMMARY IS SENT. NO SOURCE FILES, TOKENS OR IP ADDRESSES LEAVE THE SERVER” and, when disabled, states the deterministic report is complete and unaffected.
- Coverage panel labels critical-path classification as path-based and warns that a missing category does not prove the code is absent.
- Empty findings state explicitly that “no findings” is not “no problems”.
- The demo fixture labels fictional coverage (6 critical categories, capability tallies) as demo data.

## Accessibility

Semantic headings, labelled form controls, `aria-pressed` on filter/toggle buttons, `aria-hidden` on decorative icons, and focus-visible outlines were already present or added. **No assistive-technology audit or automated axe run was performed** — this remains a gap, not a pass.

## Remaining risks

- A component test can pass while the page is visually broken; no screenshot/visual regression.
- The issues list can grow to 30 findings; pagination/virtualisation was not tested for performance.
- Responsive behaviour is Tailwind-class driven and unverified below 640 px.
