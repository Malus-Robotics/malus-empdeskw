// ============================================================
// EMPLOYEE PORTAL REPO — src/app/api/my-tasks/unread-count/route.ts
// Lightweight — just a number, for the sidebar badge. Does NOT
// mark anything as seen (that happens when /dashboard/tasks
// itself is actually loaded, via my-tasks/route.ts).
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

export async function GET(req: NextRequest) {
  const employeeId = await getSessionEmployeeId(req);
  if (!employeeId) return NextResponse.json({ count: 0 });

  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  if (!employee) return NextResponse.json({ count: 0 });

  await connectDB();

  const count = await Progress.countDocuments({
    seenByOwner: false,
    $or: [
      { ownerId: employeeId },
      {
        ownerId: { $exists: false },
        owner: { $regex: `^${escapeRegex(employee.name.trim())}$`, $options: "i" },
      },
    ],
  });

  return NextResponse.json({ count });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}