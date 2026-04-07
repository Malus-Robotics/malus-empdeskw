// lib/autoClockOut.ts
import { prisma } from "@/lib/prisma";

export async function autoClockOutStaleSessions(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const staleSessions = await prisma.attendance.findMany({
    where: {
      clockOut: null,
      clockIn: { lt: todayStart },
    },
  });

  if (staleSessions.length === 0) return 0;

  await Promise.all(
    staleSessions.map((session) => {
      if (!session.clockIn) return Promise.resolve(); // ✅ null guard

      const autoOut = new Date(session.clockIn); // ✅ now safely Date
      autoOut.setHours(23, 59, 0, 0);

      return prisma.attendance.update({
        where: { id: session.id },
        data: {
          clockOut: autoOut,
          timesheet: "Auto clock-out at midnight (system)",
          projectName: session.projectName ?? "",
          projectCode: session.projectCode ?? "",
        },
      });
    })
  );

  return staleSessions.length;
}
