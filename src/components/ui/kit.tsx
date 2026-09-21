"use client";

/* ───────────────────────────────────────────────────────────
   Hermes Mission Control · operator primitive kit
   Shared building blocks so every console screen inherits one
   system. Import from "@/components/ui/kit".
   ─────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";

/* ── motion: count-up (first paint only, reduced-motion aware) ── */
export function useCountUp(target: number, duration = 900, enabled = true) {
  const [val, setVal] = useState(target);
  const raf = useRef<number | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) { setVal(target); return; }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || target === 0 || reduce) { setVal(target); done.current = true; return; }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(from + (target - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

/* ── entrance helper: staggered rise delay ── */
export const rise = (i: number): React.CSSProperties => ({
  animationDelay: `${Math.min(i, 12) * 45}ms`,
});

/* ── Eyebrow ── */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}

/* ── SectionHeader — eyebrow + optional action, hairline underline ── */
export function SectionHeader({
  label,
  title,
  action,
  className = "",
}: {
  label?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {label && <Eyebrow>{label}</Eyebrow>}
          {title && (
            <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.015em] text-[var(--text)] truncate">
              {title}
            </h2>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="rule mt-3" />
    </div>
  );
}

/* ── Panel — the calm luxury card material ── */
export function Panel({
  children,
  interactive = false,
  href,
  className = "",
  style,
}: {
  children: React.ReactNode;
  interactive?: boolean;
  href?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls = `panel ${interactive || href ? "panel-interactive" : ""} ${className}`;
  if (href) {
    return (
      <a href={href} className={`block ${cls}`} style={style}>
        {children}
      </a>
    );
  }
  return <div className={cls} style={style}>{children}</div>;
}

/* ── Delta pill — semantic up/down/flat ── */
const UP = "var(--up)";
const DOWN = "var(--down)";
const FLAT = "var(--text-3)";

export function Delta({
  value,
  pct,
  format,
  className = "",
}: {
  value?: number | null;
  pct?: number | null;
  format?: (n: number) => string;
  className?: string;
}) {
  const has = (value !== null && value !== undefined) || (pct !== null && pct !== undefined);
  if (!has) return null;
  const basis = pct ?? value ?? 0;
  const up = basis > 0;
  const down = basis < 0;
  const color = up ? UP : down ? DOWN : FLAT;
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  const text =
    pct !== null && pct !== undefined
      ? `${Math.abs(pct).toFixed(Math.abs(pct) < 10 && pct !== 0 ? 1 : 0)}%`
      : format
        ? format(Math.abs(value as number))
        : Math.abs(value as number).toLocaleString("en-US");
  return (
    <span
      className={`inline-flex items-center gap-0.5 num text-[12px] font-semibold ${className}`}
      style={{ color }}
    >
      {(up || down) && <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />}
      {text}
    </span>
  );
}

/* ── Button ── */
export function Button({
  children,
  variant = "ghost",
  size = "md",
  onClick,
  href,
  type = "button",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "accent" | "ghost";
  size?: "sm" | "md";
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";
  const variantCls = variant === "primary" ? "btn-primary" : variant === "accent" ? "btn-accent" : "btn-ghost";
  const cls = `inline-flex items-center justify-center gap-1.5 font-medium ${pad} ${variantCls} ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ── Skeleton ── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`sk ${className}`} />;
}

/* ── EmptyState ── */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      {icon && <div className="mb-3 text-[var(--text-3)]">{icon}</div>}
      <p className="text-[14px] font-medium text-[var(--text-2)]">{title}</p>
      {hint && <p className="mt-1 text-[12.5px] text-[var(--text-3)] max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Pill — small status/label chip ── */
export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "warn" | "accent";
  className?: string;
}) {
  const map: Record<string, string> = {
    neutral: "var(--text-3)",
    up: "var(--up)",
    down: "var(--down)",
    warn: "var(--warn)",
    accent: "var(--accent)",
  };
  const c = map[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
      style={{ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 22%, transparent)` }}
    >
      {children}
    </span>
  );
}

/* ── StatCard — KPI number + label + delta, the top-row card used
   on every console screen ── */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  icon,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "warn" | "neutral";
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const color = deltaTone === "up" ? "var(--up)" : deltaTone === "down" ? "var(--down)" : deltaTone === "warn" ? "var(--warn)" : "var(--text-3)";
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate">{label}</span>
        {icon && <span className="text-[var(--text-3)] shrink-0">{icon}</span>}
      </div>
      <div className="mt-3 num headline font-semibold text-[28px] leading-none tracking-[-0.01em] text-[var(--text)]">
        {value}
      </div>
      {(delta || hint) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[12px]">
          {delta && <span className="num font-semibold" style={{ color }}>{delta}</span>}
          {hint && <span className="text-[var(--text-3)] truncate">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/* ── AlertBanner — gold/red left-border urgent-alert card ── */
export function AlertBanner({
  title,
  description,
  action,
  tone = "warn",
  className = "",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "warn" | "down";
  className?: string;
}) {
  const color = tone === "down" ? "var(--down)" : "var(--accent)";
  return (
    <div
      className={`panel flex flex-wrap items-center gap-3 p-4 ${className}`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[var(--text)]">{title}</p>
        {description && <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── ActivityLogPanel — the recurring "Hermes Agent Log / Audit
   Stream" pattern shown on most console screens ── */
export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  message: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "warn" | "accent";
}

export function ActivityLogPanel({
  title = "Hermes Agent Log",
  live = true,
  entries,
  className = "",
}: {
  title?: string;
  live?: boolean;
  entries: ActivityLogEntry[];
  className?: string;
}) {
  const dotColor: Record<string, string> = {
    neutral: "var(--text-4)",
    up: "var(--up)",
    down: "var(--down)",
    warn: "var(--warn)",
    accent: "var(--accent)",
  };
  return (
    <Panel className={`!p-0 overflow-hidden flex flex-col ${className}`}>
      <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between shrink-0">
        <Eyebrow>{title}</Eyebrow>
        {live && (
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--up)] opacity-60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[var(--up)]" />
          </span>
        )}
      </div>
      <div className="divide-y divide-[var(--line)] overflow-y-auto">
        {entries.map((e) => (
          <div key={e.id} className="px-4 py-3 flex gap-3">
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dotColor[e.tone ?? "neutral"] }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-[var(--text-2)] leading-relaxed">{e.message}</p>
              <p className="mt-0.5 text-[10.5px] num text-[var(--text-4)]">{e.timestamp}</p>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">No recent activity.</div>
        )}
      </div>
    </Panel>
  );
}
