"use client";

/* ───────────────────────────────────────────────────────────
   Hermes Mission Control · shared console top bar
   Breadcrumb + global search + live system-health pills, mounted
   once per page inside the shell. Health values are placeholders
   until the infra-monitoring pipeline is wired up.
   ─────────────────────────────────────────────────────────── */

import { Bell, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("hq:open-palette"));
}

function HealthPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "up" | "warn" }) {
  const dot = tone === "up" ? "var(--up)" : tone === "warn" ? "var(--warn)" : "var(--text-4)";
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--surface-1)]">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
      <span className="eyebrow !text-[9.5px] !tracking-[0.08em]">{label}</span>
      <span className="num text-[11px] font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}

export function ConsoleTopBar({
  section,
  actions,
}: {
  section: string;
  actions?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const initials = (session?.user?.name ?? "Waqar Younis Bhatti")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-10 lg:-mx-12 mb-6 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-xl px-4 sm:px-6 md:px-10 lg:px-12 py-3">
      <div className="flex items-center gap-4">
        {/* breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-[13px] shrink-0">
          <span className="text-[var(--text-3)]">Hermes</span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-4)]" />
          <span className="font-medium text-[var(--text)]">{section}</span>
        </div>

        {/* search trigger */}
        <button
          onClick={openCommandPalette}
          className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-1)] text-left text-[var(--text-3)] hover:border-[var(--line-strong)] transition-colors"
        >
          <span className="text-[12.5px] flex-1 truncate">Search clients, commits, agents…</span>
          <kbd className="text-[10px] num rounded px-1.5 py-0.5 bg-[var(--surface-2)] border border-[var(--line)]">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* system health pills */}
        <div className="hidden xl:flex items-center gap-2">
          <HealthPill label="VPS Load" value="18%" tone="up" />
          <HealthPill label="RAM" value="62%" tone="neutral" />
          <HealthPill label="DB Conn." value="40%" tone="neutral" />
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button className="relative p-2 rounded-[var(--r-sm)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--accent)] flex items-center justify-center text-[11px] font-bold headline">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
