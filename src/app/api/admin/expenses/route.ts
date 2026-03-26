
// ============================================================
// NEW: src/app/api/admin/expenses/route.ts   (admin views all expenses)
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
 
async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === process.env.ADMIN_SESSION_SECRET;
}
 
// GET /api/admin/expenses  — list all expenses with optional filters
export async function GET(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get("status");      // PENDING | APPROVED | REJECTED
    const employeeId = searchParams.get("employeeId");
 
    const expenses = await prisma.expense.findMany({
      where: {
        ...(status     ? { status: status as any }     : {}),
        ...(employeeId ? { employeeId }                : {}),
      },
      include: {
        employee: { select: { name: true, employeeId: true, email: true } },
      },
      orderBy: { submittedOn: "desc" },
      take: 200,
    });
 
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error("Admin expenses list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
// PATCH /api/admin/expenses  — approve or reject an expense
export async function PATCH(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { id, status, remarks } = await req.json();
 
    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "id and status (APPROVED|REJECTED) required." }, { status: 400 });
    }
 
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
 
    const updated = await prisma.expense.update({
      where: { id },
      data:  { status, remarks: remarks || null },
    });
 
    return NextResponse.json({ success: true, expense: updated });
  } catch (error) {
    console.error("Admin expense update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
