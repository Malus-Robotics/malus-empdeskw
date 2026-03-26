import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  const { employeeId, action, timesheet, projectName, projectCode } = await req.json();

  const employee = await prisma.employee.findUnique({
    where: { employeeId }
  });

  if (!employee) {
    return NextResponse.json({
      success: false,
      error: "Employee not found"
    });
  }

  const last = await prisma.attendance.findFirst({
    where: { employeeId },
    orderBy: { clockIn: "desc" }
  });

  // ================= CLOCK IN =================

  if (action === "CLOCK_IN") {

    if (last && !last.clockOut) {
      return NextResponse.json({
        success: false,
        error: "Already clocked in",
        status: "IN",
        clockInTime: last.clockIn
      });
    }

    const now = new Date();

    await prisma.attendance.create({
      data: {
        employeeId,
        clockIn: now
      }
    });

    return NextResponse.json({
      success: true,
      message: "Clock in recorded",
      status: "IN",
      clockInTime: now
    });
  }

  // ================= CLOCK OUT =================

  if (action === "CLOCK_OUT") {

    if (!last || last.clockOut) {
      return NextResponse.json({
        success: false,
        error: "You must clock in first",
        status: "OUT",
        clockInTime: null
      });
    }

    if (!timesheet) {
      return NextResponse.json({
        success: false,
        error: "Timesheet required before clock out",
        status: "IN",
        clockInTime: last.clockIn
      });
    }

    const now = new Date();

    await prisma.attendance.update({
      where: { id: last.id },
      data: {
        clockOut: now,
        timesheet,
        projectName,
        projectCode
      }
    });

    return NextResponse.json({
      success: true,
      message: "Clock out recorded",
      status: "OUT",
      clockInTime: null
    });
  }

  return NextResponse.json({
    success: false,
    error: "Invalid action"
  });
}