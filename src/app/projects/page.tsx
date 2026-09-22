"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { GitBranch, Plus, Trash2, Zap } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow, StatCard } from "@/components/ui/kit";

interface HermesTask {
  id: string;
  board: string;
  title: string;
  assignee: string | null;
  status: string;
  priority: number | null;
  result: string | null;
  clientId: string | null;
  type: string | null;
  client: { id: string; clientName: string } | null;
  updatedAt: string;
  syncedAt: string;
}

interface Client { id: string; clientName: string }

const WORK_TYPES = [
  { value: "content", label: "Content" },
  { value: "ads", label: "Ads" },
  { value: "seo", label: "SEO" },
  { value: "web", label: "Web" },
  { value: "creative", label: "Creative" },
];

// Reused verbatim from the orphaned src/app/hermes/page.tsx's TaskBoard —
// don't invent a new status mapping, this is the one already proven there.
const HERMES_COLUMN_ORDER = ["triage", "todo", "ready", "running", "review", "blocked", "done"] as const;
function normStatus(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "");
}
function hermesColumnFor(status: string): string {
  const k = normStatus(status);
  for (const c of HERMES_COLUMN_ORDER) if (k.includes(c)) return c;
  if (k.includes("progress") || k.includes("doing")) return "running";
  if (k.includes("complete")) return "done";
  return "triage";
}

