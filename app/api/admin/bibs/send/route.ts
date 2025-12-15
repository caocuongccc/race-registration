// ============================================
// app/api/admin/bibs/send/route.ts
// ============================================
// app/api/admin/bibs/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBibAnnouncementEmails } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Send BIB announcement emails
    const result = await sendBibAnnouncementEmails(eventId);

    return NextResponse.json({
      success: true,
      sent: result,
    });
  } catch (error) {
    console.error("Send BIB emails error:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}
