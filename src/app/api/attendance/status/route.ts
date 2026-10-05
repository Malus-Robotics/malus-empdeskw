import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { autoClockOutStaleSessions } from "@/lib/autoClockOut";

export async function POST(req: Request) {
  const { employeeId } = await req.json();

  // ✅ Run lazy cleanup first — catches anyone the cron may have missed
  await autoClockOutStaleSessions();

  const last = await prisma.attendance.findFirst({
    where: { employeeId },
    orderBy: { clockIn: "desc" },
  });

  if (!last || last.clockOut) {
    return NextResponse.json({ status: "OUT", clockInTime: null });
  }

  return NextResponse.json({ status: "IN", clockInTime: last.clockIn });
}