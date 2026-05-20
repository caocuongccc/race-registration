import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.vietqr.io/v2/banks", {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`VietQR banks API failed: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      banks: (data.data || []).map((bank: any) => ({
        name: bank.name,
        shortName: bank.shortName,
        code: bank.code,
        bin: bank.bin,
      })),
    });
  } catch (error) {
    console.error("Failed to load banks:", error);
    return NextResponse.json({ banks: [] }, { status: 200 });
  }
}
