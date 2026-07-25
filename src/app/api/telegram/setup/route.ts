import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "TELEGRAM_BOT_TOKEN не задан в .env" },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json({ success: false, message: "webhook url обязателен" }, { status: 400 });
    }

    const apiUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();

    return NextResponse.json({ success: json.ok, data: json });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, message: "TELEGRAM_BOT_TOKEN не задан" }, { status: 400 });
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
    const res = await fetch(apiUrl);
    const json = await res.json();
    return NextResponse.json({ success: true, data: json });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
