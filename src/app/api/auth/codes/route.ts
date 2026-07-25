import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, data: [] });
    }
    const { db } = await import("@/db");
    const { accessCodes } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(100);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }
    const { db } = await import("@/db");
    const { accessCodes, auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code");
    const adminId = searchParams.get("adminId") || "";

    let deletedData = null;
    if (id) {
      const existing = await db.select().from(accessCodes).where(eq(accessCodes.id, parseInt(id, 10))).limit(1);
      deletedData = existing[0] || null;
      await db.delete(accessCodes).where(eq(accessCodes.id, parseInt(id, 10)));
    } else if (code) {
      const existing = await db.select().from(accessCodes).where(eq(accessCodes.code, code)).limit(1);
      deletedData = existing[0] || null;
      await db.delete(accessCodes).where(eq(accessCodes.code, code));
    } else {
      return NextResponse.json({ success: false, message: "id или code обязательны" }, { status: 400 });
    }

    // Audit log
    try {
      const ip = req.headers.get("x-forwarded-for") || "";
      const userAgent = req.headers.get("user-agent") || "";
      await db.insert(auditLogs).values({
        action: "delete",
        entityType: "access_code",
        entityId: deletedData?.id || null,
        entityDataJson: deletedData ? JSON.stringify(deletedData) : null,
        performedBy: adminId || "admin",
        ipAddress: ip,
        userAgent: userAgent,
        note: `Удален код доступа: ${deletedData?.code || code || id}`,
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Код удалён" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
