"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { RotateCw, ShieldCheck, Terminal, Wifi } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow, StatCard } from "@/components/ui/kit";

const SERVERS = [
  {
    name: "PROD-01", role: "Primary", cpu: 22, ram: "4.2 / 8 GB", ramPct: 52, storage: "44 / 120 GB", storagePct: 37, uptime: "312d",
    trend: [18, 20, 19, 24, 22, 26, 22],
  },
  {
    name: "DB-STAGE-01", role: "Web Node", cpu: 15, ram: "3.6 / 8 GB", ramPct: 45, storage: "52 / 240 GB", storagePct: 22, uptime: "189d",
    trend: [12, 14, 13, 16, 15, 17, 15],
  },
  {
    name: "AGENT-WORKER-01", role: "Task-Dedicated", cpu: 64, ram: "6.4 / 16 GB", ramPct: 40, storage: "108 / 240 GB", storagePct: 45, uptime: "21d",
    trend: [40, 52, 48, 60, 55, 68, 64],
  },
];

const CONTAINERS = [
  { name: "tasheer-cloudpanel-core", node: "PROD-01", ports: "443, 80", cpu: "4%", uptime: "42d", status: "Running" as const },
  { name: "sintco-nextjs-prod", node: "PROD-01", ports: "3000", cpu: "8%", uptime: "42d", status: "Running" as const },
  { name: "solaris-mailsearch", node: "DB-STAGE-01", ports: "5000", cpu: "2%", uptime: "12d", status: "Running" as const },
  { name: "hermes-agent-daemon", node: "AGENT-WORKER-01", ports: "—", cpu: "22%", uptime: "21d", status: "Running" as const },
  { name: "postgres-shared-db", node: "DB-STAGE-01", ports: "5432", cpu: "6%", uptime: "189d", status: "Running" as const },
  { name: "redis-cache-bus", node: "AGENT-WORKER-01", ports: "6379", cpu: "1%", uptime: "0m", status: "Restarting" as const },
];

const MONITORS = [
  { url: "api.tasheerdigital.com", uptime: "99.99%", up: true },
  { url: "sintcodental.com", uptime: "99.90%", up: true },
  { url: "apexluxurymotors.io", uptime: "100.0%", up: true },
  { url: "novafitness-crm.app", uptime: "98.70%", up: false },
  { url: "solarisenergy-portal.io", uptime: "99.95%", up: true },
];

const containerTone: Record<string, "up" | "warn"> = { Running: "up", Restarting: "warn" };

export default function InfrastructurePage() {
  return (
    <>
      <ConsoleTopBar
        section="Infrastructure"
        actions={
          <>
            <Button variant="ghost" size="sm"><Terminal className="w-3.5 h-3.5" /> Quick SSH</Button>
            <Button variant="primary" size="sm"><RotateCw className="w-3.5 h-3.5" /> Run Backup Now</Button>
          </>
        }
      />

      <div className="hq-rise">
        <div className="mb-6">
          <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
            Infrastructure &amp; Ops Monitor
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--text-2)]">Live telemetry for Nuremberg bare-metal nodes, Docker workloads, and external endpoints.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Hetzner VPS Nodes" value="3/3" delta="100% Online" deltaTone="up" />
          <StatCard label="Docker Containers" value="18" delta="1 restarting" deltaTone="warn" />
          <StatCard label="Global Uptime (30d)" value="99.98%" delta="+0.02%" deltaTone="up" />
          <StatCard label="SSL / Domain Expiry" value="24" delta="3 expiring" deltaTone="warn" hint="<30d" />
        </div>

        {/* server cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {SERVERS.map((s) => (
            <Panel key={s.name} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--text)]">{s.name}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{s.role}</p>
                </div>
                <Pill tone="up">Online</Pill>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="eyebrow !text-[10px]">CPU Load</span>
                <span className="num text-[12px] font-semibold text-[var(--text)]">{s.cpu}%</span>
              </div>
              <div className="h-10 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.trend.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-[var(--text-3)]">RAM Allocation</span><span className="num text-[var(--text-2)]">{s.ram}</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full bg-[var(--primary)]" style={{ width: `${s.ramPct}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-[var(--text-3)]">NVMe Storage</span><span className="num text-[var(--text-2)]">{s.storage}</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full bg-[var(--text-3)]" style={{ width: `${s.storagePct}%` }} /></div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="num text-[11px] text-[var(--text-3)]">Uptime {s.uptime}</span>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm">Terminal</Button>
                  <Button variant="ghost" size="sm">Reboot</Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between">
              <p className="text-[15px] font-semibold text-[var(--text)] headline">Live Docker Workloads</p>
              <span className="num text-[11.5px] text-[var(--text-3)]">6/18 shown · auto-refresh 30s</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Container / Service", "Node", "Ports", "CPU", "Uptime", "Status"].map((h) => (
                      <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONTAINERS.map((c) => (
                    <tr key={c.name} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-5 py-3 num text-[12.5px] text-[var(--text)] whitespace-nowrap">{c.name}</td>
                      <td className="px-5 py-3 text-[12px] text-[var(--text-2)] whitespace-nowrap">{c.node}</td>
                      <td className="px-5 py-3 num text-[12px] text-[var(--text-3)] whitespace-nowrap">{c.ports}</td>
                      <td className="px-5 py-3 num text-[12px] text-[var(--text-2)] whitespace-nowrap">{c.cpu}</td>
                      <td className="px-5 py-3 num text-[12px] text-[var(--text-3)] whitespace-nowrap">{c.uptime}</td>
                      <td className="px-5 py-3"><Pill tone={containerTone[c.status]}>{c.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel className="!p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line)] flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-[var(--text-3)]" />
                <Eyebrow>External Monitors</Eyebrow>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {MONITORS.map((m) => (
                  <div key={m.url} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[var(--text-2)] truncate">{m.url}</span>
                    <span className={`num text-[11.5px] font-semibold shrink-0 ${m.up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>{m.uptime}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-3)]" />
                <Eyebrow>Ops Guard &amp; Storage</Eyebrow>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between"><span className="text-[var(--text-3)]">VPS Firewall (Default DROP)</span><Pill tone="up">Active</Pill></div>
                <div className="flex justify-between"><span className="text-[var(--text-3)]">Auto-Snapshot Engine</span><Pill tone="up">Daily 03:00 UTC</Pill></div>
                <div className="flex justify-between"><span className="text-[var(--text-3)]">R2 Cold Storage</span><span className="num text-[var(--text-2)]">1.2TB · 20 snapshots</span></div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
