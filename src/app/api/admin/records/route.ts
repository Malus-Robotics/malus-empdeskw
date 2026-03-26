import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session     = cookieStore.get("admin_session");
    if (!session || session.value !== process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.attendance.findMany({
      include: {
        employee: {
          select: {
            id: true, employeeId: true, name: true, email: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
      take: 500,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Admin records error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}