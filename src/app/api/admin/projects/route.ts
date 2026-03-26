// ============================================================
// NEW: src/app/api/admin/projects/route.ts  (admin manages projects)
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
 
async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === process.env.ADMIN_SESSION_SECRET;
}
 
function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
 
// GET /api/admin/projects
export async function GET() {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const projects = await prisma.project.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
 
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Admin projects list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
// POST /api/admin/projects  — create a project
export async function POST(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { code, name, client, status } = await req.json();
 
    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "code and name are required." }, { status: 400 });
    }
 
    const existing = await prisma.project.findUnique({ where: { code: code.trim() } });
    if (existing) {
      return NextResponse.json({ error: "A project with this code already exists." }, { status: 409 });
    }
 
    const project = await prisma.project.create({
      data: {
        code:   code.trim().toUpperCase(),
        name:   name.trim(),
        client: client?.trim() || null,
        status: (status || "ACTIVE").toUpperCase() as any,
      },
    });
 
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Admin project create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
// PATCH /api/admin/projects  — update a project
export async function PATCH(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { id, code, name, client, status } = await req.json();
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
 
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
 
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(code   ? { code:   code.trim().toUpperCase() } : {}),
        ...(name   ? { name:   name.trim()               } : {}),
        ...(client !== undefined ? { client: client?.trim() || null } : {}),
        ...(status ? { status: status.toUpperCase() as any } : {}),
      },
    });
 
    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Admin project update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
// DELETE /api/admin/projects?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
 
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
 
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Project deleted." });
  } catch (error) {
    console.error("Admin project delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 