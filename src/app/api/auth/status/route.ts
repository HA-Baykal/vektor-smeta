import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get("fingerprint");

    if (!fingerprint) {
      return NextResponse.json({ authorized: false, reason: "no_fingerprint" });
    }

    if (!process.env.DATABASE_URL) {
      // During build without DB, allow request but not authorized
      return NextResponse.json({ authorized: false, reason: "db_not_configured" });
    }

    const { db } = await import("@/db");
    const { accessCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

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
