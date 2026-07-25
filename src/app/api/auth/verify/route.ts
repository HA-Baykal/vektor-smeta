import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, message: "База данных не настроена на сервере" },
        { status: 500 }
      );
    }

    const { db } = await import("@/db");
    const { accessCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const { code, fingerprint, userAgent, deviceInfo } = await req.json();

    if (!code || !fingerprint) {
      return NextResponse.json(
        { success: false, message: "Код и идентификатор устройства обязательны" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase().replace(/\s/g, "");

    const found = await db
      .select()
      .from(accessCodes)
      .where(eq(accessCodes.code, cleanCode))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json(
        { success: false, message: "Неверный код доступа. Проверьте правильность и попробуйте снова." },
        { status: 404 }
      );
    }

    const access = found[0];

    if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: "Срок действия кода истёк." },
        { status: 410 }
      );
    }

    if (access.isUsed) {
      if (access.deviceFingerprint === fingerprint) {
        return NextResponse.json({
          success: true,
          message: "Устройство уже авторизовано. Доступ разрешён.",
          alreadyBound: true,
          code: access.code,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message:
              "Этот одноразовый код уже был активирован на другом устройстве и больше недействителен.",
          },
          { status: 403 }
        );
      }
    }

    const updated = await db
      .update(accessCodes)
      .set({
        isUsed: true,
        deviceFingerprint: fingerprint,
        deviceInfo: deviceInfo || userAgent || "",
        usedAt: new Date(),
      })
      .where(eq(accessCodes.id, access.id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Код успешно активирован. Устройство привязано — теперь доступ без кода.",
      code: updated[0].code,
      bound: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
