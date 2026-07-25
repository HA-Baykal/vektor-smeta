import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accessCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get("fingerprint");

    if (!fingerprint) {
      return NextResponse.json({ authorized: false, reason: "no_fingerprint" });
    }

    const existing = await db
      .select()
      .from(accessCodes)
      .where(eq(accessCodes.deviceFingerprint, fingerprint))
      .limit(1);

    if (existing.length > 0 && existing[0].isUsed) {
      return NextResponse.json({
        authorized: true,
        code: existing[0].code,
        usedAt: existing[0].usedAt,
      });
    }

    return NextResponse.json({ authorized: false, reason: "device_not_bound" });
  } catch (error) {
    return NextResponse.json(
      { authorized: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
