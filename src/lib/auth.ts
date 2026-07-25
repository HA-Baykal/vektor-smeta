export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без O,0,I,1 для читаемости
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  // Формат XXXX-XXXX для удобства
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem("device_fingerprint");
  if (!fp) {
    fp = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("device_fingerprint", fp);
  }
  return fp;
}

export async function sendTelegramMessage(
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

export function isAdminTelegramUser(userId: string | number): boolean {
  const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "";
  if (!adminIdsEnv) {
    // Если админы не заданы — разрешаем всем (для первого запуска)
    return true;
  }
  const adminIds = adminIdsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(String(userId));
}
