import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short",
    year: "numeric", timeZone: "Asia/Kolkata",
  });
}

function calcHours(start: Date, end: Date): string {
  const diffMs  = end.getTime() - start.getTime();
  const hours   = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function totalHoursForEmployee(records: any[]): string {
  let totalMs = 0;
  records.forEach(r => {
    if (r.clockIn && r.clockOut) {
      totalMs += new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime();
    }
  });
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ─── HTML Email Builder ───────────────────────────────────────────────────────

function buildHtmlReport(
  grouped: Record<string, { name: string; employeeId: string; records: any[] }>,
  weekLabel: string
): string {
  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  let employeeBlocks = "";

  for (const id in grouped) {
    const emp        = grouped[id];
    const total      = totalHoursForEmployee(emp.records);
    const sessions   = emp.records.length;
    const completed  = emp.records.filter(r => r.clockOut).length;
    const timesheets = emp.records.filter(r => r.timesheet);

    // Attendance rows
    let rows = "";
    emp.records.forEach(r => {
      const clockIn  = r.clockIn  ? fmtTime(new Date(r.clockIn))  : "—";
      const clockOut = r.clockOut ? fmtTime(new Date(r.clockOut)) : "—";
      const hours    = r.clockIn && r.clockOut
        ? calcHours(new Date(r.clockIn), new Date(r.clockOut))
        : "Active";
      const project  = r.projectName || r.projectCode || "—";
      const rowColor = r.clockOut ? "#f9fafb" : "#fffbeb";
      const hoursColor = r.clockOut ? "#7c6af7" : "#f97316";

      rows += `
        <tr style="border-bottom:1px solid #e5e7eb;background:${rowColor};">
          <td style="padding:10px 14px;font-size:12px;color:#374151;">${r.clockIn ? fmtDate(new Date(r.clockIn)) : "—"}</td>
          <td style="padding:10px 14px;font-size:12px;color:#374151;font-family:monospace;">${clockIn}</td>
          <td style="padding:10px 14px;font-size:12px;color:#374151;font-family:monospace;">${clockOut}</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:${hoursColor};font-family:monospace;">${hours}</td>
          <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${project}</td>
        </tr>`;
    });

    // Timesheet notes
    let timesheetHtml = "";
    if (timesheets.length > 0) {
      timesheetHtml = `
        <div style="margin-top:16px;padding:14px 16px;background:#f3f4f6;border-radius:10px;border-left:3px solid #7c6af7;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:10px;">Timesheet Notes</div>
          ${timesheets.map(r => `
            <div style="margin-bottom:8px;">
              <span style="font-size:11px;font-weight:700;color:#7c6af7;font-family:monospace;">${r.clockIn ? fmtDate(new Date(r.clockIn)) : ""}</span>
              <div style="font-size:12px;color:#374151;margin-top:3px;line-height:1.5;">${r.timesheet}</div>
            </div>
          `).join("")}
        </div>`;
    }

    employeeBlocks += `
      <div style="margin-bottom:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

        <!-- Employee header -->
        <div style="background:linear-gradient(135deg,#7c6af7 0%,#6355e8 100%);padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${emp.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);font-family:monospace;margin-top:3px;">${emp.employeeId}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;font-family:monospace;">${total}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Total Hours</div>
          </div>
        </div>

        <!-- Stats strip -->
        <div style="display:flex;border-bottom:1px solid #e5e7eb;">
          <div style="flex:1;padding:12px 20px;text-align:center;border-right:1px solid #e5e7eb;">
            <div style="font-size:18px;font-weight:800;color:#374151;font-family:monospace;">${sessions}</div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Sessions</div>
          </div>
          <div style="flex:1;padding:12px 20px;text-align:center;border-right:1px solid #e5e7eb;">
            <div style="font-size:18px;font-weight:800;color:#22d3a2;font-family:monospace;">${completed}</div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Completed</div>
          </div>
          <div style="flex:1;padding:12px 20px;text-align:center;">
            <div style="font-size:18px;font-weight:800;color:#f97316;font-family:monospace;">${sessions - completed}</div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Active / Incomplete</div>
          </div>
        </div>

        <!-- Attendance table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Date</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Clock In</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Clock Out</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Hours</th>
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Project</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        ${timesheetHtml}

        <div style="height:1px;"></div>
      </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#0f0f1a;border-radius:16px 16px 0 0;padding:32px 36px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Malus Robotics</div>
              <div style="font-size:12px;color:#7c6af7;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px;">Weekly Attendance Report</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:700;color:#ffffff;">${weekLabel}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:3px;">Generated ${generatedAt}</div>
            </div>
          </div>
        </td>
      </tr>

      <!-- Summary bar -->
      <tr>
        <td style="background:#7c6af7;padding:14px 36px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.5;">
            This report covers attendance, working hours, and timesheet notes for all active employees during the selected week. Please review and flag any anomalies to HR.
          </div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#f3f4f6;padding:28px 24px;">
          ${employeeBlocks}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#0f0f1a;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
          <div style="font-size:11px;color:#4b5563;line-height:1.7;">
            This is an automated report generated by the Malus Robotics Employee Desk.<br/>
            Do not reply to this email · © ${new Date().getFullYear()} Malus Robotics Pvt. Ltd.
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── GET /api/report ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── Auth guard ──
    const cookieStore = await cookies();
    const session     = cookieStore.get("admin_session");
    if (!session || session.value !== process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Date range: current week Mon–Sun ──
    const now       = new Date();
    const day       = now.getDay(); // 0=Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday    = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekLabel = `${fmtDate(monday)} – ${fmtDate(sunday)}`;

    // ── Fetch records ──
    const records = await prisma.attendance.findMany({
      where: { clockIn: { gte: monday, lte: sunday } },
      include: {
        employee: {
          select: { name: true, employeeId: true },
        },
      },
      orderBy: { clockIn: "asc" },
    });

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No attendance records found for this week.",
      });
    }

    // ── Group by employee ──
    const grouped: Record<string, { name: string; employeeId: string; records: any[] }> = {};

    records.forEach(r => {
      if (!grouped[r.employeeId]) {
        grouped[r.employeeId] = {
          name:       r.employee.name,
          employeeId: r.employeeId,
          records:    [],
        };
      }
      grouped[r.employeeId].records.push(r);
    });

    // ── Build HTML report ──
    const html = buildHtmlReport(grouped, weekLabel);

    // ── Also build plain-text fallback ──
    let text = `Malus Robotics Weekly Attendance Report\nWeek: ${weekLabel}\n\n`;
    for (const id in grouped) {
      const emp = grouped[id];
      text += `${emp.name} (${emp.employeeId})\n`;
      text += `Total: ${totalHoursForEmployee(emp.records)}\n`;
      emp.records.forEach(r => {
        const ci = r.clockIn  ? fmtTime(new Date(r.clockIn))  : "—";
        const co = r.clockOut ? fmtTime(new Date(r.clockOut)) : "—";
        const h  = r.clockIn && r.clockOut ? calcHours(new Date(r.clockIn), new Date(r.clockOut)) : "Active";
        text += `  ${r.clockIn ? fmtDate(new Date(r.clockIn)) : ""}  ${ci} → ${co}  (${h})  ${r.projectCode || ""}\n`;
        if (r.timesheet) text += `    Note: ${r.timesheet}\n`;
      });
      text += "\n";
    }

    // ── Send email ──
    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Malus Robotics HR" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_TO,
      subject: `Malus Robotics Weekly Attendance — ${weekLabel}`,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Weekly report sent for ${weekLabel}`,
      employees: Object.keys(grouped).length,
      records:   records.length,
    });

  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate or send report." },
      { status: 500 }
    );
  }
}