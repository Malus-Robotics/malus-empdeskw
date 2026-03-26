import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session     = cookieStore.get("admin_session");
    if (!session || session.value !== process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId } = await context.params;

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        id: true, employeeId: true, name: true,
        email: true, department: true, createdAt: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const records = await prisma.attendance.findMany({
      where:   { employeeId },
      orderBy: { clockIn: "desc" },
    });

    return NextResponse.json({ employee, records });
  } catch (error) {
    console.error("Admin employee detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}