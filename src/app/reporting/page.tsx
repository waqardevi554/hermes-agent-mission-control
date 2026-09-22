"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, SectionHeader, EmptyState } from "@/components/ui/kit";
import { ApprovalInbox } from "@/components/approval-inbox";

interface Client { id: string; clientName: string }
interface DoneReport {
  id: string;
  title: string;
  result: string | null;
  status: string;
  clientId: string | null;
  createdAt: string;
  costUsd: number | null;
}

const REPORT_TYPES = [
  { value: "weekly-status", label: "Weekly status update" },
  { value: "monthly-summary", label: "Monthly performance summary" },
];

function NewScheduleForm({ clients, onCreated }: { clients: Client[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [schedule, setSchedule] = useState("0 9 * * 1"); // default: 9am every Monday
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setBusy(true);
    try {
      await fetch("/api/hermes/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          schedule,
          name: `report: ${reportType}: ${client.clientName}`,
        }),
      });
      setOpen(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> New report schedule
      </Button>
    );
  }

  return (
    <Panel className="p-4 space-y-3">
      <div className="grid sm:grid-cols-3 gap-2.5">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="bg-transparent text-[13px] px-3 py-2 rounded-[8px] border border-[var(--line)] outline-none"
        >
          <option value="">Select client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.clientName}</option>
          ))}
        </select>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="bg-transparent text-[13px] px-3 py-2 rounded-[8px] border border-[var(--line)] outline-none"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="cron, e.g. 0 9 * * 1"
          className="bg-transparent text-[13px] num px-3 py-2 rounded-[8px] border border-[var(--line)] outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={busy || !clientId}>
          Create schedule
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className="text-[11px] text-[var(--text-3)]">
        Runs on the schedule above; the drafted report lands in the approval queue below for
        review before you send it — nothing is delivered to the client automatically.
      </p>
    </Panel>
  );
}

export default function ReportingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [done, setDone] = useState<DoneReport[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const loadClients = useCallback(async () => {
    try {
      const r = await fetch("/api/clients");
      if (r.ok) setClients((await r.json()).clients ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadDone = useCallback(async () => {
    try {
      const r = await fetch("/api/hermes/requests?kind=report.review&status=done,rejected&take=30");
      if (r.ok) setDone((await r.json()).requests ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => {
    loadDone();
    const iv = setInterval(loadDone, 15000);
    return () => clearInterval(iv);
  }, [loadDone, reloadKey]);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.clientName ?? "—";

  return (
    <>
      <ConsoleTopBar section="Reporting" actions={<NewScheduleForm clients={clients} onCreated={() => setReloadKey((k) => k + 1)} />} />

      <div className="hq-rise space-y-8">
        <div className="mb-2">
          <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
            Reporting
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--text-2)]">
            Agent-drafted client reports, always reviewed here before you send them.
          </p>
        </div>

        <section>
          <SectionHeader label="Needs review" title="Pending report drafts" />
          <ApprovalInbox kindFilter="report.review" />
        </section>

        <section>
          <SectionHeader label="History" title="Approved / rejected" />
          {done.length === 0 ? (
            <Panel className="p-2">
              <EmptyState icon={<FileText className="w-6 h-6" />} title="No report history yet." />
            </Panel>
          ) : (
            <div className="space-y-3">
              {done.map((r) => (
                <Panel key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[14px] font-medium text-[var(--text)]">{r.title}</p>
                      <p className="text-[11.5px] text-[var(--text-3)]">
                        {clientName(r.clientId)} · {new Date(r.createdAt).toLocaleDateString()}
                        {r.costUsd != null && <> · ${r.costUsd.toFixed(4)}</>}
                      </p>
                    </div>
                    <Pill tone={r.status === "done" ? "up" : "down"}>{r.status}</Pill>
                  </div>
                  {r.result && (
                    <p className="text-[12.5px] text-[var(--text-2)] whitespace-pre-wrap line-clamp-4">
                      {r.result}
                    </p>
                  )}
                </Panel>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
