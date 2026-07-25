import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

const WEB_APP_URL = process.env.TELEGRAM_WEB_APP_URL || "https://vektor-smeta-app.vercel.app";

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

function getMainKeyboard(isAdmin: boolean) {
  if (isAdmin) {
    return {
      inline_keyboard: [
        [
          {
            text: "❄️ Открыть Сметчик (Mini App)",
            web_app: { url: WEB_APP_URL },
          },
        ],
        [
          { text: "🔑 Сгенерировать код", callback_data: "gen_code" },
          { text: "📋 Список кодов", callback_data: "list_codes" },
        ],
        [
          { text: "📊 Статистика", callback_data: "stats" },
        ],
      ],
    };
  } else {
    return {
      inline_keyboard: [
        [
          {
            text: "❄️ Открыть Сметчик (Mini App)",
            web_app: { url: WEB_APP_URL },
          },
        ],
        [
          { text: "ℹ️ Как получить доступ?", callback_data: "how_to_access" },
        ],
      ],
    };
  }
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
      const username = callbackQuery.from?.username;
      const data = callbackQuery.data;
      const isAdmin = isAdminTelegramUser(userId);

      if (data === "gen_code" || data === "gen") {
        if (!isAdmin) {
          await sendTelegramMessage(token, chatId, "⛔ Только администратор может генерировать коды доступа. Обратитесь к владельцу бота.");
          return NextResponse.json({ ok: true });
        }
        const code = await createCodeInDB(userId, username);
        await sendTelegramMessage(
          token,
          chatId,
          `✅ <b>Новый одноразовый код доступа:</b>\n\n<code>${code.code}</code>\n\n` +
            `• Одноразовый: после ввода на устройстве сгорит\n` +
            `• Привязка: работает всегда только на том устройстве, где введен\n` +
            `• Действует: 7 дней до активации\n\n` +
            `Отправьте этот код клиенту. Клиент вводит его в Mini App и получает доступ.`,
          {
            reply_markup: getMainKeyboard(isAdmin),
          }
        );
      } else if (data === "list_codes") {
        if (!isAdmin) {
          await sendTelegramMessage(token, chatId, "⛔ Только для администратора.");
          return NextResponse.json({ ok: true });
        }
        if (!process.env.DATABASE_URL) {
          await sendTelegramMessage(token, chatId, "DATABASE_URL не настроен");
          return NextResponse.json({ ok: true });
        }
        const { db } = await import("@/db");
        const { accessCodes } = await import("@/db/schema");
        const { desc } = await import("drizzle-orm");
        const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(10);
        if (list.length === 0) {
          await sendTelegramMessage(token, chatId, "Список кодов пуст. Сгенерируйте первый командой /gen", {
            reply_markup: getMainKeyboard(isAdmin),
          });
        } else {
          let msg = `📋 <b>Последние 10 кодов:</b>\n\n`;
          list.forEach((c, idx) => {
            const status = c.isUsed ? `✅ использован (${c.deviceFingerprint?.slice(0, 10)}...)` : `🟡 активен`;
            msg += `${idx + 1}. <code>${c.code}</code> — ${status}\n`;
          });
          await sendTelegramMessage(token, chatId, msg, {
            reply_markup: getMainKeyboard(isAdmin),
          });
        }
      } else if (data === "how_to_access") {
        await sendTelegramMessage(
          token,
          chatId,
          `🔐 <b>Как получить доступ к Сметчику?</b>\n\n` +
            `1. Попросите администратора сгенерировать для вас одноразовый код\n` +
            `2. Нажмите кнопку «Открыть Сметчик» ниже\n` +
            `3. Введите код в приложении\n` +
            `4. Ваше устройство привяжется и будет работать всегда без повторного ввода\n\n` +
            `Код одноразовый и сгорает после первого использования!`,
          {
            reply_markup: getMainKeyboard(isAdmin),
          }
        );
      } else if (data === "stats") {
        if (!isAdmin) {
          await sendTelegramMessage(token, chatId, "⛔ Только для администратора.");
          return NextResponse.json({ ok: true });
        }
        if (!process.env.DATABASE_URL) {
          await sendTelegramMessage(token, chatId, "DATABASE_URL не настроен");
          return NextResponse.json({ ok: true });
        }
        const { db } = await import("@/db");
        const { accessCodes, estimates } = await import("@/db/schema");
        const { count } = await import("drizzle-orm");
        
        const totalCodes = await db.select({ count: count() }).from(accessCodes);
        const usedCodes = await db.select({ count: count() }).from(accessCodes).where((await import("drizzle-orm")).eq(accessCodes.isUsed, true));
        const totalEstimates = await db.select({ count: count() }).from(estimates);

        await sendTelegramMessage(
          token,
          chatId,
          `📊 <b>Статистика Сметчика:</b>\n\n` +
            `🔑 Всего кодов: ${totalCodes[0]?.count || 0}\n` +
            `✅ Использовано: ${usedCodes[0]?.count || 0}\n` +
            `📝 Смет создано: ${totalEstimates[0]?.count || 0}\n` +
            `🌐 Mini App: ${WEB_APP_URL}`,
          {
            reply_markup: getMainKeyboard(isAdmin),
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
    const isAdmin = isAdminTelegramUser(userId);

    if (!chatId || !userId) {
      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      if (isAdmin) {
        const welcome =
          `❄️ <b>ИИ-Ассистент «Сметчик» — Telegram Mini App</b>\n\n` +
          `Добро пожаловать, Администратор! Вы можете генерировать одноразовые коды доступа.\n\n` +
          `<b>Как работает система:</b>\n` +
          `1. Вы генерируете код кнопкой ниже или командой /gen\n` +
          `2. Отправляете код клиенту/сотруднику\n` +
          `3. Клиент открывает Mini App (кнопка ниже) и вводит код 1 раз\n` +
          `4. Устройство клиента привязывается и работает вечно без кода, а код сгорает\n\n` +
          `<b>Ваш ID:</b> <code>${userId}</code> — права администратора ✅\n\n` +
          `Нажмите «Открыть Сметчик» чтобы запустить приложение прямо в Telegram!`;

        await sendTelegramMessage(token, chatId, welcome, {
          reply_markup: getMainKeyboard(true),
        });
      } else {
        const welcome =
          `❄️ <b>Сметчик — монтаж кондиционеров</b>\n\n` +
          `Добро пожаловать! Это Telegram Mini App для составления смет.\n\n` +
          `🔐 <b>Доступ по одноразовому коду:</b>\n` +
          `Чтобы пользоваться приложением, попросите у администратора код доступа.\n\n` +
          `После ввода код сгорает, а ваше устройство привязывается навсегда.\n\n` +
          `Нажмите кнопку ниже чтобы открыть приложение!`;

        await sendTelegramMessage(token, chatId, welcome, {
          reply_markup: getMainKeyboard(false),
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (text === "/help") {
      if (isAdmin) {
        await sendTelegramMessage(
          token,
          chatId,
          `🆘 <b>Помощь — Админ:</b>\n\n` +
            `/start — главное меню + Mini App\n` +
            `/gen — 1 новый код\n` +
            `/gen 5 — 5 кодов сразу\n` +
            `/list — последние 10 кодов\n` +
            `/stats — статистика\n` +
            `/revoke XXXX-XXXX — удалить код\n\n` +
            `<b>Mini App:</b> ${WEB_APP_URL}`,
          {
            reply_markup: getMainKeyboard(true),
          }
        );
      } else {
        await sendTelegramMessage(
          token,
          chatId,
          `🆘 <b>Помощь:</b>\n\n` +
            `Это приложение работает по одноразовым кодам.\n` +
            `Попросите код у администратора и введите его в Mini App.\n\n` +
            `После первого ввода устройство будет работать всегда.`,
          {
            reply_markup: getMainKeyboard(false),
          }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/gen") || text.startsWith("/code")) {
      if (!isAdmin) {
        await sendTelegramMessage(token, chatId, "⛔ Только администратор может генерировать коды. Попросите код у владельца бота.", {
          reply_markup: getMainKeyboard(false),
        });
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
          `Каждый код одноразовый, привязывается к устройству при первом вводе и затем сгорает.\n` +
          `Клиенты могут ввести его в Mini App.`,
        {
          reply_markup: getMainKeyboard(true),
        }
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/list")) {
      if (!isAdmin) {
        await sendTelegramMessage(token, chatId, "⛔ Только для администратора.", {
          reply_markup: getMainKeyboard(false),
        });
        return NextResponse.json({ ok: true });
      }
      if (!process.env.DATABASE_URL) {
        await sendTelegramMessage(token, chatId, "DATABASE_URL не настроен");
        return NextResponse.json({ ok: true });
      }
      const { db } = await import("@/db");
      const { accessCodes } = await import("@/db/schema");
      const { desc } = await import("drizzle-orm");
      const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(10);
      if (list.length === 0) {
        await sendTelegramMessage(token, chatId, "Список кодов пуст. Сгенерируйте первый командой /gen", {
          reply_markup: getMainKeyboard(true),
        });
      } else {
        let msg = `📋 <b>Последние 10 кодов:</b>\n\n`;
        list.forEach((c, idx) => {
          const status = c.isUsed ? `✅ использован (${c.deviceFingerprint?.slice(0, 10)}...)` : `🟡 активен`;
          msg += `${idx + 1}. <code>${c.code}</code> — ${status}\n`;
        });
        await sendTelegramMessage(token, chatId, msg, {
          reply_markup: getMainKeyboard(true),
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/revoke") || text.startsWith("/delete")) {
      if (!isAdmin) {
        await sendTelegramMessage(token, chatId, "⛔ Только для администратора.", {
          reply_markup: getMainKeyboard(false),
        });
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
      await sendTelegramMessage(token, chatId, `🗑 Код <code>${codeToRevoke}</code> удалён/отозван.`, {
        reply_markup: getMainKeyboard(true),
      });
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      token,
      chatId,
      `Неизвестная команда. Используйте /start для открытия Mini App.`,
      {
        reply_markup: getMainKeyboard(isAdmin),
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
    message: "Telegram Mini App webhook endpoint",
    webAppUrl: WEB_APP_URL,
    setup: "Установите TELEGRAM_BOT_TOKEN и настройте вебхук",
  });
}
