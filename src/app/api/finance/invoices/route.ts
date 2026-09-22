import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = { in: status.split(",") };

  const invoices = await prisma.invoice.findMany({
    where, include: { client: { select: { id: true, clientName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices, total: invoices.length });
}

// POST { clientId, number, amount, currency?, description?, dueAt?, recurringServiceId? } → manual invoice entry.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const clientId = (b.clientId || "").toString();
  const number = (b.number || "").toString().trim();
  const amount = Number(b.amount);
  if (!clientId || !number || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "clientId, number, and amount are required" }, { status: 400 });
  }
  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      number: number.slice(0, 60),
      amount,
      currency: (b.currency || "USD").toString(),
      description: b.description ? b.description.toString() : null,
      status: (b.status || "draft").toString(),
      dueAt: b.dueAt ? new Date(b.dueAt) : null,
      issuedAt: b.issuedAt ? new Date(b.issuedAt) : null,
      recurringServiceId: b.recurringServiceId ? b.recurringServiceId.toString() : null,
      notes: b.notes ? b.notes.toString() : null,
    },
  });
  return NextResponse.json({ invoice });
}
