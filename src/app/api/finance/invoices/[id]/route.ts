import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH { status?, paidAt?, issuedAt?, dueAt?, amount?, notes? } — status transitions
// (draft → sent → paid/overdue/void), or a manual field correction.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof b.status === "string") {
    if (!["draft", "sent", "paid", "overdue", "void"].includes(b.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = b.status;
    if (b.status === "paid" && !existing.paidAt) data.paidAt = new Date();
    if (b.status === "sent" && !existing.issuedAt) data.issuedAt = new Date();
  }
  if (b.dueAt !== undefined) data.dueAt = b.dueAt ? new Date(b.dueAt) : null;
  if (b.amount !== undefined) data.amount = Number(b.amount);
  if (typeof b.notes === "string" || b.notes === null) data.notes = b.notes;

  const invoice = await prisma.invoice.update({ where: { id }, data });
  return NextResponse.json({ invoice });
}
