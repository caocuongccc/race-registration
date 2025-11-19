import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const event = await prisma.event.findFirst({
      where: {
        slug: (await context.params).slug,
        isPublished: true,
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
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Sự kiện không tồn tại hoặc chưa được công bố" },
        { status: 404 }
      );
    }

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

    return NextResponse.json({
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
        bankName: event.bankName,
        bankAccount: event.bankAccount,
        bankHolder: event.bankHolder,
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
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tải thông tin sự kiện" },
      { status: 500 }
    );
  }
}
