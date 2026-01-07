// app/api/admin/import/[batchId]/errors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await context.params).batchId;

    // Get batch with error log
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: {
        errorLog: true,
        status: true,
        failedCount: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Parse error log
    const errors = (batch.errorLog as any[]) || [];

    return NextResponse.json({
      errors,
      failedCount: batch.failedCount,
      status: batch.status,
    });
  } catch (error) {
    console.error("Error fetching import errors:", error);
    return NextResponse.json(
      { error: "Failed to fetch errors" },
      { status: 500 }
    );
  }
}
