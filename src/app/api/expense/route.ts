
// ============================================================
// NEW: src/app/api/expenses/route.ts   (employee submits expense)
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
 
function getEmployeeId(req: NextRequest): string | null {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId: string };
    return decoded.employeeId;
  } catch { return null; }
}
 
// POST /api/expenses  — submit a new expense claim
export async function POST(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
 
    const body = await req.json();
    const { amount, category, description, projectCode, date, billUrls } = body;
 
    if (!amount || !category || !description || !date) {
      return NextResponse.json({ success: false, error: "amount, category, description and date are required." }, { status: 400 });
    }
 
    const expense = await prisma.expense.create({
      data: {
        employeeId,
        amount:      Number(amount),
        category,
        description,
        projectCode: projectCode || null,
        date:        new Date(date),
        billUrls:    billUrls || [],
        status:      "PENDING",
      },
    });
 
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Expense create error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
 
// GET /api/expenses  — fetch all expenses for logged-in employee
export async function GET(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
 
    const expenses = await prisma.expense.findMany({
      where:   { employeeId },
      orderBy: { submittedOn: "desc" },
    });
 
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error("Expense fetch error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
 