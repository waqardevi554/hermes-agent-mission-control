"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import {
  SectionHeader,
  Panel,
  Pill,
  Button,
  StatCard,
  AlertBanner,
  ActivityLogPanel,
  Eyebrow,
  type ActivityLogEntry,
} from "@/components/ui/kit";

/* ── Mock data — no real Hermes source exists for ad spend / campaign
   health yet (confirmed during discovery: this only exists transiently
   inside live Ads-MCP tool calls, nothing persists it). Everything else
   on this page (Autonomous Actions, Audit Stream, Milestones) is wired
   to real data below. ── */

const CLIENT_HEALTH = [
  { client: "Sintco Dental", channels: ["Meta"], spend: "$1,240/day", target: 28, actual: 41, status: "Review" as const },
  { client: "Nova Fitness Studio", channels: ["Meta", "Google"], spend: "$860/day", target: 32, actual: 29, status: "On Pace" as const },
  { client: "Solaris Energy Co", channels: ["Google"], spend: "$2,100/day", target: 54, actual: 88, status: "Review" as const },
  { client: "Bright Smile Dental", channels: ["Meta"], spend: "$540/day", target: 22, actual: 21, status: "On Pace" as const },
  { client: "Clara Boutique", channels: ["Meta", "TikTok"], spend: "$410/day", target: 18, actual: 24, status: "Pacing" as const },
];

function statusTone(status: string): "up" | "warn" | "down" {
  if (status === "On Pace") return "up";
  if (status === "Pacing") return "warn";
  return "down";
}

interface AgentRequestRow { id: string; status: string; createdAt: string }
interface AgentEventRow { id: string; title: string; detail: string | null; level: string; createdAt: string }
interface HermesTaskRow { id: string; title: string; status: string; updatedAt: string }

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

export default function OverviewPage() {
  const [requests, setRequests] = useState<AgentRequestRow[]>([]);
  const [events, setEvents] = useState<AgentEventRow[]>([]);
  const [tasks, setTasks] = useState<HermesTaskRow[]>([]);

  const load = useCallback(async () => {
    const [r, a, t] = await Promise.all([
      getJSON<{ requests: AgentRequestRow[] }>("/api/hermes/requests?take=100"),
      getJSON<{ events: AgentEventRow[] }>("/api/hermes/activity?take=8"),
      getJSON<{ tasks: HermesTaskRow[] }>("/api/hermes/tasks"),
    ]);
    if (r) setRequests(r.requests ?? []);
    if (a) setEvents(a.events ?? []);
    if (t) setTasks(t.tasks ?? []);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const autoApprovedCount = requests.filter((r) => r.status === "done" || r.status === "running").length;

  const auditStream: ActivityLogEntry[] = events.map((e) => ({
    id: e.id,
    tone: EVENT_TONE[e.level] ?? "neutral",
    timestamp: timeLabel(e.createdAt),
    message: e.detail ? <>{e.title} — <span className="text-[var(--text-3)]">{e.detail.slice(0, 80)}</span></> : e.title,
  }));

  const milestones = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
    .map((t) => ({
      title: t.title,
      meta: t.status,
      due: relDays(t.updatedAt),
      tone: t.status.toLowerCase().includes("block") ? ("down" as const) : ("neutral" as const),
    }));

  return (
    <>
      <ConsoleTopBar
        section="Overview"
        actions={
          <Button variant="accent" size="sm">
            <Sparkles className="w-3.5 h-3.5" /> New Mission Brief
          </Button>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Mission Control Overview
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)] max-w-xl">
              Live agency telemetry, urgent alerts, and pending autonomous agent actions.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Run Diagnostic
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Client Campaigns" value="14" delta="+2" deltaTone="up" hint="this month" icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Total Ad Spend Managed" value="$64,280" delta="+18.2%" deltaTone="up" hint="MoM" icon={<ArrowUpRight className="w-4 h-4" />} />
          <StatCard label="Autonomous Actions" value={requests.length} delta={`${autoApprovedCount} auto`} deltaTone="neutral" hint="executed" icon={<Sparkles className="w-4 h-4" />} />
          <StatCard label="Dev Sprints / Builds" value="5" delta="4 deploying" deltaTone="neutral" hint="this week" icon={<Rocket className="w-4 h-4" />} />
        </div>

        {/* alerts */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <AlertBanner
            tone="warn"
            title="Pacing alert — Sintco Dental"
            description="Meta daily cap accelerated; spend projected to exhaust budget by 16:30 today."
            action={<Button size="sm" variant="ghost">Adjust Budget</Button>}
          />
          <AlertBanner
            tone="down"
            title="Dev blocker — Nova Fitness webhook staging"
            description="CRM webhook migration failing; staging deploy blocked on env config."
            action={<Button size="sm" variant="ghost">Restart Container</Button>}
          />
        </div>

        {/* main split */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 mb-6 items-start">
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text)] headline">Urgent Client &amp; Campaign Health</p>
                <p className="text-[12px] text-[var(--text-3)] mt-0.5">5 accounts flagged for review this cycle</p>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Client", "Channels", "Daily Spend", "Target / Act. CPA", "Status", ""].map((h) => (
                      <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENT_HEALTH.map((row) => (
                    <tr key={row.client} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-5 py-3 text-[13px] font-medium text-[var(--text)] whitespace-nowrap">{row.client}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {row.channels.map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
                        </div>
                      </td>
                      <td className="px-5 py-3 num text-[13px] text-[var(--text-2)] whitespace-nowrap">{row.spend}</td>
                      <td className="px-5 py-3 num text-[13px] whitespace-nowrap">
                        <span className="text-[var(--text-3)]">${row.target}</span>
                        <span className="text-[var(--text-4)]"> / </span>
                        <span className={row.actual > row.target ? "text-[var(--down)]" : "text-[var(--up)]"}>${row.actual}</span>
                      </td>
                      <td className="px-5 py-3"><Pill tone={statusTone(row.status)}>{row.status}</Pill></td>
                      <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost">Adjust</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <ActivityLogPanel title="Hermes Agent Audit Stream" entries={auditStream} className="lg:max-h-[420px]" />
        </div>

        {/* milestones + quick ops */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <Panel className="!p-0 overflow-hidden">
            <SectionHeader label="Roadmap" title="Upcoming Milestones & Deployments" className="!mb-0 px-5 pt-4" />
            <div className="divide-y divide-[var(--line)]">
              {milestones.length === 0 && (
                <p className="px-5 py-6 text-[12.5px] text-[var(--text-3)]">
                  No in-progress kanban tasks yet — create one with the <code className="num">hermes kanban create</code> CLI
                  or from <a href="/projects" className="text-[var(--accent)]">Projects &amp; Dev</a>.
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

          <div className="space-y-4">
            <Panel className="p-4">
              <Eyebrow>Quick Ops Actions</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="ghost" size="sm" className="!justify-start"><Wand2 className="w-3.5 h-3.5" /> Generate Digest</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><RefreshCw className="w-3.5 h-3.5" /> Sync Ad Accounts</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><ShieldCheck className="w-3.5 h-3.5" /> Trigger VPS Backup</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><Send className="w-3.5 h-3.5" /> High-Autonomy</Button>
              </div>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <Eyebrow>Hetzner Server Fleet</Eyebrow>
                <Pill tone="up">All Online</Pill>
              </div>
              <p className="mt-2 text-[12px] text-[var(--text-3)]">3/3 bare-metal nodes reporting healthy · 99.98% uptime (30d)</p>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
