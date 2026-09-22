import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const where = clientId ? { clientId } : {};
  const services = await prisma.recurringService.findMany({
    where, include: { client: { select: { id: true, clientName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ services, total: services.length });
}

// POST { clientId, name, amount, currency?, cadence? } → a new recurring revenue line.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const clientId = (b.clientId || "").toString();
  const name = (b.name || "").toString().trim();
  const amount = Number(b.amount);
  if (!clientId || !name || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "clientId, name, and amount are required" }, { status: 400 });
  }
  const service = await prisma.recurringService.create({
    data: {
      clientId,
      name: name.slice(0, 200),
      amount,
      currency: (b.currency || "USD").toString(),
      cadence: (b.cadence || "monthly").toString(),
      status: (b.status || "active").toString(),
      notes: b.notes ? b.notes.toString() : null,
    },
  });
  return NextResponse.json({ service });
}
