"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow, StatCard, EmptyState } from "@/components/ui/kit";

interface Client { id: string; clientName: string }
interface Invoice {
  id: string; number: string; amount: number; currency: string; status: string;
  description: string | null; dueAt: string | null; paidAt: string | null; createdAt: string;
  client: { id: string; clientName: string } | null;
}
interface RecurringService {
  id: string; name: string; amount: number; currency: string; cadence: string; status: string;
  client: { id: string; clientName: string } | null;
}

const invoiceTone: Record<string, "up" | "warn" | "down" | "neutral"> = {
  paid: "up", sent: "warn", overdue: "down", draft: "neutral", void: "neutral",
};

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function AddInvoiceForm({ clients, onCreated }: { clients: Client[]; onCreated: () => void }) {
  const [clientId, setClientId] = useState("");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!clientId || !number.trim() || !amount) return;
    setBusy(true);
    try {
      await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, number: number.trim(), amount: Number(amount), status: "sent" }),
      });
      setNumber(""); setAmount("");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-4">
      <Eyebrow>Add invoice</Eyebrow>
      <div className="mt-3 space-y-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--line-strong)]">
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
        </select>
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Invoice # (e.g. INV-2026-001)" className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)" type="number" className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
        <Button variant="accent" size="sm" className="w-full !justify-center" disabled={busy} onClick={submit}>
          <Plus className="w-3.5 h-3.5" /> Create Invoice
        </Button>
      </div>
    </Panel>
  );
}

function AddServiceForm({ clients, onCreated }: { clients: Client[]; onCreated: () => void }) {
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!clientId || !name.trim() || !amount) return;
    setBusy(true);
    try {
      await fetch("/api/finance/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: name.trim(), amount: Number(amount), cadence }),
      });
      setName(""); setAmount("");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-4">
      <Eyebrow>Add recurring service</Eyebrow>
      <div className="mt-3 space-y-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--line-strong)]">
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name (e.g. Meta Ads Retainer)" className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)" type="number" className="flex-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-2 py-2 text-[12.5px] text-[var(--text)] outline-none">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="project">Project</option>
          </select>
        </div>
        <Button variant="accent" size="sm" className="w-full !justify-center" disabled={busy} onClick={submit}>
          <Plus className="w-3.5 h-3.5" /> Add Service
        </Button>
      </div>
    </Panel>
  );
}

export default function FinancePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<RecurringService[]>([]);
  const [tab, setTab] = useState<"All" | "sent" | "paid" | "overdue">("All");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [c, i, s] = await Promise.all([
      getJSON<{ clients: Client[] }>("/api/clients"),
      getJSON<{ invoices: Invoice[] }>("/api/finance/invoices"),
      getJSON<{ services: RecurringService[] }>("/api/finance/services"),
    ]);
    if (c) setClients(c.clients ?? []);
    if (i) setInvoices(i.invoices ?? []);
    if (s) setServices(s.services ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  const filtered = invoices.filter((inv) => tab === "All" || inv.status === tab);

  const activeServices = services.filter((s) => s.status === "active");
  const mrr = activeServices
    .filter((s) => s.cadence === "monthly")
    .reduce((sum, s) => sum + s.amount, 0);
  const collectedThisMonth = invoices
    .filter((inv) => inv.status === "paid" && inv.paidAt && new Date(inv.paidAt).getMonth() === new Date().getMonth())
    .reduce((sum, inv) => sum + inv.amount, 0);
  const outstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;
  const clientsWithService = new Set(activeServices.map((s) => s.client?.id)).size;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <>
      <ConsoleTopBar
        section="Finance & Pipeline"
        actions={<Button variant="ghost" size="sm"><RefreshCw className="w-3.5 h-3.5" /> Sync QuickBooks</Button>}
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Financial Engine
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)]">
              Tasheer Digital agency operating ledger — real recurring revenue and invoices, entered manually until a billing integration exists.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Monthly Recurring Revenue" value={fmt(mrr)} delta={`${activeServices.length} active`} deltaTone="up" />
          <StatCard label="Collected This Month" value={fmt(collectedThisMonth)} delta="paid invoices" deltaTone="neutral" />
          <StatCard label="Outstanding" value={fmt(outstanding)} delta={overdueCount ? `${overdueCount} overdue` : "none overdue"} deltaTone={overdueCount ? "down" : "up"} />
          <StatCard label="Clients Billed" value={clientsWithService} delta="with an active service" deltaTone="neutral" />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start mb-6">
          <div className="space-y-5">
            <Panel className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Eyebrow>Recurring Services</Eyebrow>
                <span className="num text-[12px] text-[var(--text-3)]">{activeServices.length} active</span>
              </div>
              {activeServices.length === 0 ? (
                <p className="text-[12px] text-[var(--text-3)] py-4 text-center">No recurring services yet — add one on the right.</p>
              ) : (
                <div className="space-y-1.5">
                  {activeServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-[var(--r-sm)] border border-[var(--line)] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-[var(--text)] truncate">{s.name}</p>
                        <p className="text-[10.5px] text-[var(--text-3)]">{s.client?.clientName ?? "—"} · {s.cadence}</p>
                      </div>
                      <span className="num text-[12.5px] font-semibold text-[var(--text)] shrink-0">${s.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="!p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[var(--text)] headline">Ledger &amp; Invoices</p>
                <div className="flex gap-1.5">
                  {(["All", "sent", "paid", "overdue"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors capitalize ${
                        tab === t ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "text-[var(--text-2)] border-[var(--line)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {loaded && filtered.length === 0 ? (
                <EmptyState title="No invoices yet." hint="Add one on the right to start the ledger." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        {["Invoice #", "Client", "Amount", "Status", "Created"].map((h) => (
                          <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv) => (
                        <tr key={inv.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                          <td className="px-5 py-3 num text-[12.5px] text-[var(--text-3)] whitespace-nowrap">{inv.number}</td>
                          <td className="px-5 py-3">
                            <p className="text-[13px] font-medium text-[var(--text)]">{inv.client?.clientName ?? "—"}</p>
                            {inv.description && <p className="text-[11px] text-[var(--text-3)]">{inv.description}</p>}
                          </td>
                          <td className="px-5 py-3 num text-[13px] text-[var(--text)] whitespace-nowrap">${inv.amount.toLocaleString()}</td>
                          <td className="px-5 py-3"><Pill tone={invoiceTone[inv.status] ?? "neutral"}>{inv.status}</Pill></td>
                          <td className="px-5 py-3 num text-[12px] text-[var(--text-3)] whitespace-nowrap">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <AddInvoiceForm clients={clients} onCreated={load} />
            <AddServiceForm clients={clients} onCreated={load} />
          </div>
        </div>
      </div>
    </>
  );
}
