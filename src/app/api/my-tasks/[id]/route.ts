// ============================================================
// EMPLOYEE PORTAL REPO — src/app/api/my-tasks/[id]/route.ts
// PATCH: update status/remarks/actionTaken/pendingPoints on one
// Progress entry — only if it belongs to the logged-in employee.
// ============================================================

import { connectDB } from "@/lib/mongodb";
import Progress from "@/models/Progress";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

async function getSessionEmployeeId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId?: string };
    return payload.employeeId || null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const employeeId = await getSessionEmployeeId(req);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const entry = await Progress.findById(id);
  if (!entry) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Ownership check: only the assigned employee can update their own entry.
  // Also allow the legacy fallback (no ownerId yet, name-based match) so
  // old entries aren't permanently locked out until backfilled.
  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  const isOwner =
    entry.ownerId === employeeId ||
    (!entry.ownerId && employee && entry.owner?.trim().toLowerCase() === employee.name.trim().toLowerCase());

  if (!isOwner) return NextResponse.json({ error: "Not your task" }, { status: 403 });

  const body = await req.json();
  const { status, remarks, actionTaken, pendingPoints } = body as {
    status?: string; remarks?: string; actionTaken?: string; pendingPoints?: string;
  };

  if (status !== undefined) entry.status = status;
  if (remarks !== undefined) entry.remarks = remarks;
  if (actionTaken !== undefined) entry.actionTaken = actionTaken;
  if (pendingPoints !== undefined) entry.pendingPoints = pendingPoints;
  entry.lastUpdated = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  await entry.save();

  return NextResponse.json({ success: true, task: entry });
}