"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Users, Inbox, AlertOctagon, ListChecks } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import {
  SectionHeader,
  Panel,
  Pill,
  Button,
  StatCard,
  AlertBanner,
  ActivityLogPanel,
  type ActivityLogEntry,
} from "@/components/ui/kit";
import { ApprovalInbox } from "@/components/approval-inbox";

/* Command Center is deliberately "nothing of its own" — a rollup of real data
   already produced elsewhere (clients, requests, tasks, activity), surfacing
   exceptions and decisions rather than a wall of KPIs. See the approved
   Agency OS architecture plan, §1/§10. */

interface Client { id: string; clientName: string }
interface AgentRequestRow { id: string; status: string; title: string; clientId: string | null; createdAt: string }
interface AgentEventRow { id: string; title: string; detail: string | null; level: string; createdAt: string }
interface HermesTaskRow { id: string; title: string; status: string; clientId: string | null; updatedAt: string }

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function relDays(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}
const EVENT_TONE: Record<string, ActivityLogEntry["tone"]> = { info: "neutral", up: "up", warn: "warn", down: "down" };
const APPROVAL_SLA_MS = 4 * 60 * 60 * 1000; // 4h
const FAILED_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

export default function OverviewPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<AgentRequestRow[]>([]);
  const [events, setEvents] = useState<AgentEventRow[]>([]);
  const [tasks, setTasks] = useState<HermesTaskRow[]>([]);
  const [briefBusy, setBriefBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, r, a, t] = await Promise.all([
      getJSON<{ clients: Client[] }>("/api/clients"),
      getJSON<{ requests: AgentRequestRow[] }>("/api/hermes/requests?take=100"),
      getJSON<{ events: AgentEventRow[] }>("/api/hermes/activity?take=8"),
      getJSON<{ tasks: HermesTaskRow[] }>("/api/hermes/tasks"),
    ]);
    if (c) setClients(c.clients ?? []);
    if (r) setRequests(r.requests ?? []);
    if (a) setEvents(a.events ?? []);
    if (t) setTasks(t.tasks ?? []);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const generateBrief = useCallback(async () => {
    setBriefBusy(true);
    try {
      await fetch("/api/hermes/briefing", { method: "POST" });
    } finally {
      setBriefBusy(false);
    }
  }, []);

  const now = Date.now();
  const pendingApprovals = requests.filter((r) => r.status === "awaiting_approval");
  const slaBreached = pendingApprovals.filter((r) => now - new Date(r.createdAt).getTime() > APPROVAL_SLA_MS);
  const recentFailed = requests.filter((r) => r.status === "failed" && now - new Date(r.createdAt).getTime() < FAILED_WINDOW_MS);
  const blockedTasks = tasks.filter((t) => t.status.toLowerCase().includes("block"));
  const openTasks = tasks.filter((t) => t.status !== "done");

  const auditStream: ActivityLogEntry[] = events.map((e) => ({
    id: e.id,
    tone: EVENT_TONE[e.level] ?? "neutral",
    timestamp: timeLabel(e.createdAt),
    message: e.detail ? <>{e.title} — <span className="text-[var(--text-3)]">{e.detail.slice(0, 80)}</span></> : e.title,
  }));

  const milestones = openTasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
    .map((t) => ({
      title: t.title,
      meta: t.status,
      due: relDays(t.updatedAt),
      tone: t.status.toLowerCase().includes("block") ? ("down" as const) : ("neutral" as const),
    }));

  // per-client exceptions — real rollup joined client-side over the same
  // fetches above; sparse until clients have real tasks/requests, left
  // genuinely empty rather than fabricated (see /clients, /finance precedent).
  const clientExceptions = clients.map((c) => {
    const cTasks = tasks.filter((t) => t.clientId === c.id);
    return {
      client: c,
      openTasks: cTasks.filter((t) => t.status !== "done").length,
      blocked: cTasks.filter((t) => t.status.toLowerCase().includes("block")).length,
      pending: requests.filter((r) => r.clientId === c.id && r.status === "awaiting_approval").length,
    };
  }).filter((row) => row.openTasks > 0 || row.blocked > 0 || row.pending > 0);

  return (
    <>
      <ConsoleTopBar
        section="Overview"
        actions={
          <Button variant="accent" size="sm" onClick={generateBrief} disabled={briefBusy}>
            <Sparkles className="w-3.5 h-3.5" /> New Mission Brief
          </Button>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Command Center
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)] max-w-xl">
              What needs your decision right now — everything else is one click away.
            </p>
          </div>
        </div>

        {/* KPI row — real counts, no fabricated ad-spend/campaign figures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Clients" value={clients.length} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Pending Approvals" value={pendingApprovals.length} delta={slaBreached.length ? `${slaBreached.length} over SLA` : undefined} deltaTone={slaBreached.length ? "down" : "neutral"} icon={<Inbox className="w-4 h-4" />} />
          <StatCard label="Failed / Blocked" value={recentFailed.length + blockedTasks.length} delta="24h" deltaTone={recentFailed.length + blockedTasks.length ? "down" : "up"} icon={<AlertOctagon className="w-4 h-4" />} />
          <StatCard label="Open Tasks" value={openTasks.length} icon={<ListChecks className="w-4 h-4" />} />
        </div>

        {/* real, computed exceptions — only rendered when something is actually wrong */}
        {(slaBreached.length > 0 || recentFailed.length > 0 || blockedTasks.length > 0) && (
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {slaBreached.length > 0 && (
              <AlertBanner
                tone="warn"
                title={`${slaBreached.length} approval${slaBreached.length === 1 ? "" : "s"} waiting over 4 hours`}
                description={slaBreached[0].title}
                action={<Button size="sm" variant="ghost" href="/agent-console">Review</Button>}
              />
            )}
            {recentFailed.length > 0 && (
              <AlertBanner
                tone="down"
                title={`${recentFailed.length} failed request${recentFailed.length === 1 ? "" : "s"} in the last 24h`}
                description={recentFailed[0].title}
                action={<Button size="sm" variant="ghost" href="/agent-console">Investigate</Button>}
              />
            )}
            {blockedTasks.length > 0 && (
              <AlertBanner
                tone="down"
                title={`${blockedTasks.length} blocked task${blockedTasks.length === 1 ? "" : "s"}`}
                description={blockedTasks[0].title}
                action={<Button size="sm" variant="ghost" href="/projects">View</Button>}
              />
            )}
          </div>
        )}

        {/* main split: per-client exceptions + the approval inbox itself */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 mb-6 items-start">
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text)] headline">Clients Needing Attention</p>
                <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                  {clientExceptions.length === 0 ? "Nothing flagged right now" : `${clientExceptions.length} client${clientExceptions.length === 1 ? "" : "s"} with open items`}
                </p>
              </div>
              <Button variant="ghost" size="sm" href="/clients">View All</Button>
            </div>
            {clientExceptions.length === 0 ? (
              <p className="px-5 py-8 text-[12.5px] text-[var(--text-3)] text-center">
                {clients.length === 0
                  ? <>No clients yet — add one from <a href="/clients" className="text-[var(--accent)]">Clients &amp; Campaigns</a>.</>
                  : "All clients are clear of open tasks, blockers, and pending approvals."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      {["Client", "Open Tasks", "Blocked", "Pending Approvals"].map((h) => (
                        <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientExceptions.map((row) => (
                      <tr key={row.client.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                        <td className="px-5 py-3 text-[13px] font-medium text-[var(--text)] whitespace-nowrap">{row.client.clientName}</td>
                        <td className="px-5 py-3 num text-[13px] text-[var(--text-2)]">{row.openTasks}</td>
                        <td className="px-5 py-3">{row.blocked > 0 ? <Pill tone="down">{row.blocked}</Pill> : <span className="num text-[13px] text-[var(--text-3)]">0</span>}</td>
                        <td className="px-5 py-3">{row.pending > 0 ? <Pill tone="warn">{row.pending}</Pill> : <span className="num text-[13px] text-[var(--text-3)]">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel className="p-4 lg:max-h-[420px] overflow-y-auto">
            <ApprovalInbox compact />
          </Panel>
        </div>

        {/* milestones + audit stream */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5">
          <Panel className="!p-0 overflow-hidden">
            <SectionHeader label="Roadmap" title="Upcoming Milestones & Deployments" className="!mb-0 px-5 pt-4" />
            <div className="divide-y divide-[var(--line)]">
              {milestones.length === 0 && (
                <p className="px-5 py-6 text-[12.5px] text-[var(--text-3)]">
                  No in-progress kanban tasks yet — create one with the <code className="num">hermes kanban create</code> CLI
                  or from <a href="/projects" className="text-[var(--accent)]">Work</a>.
                </p>
              )}
              {milestones.map((m) => (
                <div key={m.title} className="px-5 py-3.5 flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: m.tone === "down" ? "var(--down)" : "var(--text-4)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{m.title}</p>
                    <p className="text-[11.5px] text-[var(--text-3)] mt-0.5">{m.meta}</p>
                  </div>
                  <span className="num text-[11.5px] text-[var(--text-3)] shrink-0">{m.due}</span>
                </div>
              ))}
            </div>
          </Panel>

          <ActivityLogPanel title="Hermes Agent Audit Stream" entries={auditStream} className="lg:max-h-[420px]" />
        </div>
      </div>
    </>
  );
}
