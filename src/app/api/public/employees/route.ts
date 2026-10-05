// ============================================================
// EMPLOYEE PORTAL REPO — src/app/api/public/employees/route.ts
//
// Lets the PM tool populate an owner dropdown with real
// employees instead of free text. Protected by a shared secret
// (not a user session, since the PM tool is calling server-to-
// server) — add PM_TOOL_API_KEY to your .env and give the PM
// tool the same value to send back.
// ============================================================

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key || key !== process.env.PM_TOOL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    select: { employeeId: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees });
}