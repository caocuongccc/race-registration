// app/api/admin/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getUserSession,
  getUserAccessibleEvents,
} from "@/lib/event-permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserSession();
    const { searchParams } = new URL(req.url);
    const minimal = searchParams.get("minimal") === "true";

    // ✅ Get all events user has access to (created + assigned)
    const events = await getUserAccessibleEvents(user.id, user.role, {
      includeCounts: !minimal,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