// Map the 7-bucket Hermes status scheme onto this screen's 4 visual columns.
const UI_COLUMNS = ["Scoping & Backlog", "In Progress / Active Build", "QA & Review", "Production Deployed"] as const;
type UiColumn = (typeof UI_COLUMNS)[number];
function uiColumnFor(status: string): UiColumn {
  const col = hermesColumnFor(status);
  if (col === "running" || col === "blocked") return "In Progress / Active Build";
  if (col === "review") return "QA & Review";
  if (col === "done") return "Production Deployed";
  return "Scoping & Backlog";
}
function columnTone(col: UiColumn): "neutral" | "accent" | "warn" | "up" {
  if (col === "In Progress / Active Build") return "accent";
  if (col === "QA & Review") return "warn";
  if (col === "Production Deployed") return "up";
  return "neutral";
}
function toneColor(tone: "neutral" | "accent" | "warn" | "up") {
  return tone === "accent" ? "var(--accent)" : tone === "warn" ? "var(--warn)" : tone === "up" ? "var(--up)" : "var(--text-4)";
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  if (Number.isNaN(diff)) return "";
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<HermesTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getJSON<{ tasks: HermesTask[]; total: number }>("/api/hermes/tasks");
    if (data) setTasks(data.tasks ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    getJSON<{ clients: Client[] }>("/api/clients").then((d) => { if (d) setClients(d.clients ?? []); });
  }, []);

  const tagTask = useCallback(async (id: string, patch: { clientId?: string | null; type?: string | null }) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await fetch(`/api/hermes/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }, [load]);

  const filtered = tasks.filter(
    (t) => (!typeFilter || t.type === typeFilter) && (!clientFilter || t.clientId === clientFilter)
  );
  const columns = UI_COLUMNS.map((name) => ({
    name,
    tone: columnTone(name),
    tasks: filtered.filter((t) => uiColumnFor(t.status) === name),
  }));

  // Derived from real task data: "done" tasks bucketed by day over the last 7 days.
  const velocity = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = new Map<string, number>();
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(d.toDateString(), 0);
    }
    for (const t of tasks) {
      if (hermesColumnFor(t.status) !== "done") continue;
      const d = new Date(t.updatedAt);
      const key = d.toDateString();
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([key, count]) => ({ day: days[new Date(key).getDay()], count }));
  })();
  const totalDone7d = velocity.reduce((n, v) => n + v.count, 0);

  return (
    <>
      <ConsoleTopBar
        section="Work"
        actions={<Button variant="accent" size="sm"><Plus className="w-3.5 h-3.5" /> New Dev Ticket</Button>}
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Work
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)]">
              Live Hermes kanban board (<span className="num">{filtered.length}</span> of {tasks.length} task{tasks.length === 1 ? "" : "s"})
              {" · "}synced {loaded && tasks[0] ? timeAgo(tasks[0].syncedAt) : "…"}
            </p>
          </div>
          <Button variant="ghost" size="sm"><GitBranch className="w-3.5 h-3.5" /> Trigger CI/CD Pipeline</Button>
        </div>

        {/* filters — type is a tag, not a separate module (content/ads/seo/web/
            creative all live on one board); client scopes to a single client's work */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${!typeFilter ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--text-3)]"}`}
          >
            All types
          </button>
          {WORK_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(typeFilter === t.value ? null : t.value)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${typeFilter === t.value ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--text-3)]"}`}
            >
              {t.label}
            </button>
          ))}
          <select
            value={clientFilter ?? ""}
            onChange={(e) => setClientFilter(e.target.value || null)}
            className="ml-auto bg-transparent text-[12px] text-[var(--text-2)] px-2.5 py-1.5 rounded-full border border-[var(--line)] outline-none"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </select>
        </div>

        {/* kanban board */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 items-start">
          {columns.map((col) => (
            <div key={col.name}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneColor(col.tone) }} />
                <span className="eyebrow !text-[10.5px]">{col.name}</span>
                <span className="num text-[10.5px] text-[var(--text-4)] ml-auto">{col.tasks.length}</span>
              </div>
              <div className="space-y-2.5">
                {!loaded && <Panel className="p-3.5"><div className="sk h-16 rounded-[var(--r-md)]" /></Panel>}
                {loaded && col.tasks.length === 0 && (
                  <p className="text-[11.5px] text-[var(--text-3)] px-1">No tasks in this stage.</p>
                )}
                {col.tasks.map((t) => (
                  <Panel key={t.id} className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone="neutral">{t.status}</Pill>
                      {t.priority != null && t.priority >= 8 && <Pill tone="down">High</Pill>}
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-[var(--text)] leading-snug">{t.title}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-3)]">{t.assignee || "Unassigned"} · {t.board}</p>
                    <p className="mt-1.5 num text-[10.5px] text-[var(--text-4)]">Updated {timeAgo(t.updatedAt)}</p>
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--line)] flex gap-1.5">
                      <select
                        value={t.type ?? ""}
                        onChange={(e) => tagTask(t.id, { type: e.target.value || null })}
                        className="flex-1 min-w-0 bg-transparent text-[10.5px] text-[var(--text-3)] px-1.5 py-1 rounded-[6px] border border-[var(--line)] outline-none"
                      >
                        <option value="">No type</option>
                        {WORK_TYPES.map((wt) => (
                          <option key={wt.value} value={wt.value}>{wt.label}</option>
                        ))}
                      </select>
                      <select
                        value={t.clientId ?? ""}
                        onChange={(e) => tagTask(t.id, { clientId: e.target.value || null })}
                        className="flex-1 min-w-0 bg-transparent text-[10.5px] text-[var(--text-3)] px-1.5 py-1 rounded-[6px] border border-[var(--line)] outline-none"
                      >
                        <option value="">No client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.clientName}</option>
                        ))}
                      </select>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* stats row */}
        <div className="grid lg:grid-cols-[1fr_260px_260px] gap-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eyebrow>Weekly Deploy Velocity</Eyebrow>
              <span className="num text-[13px] font-semibold text-[var(--text)]">{totalDone7d} completed (7d)</span>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <StatCard label="Target Cluster Uptime" value="2 Clusters" delta="Active" deltaTone="up" hint="stg-01, stg-02" icon={<Zap className="w-4 h-4" />} />

          <Panel className="p-4 flex flex-col justify-between">
            <div>
              <Eyebrow>Ad-Hoc Worker</Eyebrow>
              <p className="mt-2 text-[11.5px] text-[var(--text-3)]">Trigger an emergency cache-bust and edge dispatch for any active client stack.</p>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 !justify-center"><Trash2 className="w-3.5 h-3.5" /> Purge Edge Cache</Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
