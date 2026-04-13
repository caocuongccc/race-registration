// app/api/events/[slug]/route.ts - MERGED VERSION
// Combines: existing features + form config + bank config + private access

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { searchParams } = new URL(req.url);
    const includeGoals = searchParams.get("includeGoals") === "true";
    const slug = (await context.params).slug;

    // ✅ CHANGE: Remove isPublished filter to allow private access via direct link
    const event = await prisma.event.findFirst({
      where: {
        slug,
        // isPublished: true, // ← REMOVED: Now accessible via direct link
      },
      include: {
        distances: {
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
        },
        shirts: {
          where: { isAvailable: true },
          orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
        },
        eventImages: {
          where: {
            imageType: {
              in: ["SHIRT_MALE", "SHIRT_FEMALE", "SHIRT_KID"],
            },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            imageUrl: true,
            imageType: true,
            title: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Sự kiện không tồn tại" },
        { status: 404 },
      );
    }

    // Group shirts by category and type
    const shirtsGrouped = event.shirts.reduce((acc, shirt) => {
      const key = `${shirt.category}_${shirt.type}`;
      if (!acc[key]) {
        acc[key] = {
          category: shirt.category,
          type: shirt.type,
          price: shirt.price,
          sizes: [],
        };
      }

      acc[key].sizes.push({
        id: shirt.id,
        size: shirt.size,
        stockQuantity: shirt.stockQuantity,
        soldQuantity: shirt.soldQuantity,
        isAvailable:
          shirt.isAvailable && shirt.soldQuantity < shirt.stockQuantity,
      });

      return acc;
    }, {} as any);

    // Group shirt images by category
    const shirtImages = {
      MALE: event.eventImages.filter((img) => img.imageType === "SHIRT_MALE"),
      FEMALE: event.eventImages.filter(
        (img) => img.imageType === "SHIRT_FEMALE",
      ),
      KID: event.eventImages.filter((img) => img.imageType === "SHIRT_KID"),
    };

    // ✅ NEW: Determine if this is private access
    const isPrivateAccess = !event.isPublished;

    // Build response with all features
    const response = {
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        logoUrl: event.logoUrl,
        bannerUrl: event.bannerUrl,
        hasShirt: event.hasShirt,
        requireOnlinePayment: event.requireOnlinePayment,
        allowRegistration: event.allowRegistration,

        // ✅ NEW: Form field visibility configuration
        showIdCard: event.showIdCard,
        showAddress: event.showAddress,
        showCity: event.showCity,
        showBloodType: event.showBloodType,
        showEmergencyContact: event.showEmergencyContact,
        showHealthDeclaration: event.showHealthDeclaration,
        showBibName: event.showBibName,

        // ✅ NEW: Bank configuration (includes bankCode)
        bankName: event.bankName,
        bankAccount: event.bankAccount,
        bankHolder: event.bankHolder,
        bankCode: event.bankCode, // ← NEW: For VietQR

        // ✅ NEW: Private access flag
        _privateAccess: isPrivateAccess,
      },
      distances: event.distances.map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        bibPrefix: d.bibPrefix,
        maxParticipants: d.maxParticipants,
        currentParticipants: d.currentParticipants,
        isAvailable:
          d.isAvailable &&
          (!d.maxParticipants || d.currentParticipants < d.maxParticipants),
      })),
      shirts: Object.values(shirtsGrouped),
      shirtImages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tải thông tin sự kiện" },
      { status: 500 },
    );
  }
}
