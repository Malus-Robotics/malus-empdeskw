 
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
 
// GET /api/projects  — returns only ACTIVE projects for dropdowns
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    jwt.verify(token, process.env.JWT_SECRET!); // just validate, no payload needed
 
    const projects = await prisma.project.findMany({
      where:   { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select:  { id: true, code: true, name: true, client: true },
    });
 
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Projects fetch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}