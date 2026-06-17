import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { replaySepayWebhookLog } from "@/lib/sepay-webhook-retry";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const overrideCode =
      typeof body.overrideCode === "string" ? body.overrideCode.trim() : "";

    const result = await replaySepayWebhookLog(id, {
      origin: req.nextUrl.origin,
      overrideCode,
      source: "admin",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Retry webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Retry webhook failed" },
      { status: 500 },
    );
  }
}
