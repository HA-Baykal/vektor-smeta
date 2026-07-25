import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const initData = searchParams.get("initData");

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "";
    const adminIds = adminIdsEnv.split(",").map(s => s.trim()).filter(Boolean);

    let isAdmin = false;
    let validTelegramData = false;
    let telegramUser = null;

    if (userId) {
      isAdmin = adminIds.includes(String(userId));
    }

    // If initData provided, validate it
    if (initData && botToken) {
      try {
        const { validateTelegramWebAppData } = await import("@/lib/telegram");
        const result = validateTelegramWebAppData(initData, botToken);
        validTelegramData = result.valid;
        if (result.user) {
          telegramUser = result.user;
          isAdmin = adminIds.includes(String(result.user.id));
        }
      } catch (e) {
        console.error("Validation error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      isAdmin,
      validTelegramData,
      telegramUser,
      adminIds: adminIds.length, // don't expose actual IDs count only
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, message: "Bot token not configured" }, { status: 500 });
    }

    if (!initData) {
      return NextResponse.json({ success: false, message: "initData required" }, { status: 400 });
    }

    const { validateTelegramWebAppData } = await import("@/lib/telegram");
    const result = validateTelegramWebAppData(initData, botToken);

    const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || "";
    const adminIds = adminIdsEnv.split(",").map(s => s.trim()).filter(Boolean);
    const isAdmin = result.user ? adminIds.includes(String(result.user.id)) : false;

    return NextResponse.json({
      success: true,
      valid: result.valid,
      user: result.user,
      isAdmin,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
