"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Send, Terminal } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow } from "@/components/ui/kit";
import { ApprovalInbox } from "@/components/approval-inbox";
import { HermesDispatches } from "@/components/hermes-dispatches";

const MODES = ["Conservative", "Balanced", "Fully Autonomous"] as const;

interface ActivityEvent {
  id: string;
  title: string;
  detail: string | null;
  level: string;
  source: string;
  createdAt: string;
}

interface Health {
  online: boolean;
  gateway: string;
  lastSeen: string | null;
}

interface Agent {
  role: string;
  name: string;
  emoji: string | null;
  status: "running" | "idle" | "offline";
  currentTask: string | null;
  totalCost: number | null;
  requestCount: number;
}

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export default function AgentConsolePage() {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Balanced");
  const [health, setHealth] = useState<Health | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [prompt, setPrompt] = useState("");
  const [role, setRole] = useState("");
  const [sideEffecting, setSideEffecting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [h, a, ag] = await Promise.all([
      getJSON<Health>("/api/hermes/health"),
      getJSON<{ events: ActivityEvent[] }>("/api/hermes/activity?take=30"),
      getJSON<{ agents: Agent[] }>("/api/hermes/agents"),
    ]);
    if (!mounted.current) return;
    if (h) setHealth(h);
    if (a) setEvents(a.events ?? []);
    if (ag) setAgents(ag.agents ?? []);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const iv = setInterval(load, 6000);
    return () => { mounted.current = false; clearInterval(iv); };
  }, [load]);

  const dispatch = useCallback(async () => {
    const title = prompt.trim();
    if (!title || dispatching) return;
    setDispatching(true);
    try {
      await fetch("/api/hermes/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "oneshot", title, prompt: title, sideEffecting, role: role || undefined }),
      });
      setPrompt("");
      await load();
    } finally {
      setDispatching(false);
    }
  }, [prompt, role, sideEffecting, dispatching, load]);

  return (
    <>
      <ConsoleTopBar
        section="Agent Console"
        actions={
          <Button variant="primary" size="sm"><Lock className="w-3.5 h-3.5" /> Kill Switch</Button>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <h1 className="headline text-[24px] md:text-[28px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Hermes Agent Console
            </h1>
            <Pill tone={health?.online ? "up" : "neutral"}>
              {health?.online ? "Active" : "Status unknown"}
            </Pill>
          </div>

          {/* Autonomy mode — presentation only; Hermes has no runtime-switchable
              equivalent today (its approval discipline is a SOUL.md policy, not
              a settable mode). Kept visual/static until a real control exists. */}
          <div className="inline-flex items-center rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-1)] p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                  mode === m ? "bg-[var(--primary)] text-white" : "text-[var(--text-2)] hover:text-[var(--text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* dispatch bar */}
        <Panel className="p-3 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dispatch()}
            placeholder="Dispatch a task to Hermes…"
            className="flex-1 bg-transparent border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[13px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-transparent text-[12.5px] text-[var(--text-2)] px-2.5 py-2 rounded-[var(--r-sm)] border border-[var(--line)] outline-none shrink-0"
          >
            <option value="">Auto-assign role</option>
            {agents.map((a) => (
              <option key={a.role} value={a.role}>{a.emoji} {a.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] px-1 shrink-0">
            <input type="checkbox" checked={sideEffecting} onChange={(e) => setSideEffecting(e.target.checked)} className="accent-[var(--accent)]" />
            Side-effecting
          </label>
          <Button variant="primary" size="sm" disabled={dispatching || !prompt.trim()} onClick={dispatch}>
            <Send className="w-3.5 h-3.5" /> Dispatch
          </Button>
        </Panel>

        {/* agent fleet — real registry (AgentProfile) joined with live status
            computed from AgentRequest; see /api/agents */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {agents.map((a) => (
            <Panel key={a.role} className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[18px]">{a.emoji}</span>
                <Pill tone={a.status === "running" ? "up" : a.status === "idle" ? "neutral" : "neutral"}>
                  {a.status}
                </Pill>
              </div>
              <p className="mt-2 text-[12.5px] font-medium text-[var(--text)] truncate">{a.name}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-3)] truncate">
                {a.currentTask ?? `${a.requestCount} request${a.requestCount === 1 ? "" : "s"}`}
              </p>
              {a.totalCost != null && (
                <p className="mt-1 num text-[10.5px] text-[var(--text-3)]">${a.totalCost.toFixed(4)}</p>
              )}
            </Panel>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <div className="space-y-6">
            <ApprovalInbox />
            <HermesDispatches />
          </div>

          <Panel className="!p-0 overflow-hidden !bg-[#14161a] !border-[#2a2d33]">
            <div className="px-4 py-3 border-b border-[#2a2d33] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a0a3a8]">
                  Activity Log
                </span>
              </div>
              <Eyebrow className="!text-[9px] !text-[#6b6e74]">Live</Eyebrow>
            </div>
            <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto">
              {events.length === 0 && (
                <p className="font-mono text-[11px] text-[#6b6e74]">No activity yet.</p>
              )}
              {events.map((e) => (
                <p key={e.id} className="font-mono text-[11px] leading-relaxed">
                  <span className="text-[#6b6e74]">[{fmtTime(e.createdAt)}]</span>{" "}
                  <span className={e.level === "down" ? "text-[#f28b82]" : e.level === "warn" ? "text-[#f5c451]" : "text-[#c9cdd3]"}>
                    {e.title}
                  </span>
                  {e.detail && <span className="text-[#6b6e74]"> — {e.detail.slice(0, 80)}</span>}
                </p>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
