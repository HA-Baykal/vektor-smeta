import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accessCodes } from "@/db/schema";
import { generateAccessCode } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const note = body.note || "";
    const createdByTelegramId = body.createdByTelegramId || null;
    const createdByTelegramUsername = body.createdByTelegramUsername || null;
    const expiresInHours = body.expiresInHours || 168; // 7 дней по умолчанию

    let code = generateAccessCode();

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const inserted = await db
      .insert(accessCodes)
      .values({
        code,
        isUsed: false,
        expiresAt,
        note: note || "",
        createdByTelegramId: createdByTelegramId ? String(createdByTelegramId) : null,
        createdByTelegramUsername: createdByTelegramUsername || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted[0],
      message: `Код ${code} успешно создан (действует ${expiresInHours}ч)`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt));
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
