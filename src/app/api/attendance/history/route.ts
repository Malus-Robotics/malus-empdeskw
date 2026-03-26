import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: "Employee ID required"
      });
    }

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        clockOut: {
          not: null
        }
      },
      orderBy: {
        clockIn: "desc"
      },
      take: 20 // 🔥 increased for better dashboard
    });

    const history = records
      .map((item) => {

        if (!item.clockOut) return null;

        const clockInTime = new Date(item.clockIn);
        const clockOutTime = new Date(item.clockOut);

        const durationSec = Math.floor(
          (clockOutTime.getTime() - clockInTime.getTime()) / 1000
        );

        const h = Math.floor(durationSec / 3600);
        const m = Math.floor((durationSec % 3600) / 60);

        return {
          date: clockInTime.toLocaleDateString(),

          clockIn: clockInTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),

          clockOut: clockOutTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),

          duration: `${h}h ${m}m`,

          // ✅ IMPORTANT FIXES
          projectName: item.projectName || "No Project",
          projectCode: item.projectCode || "—",
          timesheet: item.timesheet || "" // 🔥 THIS FIXES YOUR BUTTON
        };

      })
      .filter(Boolean);

    return NextResponse.json(history);

  } catch (error) {

    console.error("History API Error:", error);

    return NextResponse.json({
      success: false,
      error: "Internal server error"
    });
  }
}