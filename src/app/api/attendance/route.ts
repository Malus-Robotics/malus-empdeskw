import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { employeeId, action, timesheet, projectName, projectCode } = await req.json();

  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  if (!employee) {
    return NextResponse.json({ success: false, error: "Employee not found" });
  }

  const last = await prisma.attendance.findFirst({
    where: { employeeId },
    orderBy: { clockIn: "desc" },
  });

  // ================= CLOCK IN =================
  if (action === "CLOCK_IN") {
    if (last && !last.clockOut) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ✅ Stale session from a previous day — auto-close it so user isn't blocked
      if (last.clockIn && last.clockIn < todayStart) {
        const autoOut = new Date(last.clockIn);
        autoOut.setHours(23, 59, 0, 0);

        await prisma.attendance.update({
          where: { id: last.id },
          data: {
            clockOut: autoOut,
            timesheet: "Auto clock-out at midnight (system)",
            projectName: last.projectName ?? "",
            projectCode: last.projectCode ?? "",
          },
        });
        // Falls through to create a fresh clock-in below
      } else {
        // Genuine same-day duplicate — block it
        return NextResponse.json({
          success: false,
          error: "Already clocked in",
          status: "IN",
          clockInTime: last.clockIn,
        });
      }
    }

    const now = new Date();
    await prisma.attendance.create({ data: { employeeId, clockIn: now } });
    return NextResponse.json({
      success: true,
      message: "Clock in recorded",
      status: "IN",
      clockInTime: now,
    });
  }

  // ================= CLOCK OUT =================
  if (action === "CLOCK_OUT") {
    if (!last || last.clockOut) {
      return NextResponse.json({
        success: false,
        error: "You must clock in first",
        status: "OUT",
        clockInTime: null,
      });
    }
    if (!timesheet) {
      return NextResponse.json({
        success: false,
        error: "Timesheet required before clock out",
        status: "IN",
        clockInTime: last.clockIn,
      });
    }

    const now = new Date();
    await prisma.attendance.update({
      where: { id: last.id },
      data: { clockOut: now, timesheet, projectName, projectCode },
    });
    return NextResponse.json({
      success: true,
      message: "Clock out recorded",
      status: "OUT",
      clockInTime: null,
    });
  }

  return NextResponse.json({ success: false, error: "Invalid action" });
}
