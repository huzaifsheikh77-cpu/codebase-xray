interface MonoLabelProps {
  children: React.ReactNode;
  tick?: boolean;
  className?: string;
}

/** Small uppercase mono metadata label. */
export function MonoLabel({ children, tick, className }: MonoLabelProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tick ? "before:inline-block before:size-1.5 before:bg-violet before:content-['']" : ""} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
