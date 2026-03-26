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

    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, employeeId: true, name: true,
        email: true, department: true, createdAt: true,
      },
    });

    return NextResponse.json({ data: employees });
  } catch (error) {
    console.error("Admin employees list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}