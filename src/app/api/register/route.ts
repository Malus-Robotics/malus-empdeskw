import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

/* ── POST /api/register ───────────────────────────────────────────────────────
   FLOW — two-step activation model:

   Step 1 (Admin):  Admin creates employee record in /admin with their real
                    name + company email. Record is saved with no password.

   Step 2 (Employee): Employee visits /register, enters their company email
                    and chooses a password. This route:
                      a) Verifies the email exists in the DB (admin pre-seeded)
                      b) Verifies the account hasn't been activated yet
                      c) Sets the password and activates the account
                      d) Sends a welcome email (non-blocking)

   WHY: This means a made-up email like test@malusrobotics.com is rejected
   at step (a) — it doesn't matter that the domain is correct, the specific
   address must already exist as an employee record created by an admin.
──────────────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body     = await req.json();
    const email    = body.email?.trim().toLowerCase();
    const password = body.password;

    /* ── 1. Basic validation ── */
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!email.endsWith("@malusrobotics.com")) {
      return NextResponse.json(
        { success: false, error: "Please use your @malusrobotics.com company email." },
        { status: 400 }
      );
    }

    /* ── 2. Email must have been pre-registered by admin ── */
    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This email is not registered in our system. " +
            "Please contact HR or your admin to get your account created first.",
        },
        { status: 404 }
      );
    }

    /* ── 3. Prevent re-activation ── */
    if (employee.password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account is already active. Please log in instead.",
        },
        { status: 409 }
      );
    }

    /* ── 4. Set password and activate ── */
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { email },
      data:  { password: hashedPassword },
    });

    /* ── 5. Welcome email (non-blocking — never fails the response) ── */
    sendWelcomeEmail(employee.email, employee.name, employee.employeeId).catch(
      (err) => console.error("Welcome email failed (non-fatal):", err)
    );

    return NextResponse.json({
      success:    true,
      employeeId: employee.employeeId,
    });

  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

/* ── Transporter ──────────────────────────────────────────────────────────── */
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/* ── Welcome email ────────────────────────────────────────────────────────── */
async function sendWelcomeEmail(to: string, name: string, employeeId: string) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    `"Malus Robotics Desk" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to Malus Robotics — Your account is active",
    text: `
Hi ${name},

Your Malus Robotics employee account has been activated.

  Employee ID : ${employeeId}
  Email       : ${to}

Use your Employee ID and the password you set to log in at:
https://desk.malusrobotics.com

— Malus Robotics Internal Platform
    `.trim(),

    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;color:#f0f0f8;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#111118;border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden;">

        <tr>
          <td style="background:#7c6af7;padding:32px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Malus Robotics</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">Employee Workspace</div>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:15px;font-weight:700;margin:0 0 8px;">Hi ${name},</p>
            <p style="font-size:14px;color:#8888aa;line-height:1.7;margin:0 0 28px;">
              Your Malus Robotics employee account has been activated successfully.
              Use the details below to sign in to the Employee Desk.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#16161f;border:1px solid rgba(124,106,247,0.2);border-radius:14px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#44445a;font-family:monospace;margin-bottom:8px;">Your Employee ID</div>
                  <div style="font-size:22px;font-weight:800;color:#7c6af7;font-family:monospace;letter-spacing:2px;">${employeeId}</div>
                </td>
              </tr>
            </table>

            <a href="https://malus-robotics-empdesk-3ivw.vercel.app/login"
               style="display:inline-block;background:#7c6af7;color:#fff;text-decoration:none;
                      font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;">
              Go to Employee Desk →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="font-size:11px;color:#44445a;margin:0;line-height:1.6;">
              Didn't activate this account? Contact HR immediately.<br/>
              © ${new Date().getFullYear()} Malus Robotics Pvt. Ltd.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });
}