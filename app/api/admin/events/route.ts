// app/api/admin/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getUserSession,
  getUserAccessibleEvents,
} from "@/lib/event-permissions";

export async function GET() {
  try {
    const user = await getUserSession();

    // ✅ Get all events user has access to (created + assigned)
    const events = await getUserAccessibleEvents(user.id);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
