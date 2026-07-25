import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  options?: { parse_mode?: string; reply_markup?: any }
) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || "HTML",
        reply_markup: options?.reply_markup,
      }),
    });
    return await res.json();
  } catch (e) {
    console.error("Telegram send error:", e);
    return null;
  }
}

function isAdminTelegramUser(userId: string | number): boolean {
  const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "";
  if (!adminIdsEnv) {
    return true;
  }
  const adminIds = adminIdsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(String(userId));
}

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

async function createCodeInDB(
  telegramId: number | string,
  username?: string,
  note?: string
) {
  if (!process.env.DATABASE_URL) {
    // Mock code if no DB
    return { code: generateAccessCode() };
  }
  const { db } = await import("@/db");
  const { accessCodes } = await import("@/db/schema");
  const code = generateAccessCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inserted = await db
    .insert(accessCodes)
    .values({
      code,
      isUsed: false,
      expiresAt,
      createdByTelegramId: String(telegramId),
      createdByTelegramUsername: username || null,
      note: note || "Создано через Telegram бот",
    })
    .returning();
  return inserted[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = getBotToken();

    if (!token) {
      return NextResponse.json({ ok: false, error: "BOT_TOKEN_MISSING" });
    }

    const message = body.message || body.edited_message;
    const callbackQuery = body.callback_query;

    if (callbackQuery) {
      const chatId = callbackQuery.message?.chat?.id;
      const userId = callbackQuery.from?.id;
      const data = callbackQuery.data;

      if (!isAdminTelegramUser(userId)) {
        await sendTelegramMessage(token, chatId, "⛔ У вас нет прав на генерацию кодов.");
        return NextResponse.json({ ok: true });
      }

      if (data === "gen_code" || data === "gen") {
        const code = await createCodeInDB(userId, callbackQuery.from?.username);
        await sendTelegramMessage(
          token,
          chatId,
          `✅ <b>Новый одноразовый код доступа:</b>\n\n<code>${code.code}</code>\n\n` +
            `• Одноразовый: после ввода на устройстве сгорит\n` +
            `• Привязка: работает всегда только на том устройстве, где введен\n` +
            `• Действует: 7 дней до активации\n\n` +
            `Отправьте этот код клиенту.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "➕ Сгенерировать ещё один", callback_data: "gen_code" }],
              ],
            },
          }
        );
      }

      try {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callbackQuery.id }),
        });
      } catch {}

      return NextResponse.json({ ok: true });
    }

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username;
    const text = (message.text || "").trim();

    if (!chatId || !userId) {
      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      const welcome =
        `❄️ <b>ИИ-Ассистент «Сметчик» — Бот управления доступом</b>\n\n` +
        `Этот бот генерирует одноразовые коды для входа в приложение сметчика кондиционеров.\n\n` +
        `<b>Как работает защита:</b>\n` +
        `1. Вы генерируете код командой /gen\n` +
        `2. Отправляете код клиенту/сотруднику\n` +
        `3. Код вводится 1 раз в приложении → устройство привязывается\n` +
        `4. После этого устройство работает вечно без кода, а сам код сгорает\n\n` +
        `<b>Команды:</b>\n` +
        `/gen — сгенерировать новый одноразовый код\n` +
        `/list — список последних кодов\n` +
        `/help — помощь\n\n` +
        (isAdminTelegramUser(userId)
          ? `✅ Ваш ID <code>${userId}</code> — права администратора подтверждены.`
          : `⚠️ Ваш ID <code>${userId}</code> — для ограничения доступа укажите TELEGRAM_ADMIN_IDS в .env`);

      await sendTelegramMessage(token, chatId, welcome, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔑 Сгенерировать код", callback_data: "gen_code" }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (text === "/help") {
      await sendTelegramMessage(
        token,
        chatId,
        `🆘 <b>Помощь по боту Сметчик:</b>\n\n` +
          `/gen — Генерация 1 кода\n` +
          `/gen 5 — Генерация 5 кодов сразу\n` +
          `/list — Последние 10 кодов\n` +
          `/revoke XXXX-XXXX — Отозвать/удалить код\n` +
          `/start — Главное меню\n`
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/gen") || text.startsWith("/code")) {
      if (!isAdminTelegramUser(userId)) {
        await sendTelegramMessage(token, chatId, "⛔ Нет прав на генерацию кодов.");
        return NextResponse.json({ ok: true });
      }

      const parts = text.split(" ");
      const countRaw = parts[1] ? parseInt(parts[1], 10) : 1;
      const count = Math.min(Math.max(countRaw || 1, 1), 10);

      const createdCodes: string[] = [];
      for (let i = 0; i < count; i++) {
        const row = await createCodeInDB(userId, username, `Создано ботом для ${chatId}`);
        createdCodes.push(row.code);
      }

      const codesText = createdCodes.map((c) => `<code>${c}</code>`).join("\n");
      await sendTelegramMessage(
        token,
        chatId,
        `✅ Сгенерировано кодов: <b>${count}</b>\n\n${codesText}\n\n` +
          `Каждый код одноразовый, привязывается к устройству при первом вводе и затем сгорает. Устройство будет работать вечно.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Ещё один код", callback_data: "gen_code" }],
            ],
          },
        }
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/list")) {
      if (!isAdminTelegramUser(userId)) {
        await sendTelegramMessage(token, chatId, "⛔ Нет прав.");
        return NextResponse.json({ ok: true });
      }
      if (!process.env.DATABASE_URL) {
        await sendTelegramMessage(token, chatId, "DATABASE_URL не настроен — база не подключена");
        return NextResponse.json({ ok: true });
      }
      const { db } = await import("@/db");
      const { accessCodes } = await import("@/db/schema");
      const { desc } = await import("drizzle-orm");
      const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(10);
      if (list.length === 0) {
        await sendTelegramMessage(token, chatId, "Список кодов пуст. Сгенерируйте первый командой /gen");
      } else {
        let msg = `📋 <b>Последние 10 кодов:</b>\n\n`;
        list.forEach((c, idx) => {
          const status = c.isUsed ? `✅ использован (${c.deviceFingerprint?.slice(0, 10)}...)` : `🟡 активен`;
          msg += `${idx + 1}. <code>${c.code}</code> — ${status}\n`;
        });
        await sendTelegramMessage(token, chatId, msg);
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/revoke") || text.startsWith("/delete")) {
      if (!isAdminTelegramUser(userId)) {
        await sendTelegramMessage(token, chatId, "⛔ Нет прав.");
        return NextResponse.json({ ok: true });
      }
      if (!process.env.DATABASE_URL) {
        await sendTelegramMessage(token, chatId, "DATABASE_URL не настроен");
        return NextResponse.json({ ok: true });
      }
      const parts = text.split(" ");
      const codeToRevoke = parts[1]?.toUpperCase().trim();
      if (!codeToRevoke) {
        await sendTelegramMessage(token, chatId, "Укажите код: /revoke XXXX-XXXX");
        return NextResponse.json({ ok: true });
      }
      const { db } = await import("@/db");
      const { accessCodes } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(accessCodes).where(eq(accessCodes.code, codeToRevoke));
      await sendTelegramMessage(token, chatId, `🗑 Код <code>${codeToRevoke}</code> удалён/отозван.`);
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      token,
      chatId,
      `Неизвестная команда. Используйте /gen для генерации кода или /help для справки.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🔑 Сгенерировать код", callback_data: "gen_code" }]],
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook endpoint. Use POST from Telegram.",
    setup: "Установите TELEGRAM_BOT_TOKEN в .env и настройте вебхук: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_DOMAIN>/api/telegram/webhook",
  });
}
