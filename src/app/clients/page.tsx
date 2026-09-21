"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Download, Plus, RefreshCw } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, StatCard, Eyebrow, ActivityLogPanel, type ActivityLogEntry } from "@/components/ui/kit";

const ACCOUNTS = [
  { client: "Sintco Dental", score: 87, retainer: "$6,800/mo · Growth", channels: ["Meta", "Google"], spend: "$12,400", roas: "4.6x", trend: [4, 6, 5, 8, 7, 9, 10] },
  { client: "Apex Luxury Motors", score: 84, retainer: "$6,000/mo · Performance", channels: ["Meta"], spend: "$8,600", roas: "3.9x", trend: [3, 4, 4, 5, 6, 5, 7] },
  { client: "Nova Fitness Studio", score: 91, retainer: "$3,200/mo · Leads", channels: ["Meta"], spend: "$6,200", roas: "5.1x", trend: [5, 5, 6, 7, 8, 9, 9] },
  { client: "Solaris Energy Co", score: 68, retainer: "$5,500/mo · Maintenance", channels: ["Google"], spend: "$19,300", roas: "2.1x", trend: [8, 7, 6, 5, 4, 4, 3] },
  { client: "Clara Boutique", score: 74, retainer: "$1,800/mo · Retainer Only", channels: ["Meta", "TikTok"], spend: "$1,600", roas: "—", trend: [2, 3, 2, 2, 3, 2, 2] },
];

const AD_UNITS = [
  { name: "Q4 ABX Enterprise Plus", client: "Sintco Dental", status: "Active" as const, spend: "$200/day", roas: "4.6x" },
  { name: "Meta Q4 Freight Push", client: "Sintco Dental", status: "Paused" as const, spend: "$180/day", roas: "3.2x" },
  { name: "Google PMax — Leads", client: "Nova Fitness Studio", status: "Active" as const, spend: "$140/day", roas: "5.1x" },
];

const AGENT_LOG: ActivityLogEntry[] = [
  { id: "1", tone: "accent", timestamp: "Yesterday, 4:14 PM", message: <><b className="text-[var(--text)]">Bid strategy adjusted</b> — target ROAS raised to 4.5x after weekend CPA drift; CPA down 8.4% since.</> },
  { id: "2", tone: "neutral", timestamp: "Yesterday, 9:02 AM", message: "Synced Google Ads spend for Solaris Energy Co — flagged for review." },
];

function MiniTrend({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-24 h-9">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#grad-${color.replace("#", "")})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ClientsPage() {
  const [filter, setFilter] = useState<"All" | "Meta" | "Google" | "TikTok">("All");
  const filtered = ACCOUNTS.filter((a) => filter === "All" || a.channels.includes(filter));

  return (
    <>
      <ConsoleTopBar
        section="Clients & Campaigns"
        actions={
          <>
            <Button variant="ghost" size="sm"><RefreshCw className="w-3.5 h-3.5" /> Sync Live Metrics</Button>
            <Button variant="accent" size="sm"><Plus className="w-3.5 h-3.5" /> Onboard Client</Button>
          </>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Client &amp; Campaign Hub
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)]">Portfolio health, spend pacing, and retainer status across all managed accounts.</p>
          </div>
          <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /> Export Report</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Accounts" value="14" delta="+2" deltaTone="up" hint="onboarding" />
          <StatCard label="Total Ad Spend Run-Rate" value="$64,280" delta="+18.2%" deltaTone="up" hint="MoM" />
          <StatCard label="Blended ROAS" value="3.82x" delta="+0.4x" deltaTone="up" hint="vs last month" />
          <StatCard label="Blended Lead CPA" value="$24.10" delta="-7.3%" deltaTone="up" hint="vs goal" />
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-[var(--text)] headline">Managed Accounts</p>
              <div className="flex gap-1.5">
                {(["All", "Meta", "Google", "TikTok"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors ${
                      filter === c
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "text-[var(--text-2)] border-[var(--line)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Client & Score", "Retainer", "Channels", "Spend / ROAS", "Trend"].map((h) => (
                      <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.client} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--accent)] flex items-center justify-center text-[11px] font-bold headline shrink-0">
                            {row.client.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[var(--text)] truncate">{row.client}</p>
                            <p className="text-[11px] num text-[var(--text-3)]">Health {row.score}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] text-[var(--text-2)] whitespace-nowrap">{row.retainer}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {row.channels.map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 num text-[13px] whitespace-nowrap">
                        <span className="text-[var(--text)]">{row.spend}</span>
                        <span className="text-[var(--text-4)]"> · </span>
                        <span className={row.roas !== "—" && parseFloat(row.roas) >= 3 ? "text-[var(--up)]" : "text-[var(--text-3)]"}>{row.roas}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <MiniTrend data={row.trend} color={row.score >= 80 ? "#1a7f37" : row.score >= 70 ? "#7e5700" : "#ba1a1a"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel className="!p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line)]"><Eyebrow>Active Ad Units</Eyebrow></div>
              <div className="divide-y divide-[var(--line)]">
                {AD_UNITS.map((u) => (
                  <div key={u.name} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-medium text-[var(--text)] truncate">{u.name}</p>
                      <Pill tone={u.status === "Active" ? "up" : "neutral"}>{u.status}</Pill>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-3)]">{u.client}</p>
                    <p className="mt-1 num text-[11.5px] text-[var(--text-2)]">{u.spend} · {u.roas} ROAS</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <Eyebrow>Retainer &amp; Billing</Eyebrow>
                <Pill tone="up">Good Standing</Pill>
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-[var(--text-3)]">Oct 2024 Retainer</span><span className="num text-[var(--text)]">Paid $14,000</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-3)]">Ad Spend Auto-Charge</span><span className="num text-[var(--up)]">Settled</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-3)]">Nov 2024 Invoice</span><span className="num text-[var(--text)]">Scheduled Oct 30</span></div>
              </div>
            </Panel>

            <ActivityLogPanel title="Hermes Agent Log" entries={AGENT_LOG} />
          </div>
        </div>
      </div>
    </>
  );
}
