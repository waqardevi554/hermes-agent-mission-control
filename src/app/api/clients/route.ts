import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { clientName: "asc" } });
  return NextResponse.json({ clients, total: clients.length });
}

// POST { clientName, status?, productManagerName?, services?, renewalDate? } → manual client creation.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const clientName = (b.clientName || "").toString().trim();
  if (!clientName) return NextResponse.json({ error: "clientName required" }, { status: 400 });
  const client = await prisma.client.create({
    data: {
      clientName: clientName.slice(0, 200),
      status: b.status ? b.status.toString() : "active",
      productManagerName: b.productManagerName ? b.productManagerName.toString() : null,
      services: Array.isArray(b.services) ? b.services : [],
      renewalDate: b.renewalDate ? new Date(b.renewalDate) : null,
    },
  });
  return NextResponse.json({ client });
}
