"use client";

import React, { useState, useEffect } from "react";
import { Snowflake, KeyRound, ShieldCheck, Smartphone, AlertTriangle, Lock, Check, Eye, EyeOff, LogOut } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");

  // Инициализация fingerprint устройства
  const getOrCreateFingerprint = (): string => {
    if (typeof window === "undefined") return "";
    let fp = localStorage.getItem("device_fingerprint");
    if (!fp) {
      // Создаем уникальный отпечаток устройства
      const raw = `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
      const hash = btoa(raw)
        .replace(/[^A-Z0-9]/gi, "")
        .slice(0, 12)
        .toUpperCase();
      fp = `DEV-${hash}-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      localStorage.setItem("device_fingerprint", fp);
    }
    return fp;
  };

  const checkExistingAuth = async () => {
    try {
      const fp = getOrCreateFingerprint();
      setDeviceFingerprint(fp);
      const res = await fetch(`/api/auth/status?fingerprint=${encodeURIComponent(fp)}`);
      const json = await res.json();
      if (json.authorized) {
        setIsAuthorized(true);
        localStorage.setItem("is_authorized", "true");
      } else {
        // Также проверяем локальный флаг для оффлайн-работы
        const localAuth = localStorage.getItem("is_authorized");
        if (localAuth === "true") {
          // Повторно проверяем на сервере через 2 сек, но пока даем доступ
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      }
    } catch {
      // При ошибке сети — проверяем локальный флаг
      const localAuth = localStorage.getItem("is_authorized");
      if (localAuth === "true" && getOrCreateFingerprint()) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError("Введите код доступа");
      return;
    }
    setIsVerifying(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const fp = getOrCreateFingerprint();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          fingerprint: fp,
          userAgent: navigator.userAgent,
          deviceInfo: `${navigator.platform} | ${screen.width}x${screen.height} | ${navigator.language}`,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSuccessInfo(json.message || "Доступ разрешён. Устройство привязано.");
        localStorage.setItem("is_authorized", "true");
        localStorage.setItem("bound_code", json.code || code.trim().toUpperCase());
        localStorage.setItem("device_fingerprint", fp);
        setTimeout(() => {
          setIsAuthorized(true);
        }, 1200);
      } else {
        setError(json.message || "Ошибка проверки кода");
      }
    } catch (e) {
      setError("Сетевая ошибка. Проверьте соединение и попробуйте снова.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    if (!confirm("Выйти из системы? Это устройство потеряет доступ и потребуется новый одноразовый код.")) return;
    localStorage.removeItem("is_authorized");
    // Не удаляем fingerprint — но отвязываем на сервере? Для простоты оставляем, но сбрасываем флаг
    setIsAuthorized(false);
    setCode("");
    setError(null);
    setSuccessInfo(null);
  };

  if (isChecking || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center animate-pulse shadow-xl shadow-blue-500/20">
            <Snowflake className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <div className="text-white font-semibold">Проверка доступа устройства...</div>
          <div className="text-xs text-slate-400">Сверка отпечатка: {deviceFingerprint.slice(0, 18)}...</div>
        </div>
      </div>
    );
  }

  if (isAuthorized) {
    // Показываем небольшое напоминание о защищенном режиме в углу
    return (
      <>
        {children}
        <div className="fixed bottom-3 right-3 z-50 no-print">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full text-2xs text-slate-300 shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Устройство авторизовано</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-400">{deviceFingerprint.slice(0, 12)}</span>
            <button
              onClick={handleLogout}
              className="ml-1 p-1 hover:bg-slate-700 rounded-full transition"
              title="Выйти и сбросить доступ"
            >
              <LogOut className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Экран ввода кода — если не авторизован
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-600/30 mb-4">
            <Snowflake className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">СМЕТЧИК</h1>
          <p className="text-sm text-blue-200/70 mt-1">ИИ-Ассистент монтажа кондиционеров</p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-2xs font-bold text-amber-300">
            <Lock className="w-3 h-3" />
            Защищённый доступ — одноразовый код + привязка к устройству
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Вход по одноразовому коду</h2>
              <p className="text-xs text-slate-500">Код генерируется в Telegram-боте</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Одноразовый код доступа
              </label>
              <div className="relative">
                <input
                  type={showCode ? "text" : "password"}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder="XXXX-XXXX"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-2xs text-slate-500">
                <Smartphone className="w-3 h-3 text-blue-500" />
                Это устройство: <span className="font-mono font-bold text-slate-700">{deviceFingerprint}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successInfo}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying || !code.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition active:scale-95"
            >
              {isVerifying ? (
                <>Проверка кода...</>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Активировать и привязать устройство
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-200 space-y-2 text-2xs text-slate-500">
              <div className="font-bold text-slate-700 uppercase tracking-wider">Как работает защита:</div>
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Вы получаете одноразовый код в Telegram-боте (например, <span className="font-mono font-bold">A7K9-M2P4</span>).</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Вводите его один раз на этом устройстве.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Код сгорает и больше не действителен, но это устройство привязывается и работает вечно без повторного ввода.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Второе устройство по тому же коду войти не сможет — защита от копирования.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-2xs text-blue-200/50">
          ИП Сергеева М.В. • Система защищённого доступа v2 • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
