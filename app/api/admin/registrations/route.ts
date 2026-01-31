// app/api/admin/registrations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserAccessibleRegistrations,
  getUserSession,
} from "@/lib/event-permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserSession();
    const { searchParams } = new URL(req.url);

    const result = await getUserAccessibleRegistrations(user.id, {
      eventId: searchParams.get("eventId") || undefined,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      distance: searchParams.get("distance") || undefined,
      source: searchParams.get("source") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
