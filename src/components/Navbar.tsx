"use client";

import React from "react";
import { Snowflake, PlusCircle, BookOpen, Smartphone } from "lucide-react";
import { useTelegram } from "./TelegramProvider";

interface NavbarProps {
  onOpenTariffs: () => void;
  onResetNew: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTariffs, onResetNew }) => {
  const { isInTelegram, user, isAdmin } = useTelegram();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Snowflake className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-tight">СМЕТЧИК</h1>
              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                ИИ-Ассистент
              </span>
              {isInTelegram && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Telegram Mini App
                </span>
              )}
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Админ
                </span>
              )}
            </div>
            <p className="text-2xs text-slate-400 hidden sm:block">
              {isInTelegram && user
                ? `Привет, ${user.first_name}! Составление смет в Telegram`
                : "Составление смет на монтаж кондиционеров с выгрузкой в Excel (.xlsx) и PDF"}
            </p>
          </div>
        </div>

        {/* Live Tariffs Chips & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-2xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-emerald-400 font-bold">База (до 5 м): 18 000 ₽</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-bold">Сложность: +1 000 ₽/ч</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-bold">&gt;5 м: 2 100 ₽/м</span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-400 font-bold">Короб: 1 200 ₽</span>
          </div>

          <button
            onClick={onOpenTariffs}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Справочник тарифов</span>
          </button>

          <button
            onClick={onResetNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Новая смета</span>
          </button>
        </div>
      </div>
    </header>
  );
};
