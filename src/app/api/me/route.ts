import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
 
interface TokenPayload { employeeId: string; }
 
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
 
  if (!token) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
 
    const employee = await prisma.employee.findUnique({
      where: { employeeId: decoded.employeeId },
      select: { employeeId: true, name: true, email: true, department: true },
    });
 
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
 
    return NextResponse.json({
      employeeId: employee.employeeId,
      name:       employee.name,
      email:      employee.email,
      department: employee.department,
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}