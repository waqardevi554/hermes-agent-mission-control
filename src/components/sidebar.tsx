"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Gauge,
  Users,
  FolderKanban,
  Bot,
  Server,
  Landmark,
  Menu,
  X,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/clients", label: "Clients & Campaigns", icon: Users },
  { href: "/projects", label: "Projects & Dev", icon: FolderKanban },
  { href: "/agent-console", label: "Agent Console", icon: Bot },
  { href: "/infrastructure", label: "Infrastructure", icon: Server },
  { href: "/finance", label: "Finance & Pipeline", icon: Landmark },
];

// Mobile bottom tab bar — 5 most-used of the 6 (Finance stays in the drawer)
const mobileTabs = navItems.filter((i) => i.href !== "/finance");

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-[var(--r-sm)] bg-[var(--primary)] flex items-center justify-center">
        <span className="text-[var(--accent)] font-bold text-[13px] tracking-tight headline">H</span>
      </div>
      <div className="min-w-0 leading-tight">
        <div className="font-semibold text-[var(--text)] tracking-[-0.01em] text-[14px] truncate headline">
          Hermes Mission Control
        </div>
        <div className="eyebrow !text-[9px] !tracking-[0.12em] truncate">Tasheer Digital OPS</div>
      </div>
    </div>
  );
}

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("hq:open-palette"));
}

function initials(name?: string | null) {
  if (!name) return "TD";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const userName = session?.user?.name ?? "Waqar Younis Bhatti";
  const userRole = "OWNER · SOLO OPS";

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--line)] px-4 py-3 flex items-center justify-between">
        <Logo />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--r-sm)] hover:bg-[var(--surface-2)]"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)]/95 backdrop-blur-xl border-t border-[var(--line)] px-2 py-2 safe-area-pb">
        <nav className="flex justify-around">
          {mobileTabs.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 px-3 rounded-[var(--r-sm)] transition-all ${
                  isActive
                    ? "text-[var(--text)] bg-[var(--surface-2)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)] active:scale-95"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`
          fixed md:relative z-50 md:z-10
          w-64 md:w-[15.5rem] h-full
          bg-[var(--bg)] border-r border-[var(--line)]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          top-0 left-0
        `}
      >
        {/* Logo */}
        <div className="hidden md:block px-5 pt-6 pb-6">
          <Logo />
        </div>

        {/* Spacer for mobile header */}
        <div className="h-16 md:hidden" />

        {/* Search */}
        <div className="hidden md:block px-3 mb-5">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-1)] text-left text-[var(--text-3)] hover:border-[var(--line-strong)] transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[12.5px] flex-1 truncate">Search clients, commits, agents…</span>
            <kbd className="text-[10px] num rounded px-1.5 py-0.5 bg-[var(--surface-2)] border border-[var(--line)]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <h3 className="eyebrow px-3 mb-1.5">Operations Console</h3>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3 py-[7px] rounded-[var(--r-sm)] transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--text)]"
                      : "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-[var(--accent)]" />
                  )}
                  <Icon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      isActive ? "text-[var(--text)]" : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"
                    }`}
                  />
                  <span className="text-[13.5px] font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--line)] space-y-2.5">
          <div className="flex items-center gap-2 text-[var(--text-3)] text-[11px] num">
            <Server className="w-3 h-3 shrink-0" />
            <span className="truncate">PROD-01 · Hetzner Nuremberg</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-3)] text-[11.5px]">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--up)] opacity-60 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[var(--up)]" />
            </span>
            <span>Hermes Agent Active</span>
          </div>
          <div className="flex items-center gap-2 pt-1.5 border-t border-[var(--line)] mt-1">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-[var(--accent)] flex items-center justify-center text-[11px] font-bold shrink-0 headline">
              {initials(userName).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-[var(--text)] truncate">{userName}</div>
              <div className="eyebrow !text-[9px] truncate">{userRole}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
