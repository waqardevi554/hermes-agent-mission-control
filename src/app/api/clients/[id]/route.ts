import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → the client plus everything tied to it via clientId, the "show me
// everything about client X" view the architecture plan calls the top requirement.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [tasks, requests, invoices, recurringServices] = await Promise.all([
    prisma.hermesTask.findMany({ where: { clientId: id }, orderBy: { updatedAt: "desc" } }),
    prisma.agentRequest.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.invoice.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" } }),
    prisma.recurringService.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ client, tasks, requests, invoices, recurringServices });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.clientName === "string") data.clientName = b.clientName.slice(0, 200);
  if (typeof b.status === "string" || b.status === null) data.status = b.status;
  if (typeof b.productManagerName === "string" || b.productManagerName === null) data.productManagerName = b.productManagerName;
  if (b.renewalDate !== undefined) data.renewalDate = b.renewalDate ? new Date(b.renewalDate) : null;
  if (Array.isArray(b.services)) data.services = b.services;
  const client = await prisma.client.update({ where: { id }, data });
  return NextResponse.json({ client });
}
