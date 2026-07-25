"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  Smartphone,
  Trash2,
  Plus,
  Copy,
  Check,
  LogOut,
  MessageCircle,
  Bot,
  AlertTriangle,
  ExternalLink,
  QrCode,
  RefreshCw,
  Terminal,
  Settings,
  Link2,
} from "lucide-react";
import { formatRuble } from "@/lib/calculator";

interface AccessCodeItem {
  id: number;
  code: string;
  isUsed: boolean;
  deviceFingerprint: string | null;
  deviceInfo: string | null;
  createdAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  createdByTelegramId: string | null;
  createdByTelegramUsername: string | null;
}

export const AdminPanel: React.FC = () => {
  const [codes, setCodes] = useState<AccessCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [botToken, setBotToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [githubRepo, setGithubRepo] = useState("");
  const [githubInstructionsOpen, setGithubInstructionsOpen] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/codes");
      const json = await res.json();
      if (json.success) setCodes(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
    if (typeof window !== "undefined") {
      const host = window.location.origin;
      setWebhookUrl(`${host}/api/telegram/webhook`);
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/auth/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote || "Создано из админки" }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNote("");
        fetchCodes();
      } else {
        alert("Ошибка: " + json.message);
      }
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
    setIsGenerating(false);
  };

  const handleDelete = async (idOrCode: string, isId: boolean) => {
    if (!confirm("Удалить этот код?")) return;
    try {
      const url = isId
        ? `/api/auth/codes?id=${idOrCode}`
        : `/api/auth/codes?code=${encodeURIComponent(idOrCode)}`;
      await fetch(url, { method: "DELETE" });
      fetchCodes();
    } catch (e) {
      alert("Ошибка удаления: " + (e as Error).message);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSetupWebhook = async () => {
    if (!webhookUrl) {
      alert("Укажите Webhook URL");
      return;
    }
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const json = await res.json();
      alert(json.success ? "Вебхук установлен!" : "Ошибка: " + JSON.stringify(json));
      checkWebhook();
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
  };

  const checkWebhook = async () => {
    try {
      const res = await fetch("/api/telegram/setup");
      const json = await res.json();
      setWebhookStatus(json.data || json);
    } catch {}
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Админ-панель: Доступ, Telegram и GitHub</h2>
            <p className="text-xs text-slate-400">
              Управление одноразовыми кодами, привязкой устройств, Telegram-ботом и выгрузкой в GitHub
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Access Codes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Одноразовые коды доступа (с привязкой к устройству)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Код работает 1 раз: после ввода на устройстве оно привязывается и работает вечно, код сгорает.
            </p>
          </div>
          <button
            onClick={fetchCodes}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Generate Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Заметка к коду (например: для клиента Иван Петров)"
            className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isGenerating ? "Генерация..." : "Сгенерировать код"}
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Загрузка кодов...</div>
        ) : codes.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">Кодoв пока нет</div>
            <div className="text-xs text-slate-500">Сгенерируйте первый код кнопкой выше или через Telegram-бота /gen</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Код</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3">Устройство</th>
                  <th className="py-2.5 px-3">Создан</th>
                  <th className="py-2.5 px-3">Заметка / Автор</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-2xs tracking-wider">
                        {c.code}
                      </span>
                      <button
                        onClick={() => handleCopy(c.code)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        {copiedCode === c.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      {c.isUsed ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-2xs font-bold">
                          ✅ Привязан
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-2xs font-bold">
                          🟡 Активен
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate">
                      {c.deviceFingerprint ? (
                        <span className="font-mono text-2xs" title={c.deviceInfo || ""}>
                          {c.deviceFingerprint}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">— не привязан</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(c.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                      <div>{c.note || "—"}</div>
                      {c.createdByTelegramUsername && (
                        <div className="text-2xs text-blue-600">@{c.createdByTelegramUsername}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDelete(String(c.id), true)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Telegram Bot Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 mb-4">
          <Bot className="w-5 h-5 text-sky-600" />
          Подключение Telegram-бота для генерации кодов
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 space-y-2">
              <div className="font-bold text-sm">📋 Пошаговая инструкция (2 минуты):</div>
              <div className="space-y-1.5">
                <div>
                  <strong>1. Создайте бота:</strong> Откройте <span className="font-mono bg-white px-1 rounded">@BotFather</span> в Telegram → /newbot → придумайте название (например, Сметчик) и юзернейм с _bot.
                </div>
                <div>
                  <strong>2. Скопируйте токен:</strong> BotFather пришлёт токен вида <span className="font-mono text-2xs">123456:ABC...</span>. Вставьте его в .env:
                </div>
                <div className="font-mono bg-slate-900 text-emerald-300 p-2 rounded text-2xs">
                  TELEGRAM_BOT_TOKEN=1234567890:AAH...<br />
                  TELEGRAM_ADMIN_IDS=ваш_telegram_id
                </div>
                <div>
                  <strong>3. Узнайте ваш Telegram ID:</strong> Напишите боту @userinfobot → он покажет ваш ID.
                </div>
                <div>
                  <strong>4. Установите вебхук:</strong> После деплоя вашего приложения введите в поле ниже полный URL вашего сайта + /api/telegram/webhook и нажмите «Установить вебхук».
                </div>
                <div>
                  <strong>5. Готово:</strong> Теперь в боте команды /gen, /list, /revoke работают и коды создаются в базе автоматически.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Webhook URL (автоматически):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                />
                <button
                  onClick={handleSetupWebhook}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4" />
                  Установить вебхук
                </button>
              </div>
              <button
                onClick={checkWebhook}
                className="text-xs text-sky-600 hover:text-sky-800 underline"
              >
                Проверить статус вебхука
              </button>
              {webhookStatus && (
                <pre className="text-2xs bg-slate-100 p-2 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(webhookStatus, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-sky-600" />
                Команды бота:
              </div>
              <div className="space-y-1 font-mono text-2xs bg-white p-3 rounded-lg border">
                <div>/start — главное меню + кнопка генерации</div>
                <div>/gen — 1 новый код</div>
                <div>/gen 5 — 5 кодов сразу</div>
                <div>/list — последние 10 кодов</div>
                <div>/revoke XXXX-XXXX — удалить код</div>
                <div>/help — справка</div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Важно про .env:</div>
                <div>
                  На сервере/хостинге добавьте переменные окружения: TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_IDS. Без них бот не сможет ограничить генерацию только для вас.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-2xs">
              <div className="text-slate-400"># .env.example для деплоя</div>
              <div>TELEGRAM_BOT_TOKEN=123...:AAH...</div>
              <div>TELEGRAM_ADMIN_IDS=123456789,987654321</div>
              <div>DATABASE_URL=postgresql://...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: GitHub Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 mb-4">
          <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-2xs font-bold">GH</span>
          Загрузка в GitHub и деплой
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <div className="font-semibold text-slate-800">Вариант A — дать мне доступ (быстро):</div>
            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
              <div>1. Создайте пустой репозиторий на GitHub (например, <span className="font-mono">smetchik-app</span>).</div>
              <div>2. Создайте Personal Access Token (classic): GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → выберите scope <span className="font-mono">repo</span>.</div>
              <div>3. Сообщите мне: <span className="font-mono">GITHUB_TOKEN</span> и ссылку на репозиторий <span className="font-mono">https://github.com/USERNAME/REPO.git</span> — я сам запушу код (токен нигде не сохраню после пуша, можете сразу отозвать).</div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-2xs">
                В этом песочнице я выполню: <br />
                <code>git init → git add . → git commit → git remote add origin &lt;repo&gt; → git push -u origin main</code>
              </div>
            </div>

            <div className="font-semibold text-slate-800 pt-2">Вариант B — скачать и загрузить вручную:</div>
            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
              <div>1. Скачайте архив проекта с этого предпросмотра (кнопка Download / Export в панели).</div>
              <div>2. На вашем компьютере:</div>
              <div className="font-mono bg-slate-900 text-slate-100 p-2 rounded text-2xs space-y-0.5">
                <div>git init</div>
                <div>git add .</div>
                <div>git commit -m &quot;feat: smetchik with contract and auth&quot;</div>
                <div>git branch -M main</div>
                <div>git remote add origin https://github.com/YOU/REPO.git</div>
                <div>git push -u origin main</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-semibold text-slate-800">Рекомендуемый стек деплоя с Telegram:</div>
            <div className="space-y-2">
              <div className="p-3 border rounded-xl bg-emerald-50 border-emerald-200">
                <div className="font-bold text-emerald-900">Vercel / Railway / Render + PostgreSQL</div>
                <div className="text-2xs text-emerald-800 mt-1">
                  1. Создайте проект, подключите GitHub репо.<br />
                  2. Добавьте Postgres (Vercel Postgres / Neon / Supabase).<br />
                  3. В Environment Variables добавьте: DATABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS.<br />
                  4. После деплоя установите вебхук: откройте <span className="font-mono">https://ваш-домен/api/telegram/setup</span> и POST с {"{ \"url\": \"https://ваш-домен/api/telegram/webhook\" }"} или используйте кнопку выше.
                </div>
              </div>

              <div className="p-3 border rounded-xl">
                <div className="font-bold">Быстрая проверка бота после деплоя:</div>
                <div className="font-mono bg-slate-900 text-slate-100 p-2 rounded mt-1 text-2xs">
                  curl https://ваш-домен/api/telegram/webhook
                </div>
                <div className="mt-2">Откройте бота в Telegram → /start → /gen → код должен прийти мгновенно.</div>
              </div>

              <button
                onClick={() => setGithubInstructionsOpen(!githubInstructionsOpen)}
                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                {githubInstructionsOpen ? "Скрыть детальную инструкцию по GitHub CLI" : "Показать инструкцию по GitHub CLI + gh"}
              </button>

              {githubInstructionsOpen && (
                <div className="font-mono bg-slate-900 text-slate-100 p-3 rounded-xl text-2xs space-y-1 overflow-auto">
                  <div># Установка GitHub CLI (macOS/Linux)</div>
                  <div>brew install gh # или apt install gh</div>
                  <div>gh auth login</div>
                  <div>gh repo create smetchik-app --public --source=. --remote=origin --push</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
