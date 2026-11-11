/**
 * Public-beta disclosure. Deliberately factual and short: it states the
 * inspection limits and that a scan is not a security audit. No marketing.
 */
export function PublicBetaNotice() {
  return (
    <aside
      aria-label="Public beta notice"
      className="border-b border-ink/10 bg-bg px-4 py-2 text-center text-[11px] leading-relaxed text-ink/70"
    >
      <span className="font-mono font-semibold tracking-widest text-ink">PUBLIC BETA</span>{" "}
      <span>
        Analysis covers a bounded, prioritised sample of each repository and supports different languages at different
        depths. Findings are evidence-based indicators, not a security audit. Verify important results independently.
      </span>
    </aside>
  );
}
