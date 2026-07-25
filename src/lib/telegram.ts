import crypto from "crypto";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: any;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export function validateTelegramWebAppData(initData: string, botToken: string): { valid: boolean; data?: any; user?: TelegramUser } {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return { valid: false };

    urlParams.delete("hash");
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    const userStr = urlParams.get("user");
    const user = userStr ? JSON.parse(userStr) : undefined;

    return { valid: true, data: Object.fromEntries(urlParams.entries()), user };
  } catch (e) {
    console.error("Telegram validation error:", e);
    return { valid: false };
  }
}

export function isTelegramAdmin(userId: number | string): boolean {
  const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "";
  if (!adminIdsEnv) return false;
  const adminIds = adminIdsEnv.split(",").map(s => s.trim()).filter(Boolean);
  return adminIds.includes(String(userId));
}
