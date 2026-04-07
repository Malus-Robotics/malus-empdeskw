import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const IST = "Asia/Kolkata";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Employee ID required" },
        { status: 400 }
      );
    }

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        clockOut: { not: null },
      },
      orderBy: { clockIn: "desc" },
      take: 20,
    });

    const history = records
      .map((item) => {
        if (!item.clockIn || !item.clockOut) return null;

        const clockInTime  = new Date(item.clockIn);
        const clockOutTime = new Date(item.clockOut);

        const durationSec = Math.floor(
          (clockOutTime.getTime() - clockInTime.getTime()) / 1000
        );
        const h = Math.floor(durationSec / 3600);
        const m = Math.floor((durationSec % 3600) / 60);

        return {
          // ✅ All three use IST explicitly
          date: clockInTime.toLocaleDateString("en-IN", { timeZone: IST }),
          clockIn: clockInTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: IST,
          }),
          clockOut: clockOutTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: IST,
          }),
          duration:    `${h}h ${m}m`,
          projectName: item.projectName || "No Project",
          projectCode: item.projectCode || "—",
          timesheet:   item.timesheet   || "",
        };
      })
      .filter(Boolean);

    return NextResponse.json(history);
  } catch (error) {
    console.error("History API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
