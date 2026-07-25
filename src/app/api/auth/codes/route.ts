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
    const { accessCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    if (id) {
      await db.delete(accessCodes).where(eq(accessCodes.id, parseInt(id, 10)));
    } else if (code) {
      await db.delete(accessCodes).where(eq(accessCodes.code, code));
    } else {
      return NextResponse.json({ success: false, message: "id или code обязательны" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Код удалён" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
