// app/api/admin/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserSession,
  requireEventPermission,
} from "@/lib/event-permissions";
import {
  encryptBankAccount,
  decryptBankAccount,
} from "@/lib/encryption";

/**
 * Detect if a string is encrypted (format: iv:authTag:ciphertext with exactly 3 hex parts)
 * AES-256-GCM encrypted strings have exactly 3 colon-separated hex parts
 */
function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getUserSession();
    const eventId = (await context.params).id;
    // ✅ Require at least VIEW permission
    await requireEventPermission(eventId, user.id, "view");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        distances: {
          orderBy: { sortOrder: "asc" },
        },
        shirts: {
          orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // ✅ Decrypt bank info before sending to the admin form
    // So the UI always receives human-readable values
    let bankAccount = event.bankAccount;
    let bankCode = event.bankCode;
    let bankHolder = event.bankHolder;
    let bankName = event.bankName;

    if (isEncrypted(bankAccount)) {
      try {
        const decrypted = decryptBankAccount({
          accountNumberEncrypted: bankAccount!,
          bankCodeEncrypted: bankCode!,
          accountNameEncrypted: bankHolder ?? "",
          bankNameEncrypted: bankName ?? "",
        });
        bankAccount = decrypted.accountNumber;
        bankCode = decrypted.bankCode;
        bankHolder = decrypted.accountName;
        bankName = decrypted.bankName;
      } catch (e) {
        console.error("Failed to decrypt bank info for event", eventId, e);
        // Return empty fields rather than garbled ciphertext
        bankAccount = "";
        bankCode = "MB";
        bankHolder = "";
        bankName = "";
      }
    }

    return NextResponse.json({
      event: {
        ...event,
        bankAccount,
        bankCode,
        bankHolder,
        bankName,
      },
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const eventId = (await context.params).id;
    const user = await getUserSession();

    // ✅ Require EDIT permission
    await requireEventPermission(eventId, user.id, "edit");

    // ✅ Encrypt bank info before saving if the fields are non-empty
    let bankAccountToSave = body.bankAccount || null;
    let bankCodeToSave = body.bankCode || null;
    let bankHolderToSave = body.bankHolder || null;
    let bankNameToSave = body.bankName || null;

    const hasBankInfo =
      bankAccountToSave && bankCodeToSave;

    if (hasBankInfo) {
      try {
        const encrypted = encryptBankAccount({
          accountNumber: bankAccountToSave,
          bankCode: bankCodeToSave,
          accountName: bankHolderToSave || "",
          bankName: bankNameToSave || "",
        });
        bankAccountToSave = encrypted.accountNumberEncrypted;
        bankCodeToSave = encrypted.bankCodeEncrypted;
        bankHolderToSave = encrypted.accountNameEncrypted;
        bankNameToSave = encrypted.bankNameEncrypted;
        console.log("🔐 Bank info encrypted for event", eventId);
      } catch (e) {
        console.error("Failed to encrypt bank info:", e);
        return NextResponse.json(
          { error: "Failed to encrypt bank info" },
          { status: 500 }
        );
      }
    }

    // Update event with all fields including images
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        location: body.location,
        address: body.address,
        city: body.city,
        status: body.status,
        isPublished: body.isPublished,
        hasShirt: body.hasShirt,
        requireOnlinePayment: body.requireOnlinePayment,
        sendBibImmediately: body.sendBibImmediately,
        allowRegistration: body.allowRegistration,

        // Bank info (encrypted)
        bankName: bankNameToSave,
        bankAccount: bankAccountToSave,
        bankHolder: bankHolderToSave,
        bankCode: bankCodeToSave,

        // Contact
        hotline: body.hotline,
        emailSupport: body.emailSupport,
        facebookUrl: body.facebookUrl,

        // Race pack
        racePackLocation: body.racePackLocation,
        racePackTime: body.racePackTime,

        // Images
        logoUrl: body.logoUrl,
        bannerUrl: body.bannerUrl,
        coverImageUrl: body.coverImageUrl,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}
