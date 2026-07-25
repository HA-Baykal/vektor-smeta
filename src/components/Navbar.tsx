"use client";

import React from "react";
import { Snowflake, PlusCircle, BookOpen } from "lucide-react";

interface NavbarProps {
  onOpenTariffs: () => void;
  onResetNew: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTariffs, onResetNew }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo - compact for mobile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-tight leading-none">СМЕТЧИК</h1>
            <p className="text-2xs text-slate-400 hidden md:block leading-none mt-0.5">Сметы на монтаж • Excel • Договор</p>
          </div>
        </div>

        {/* Actions - compact */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenTariffs}
            className="p-2 md:px-3 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            title="Справочник тарифов"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Тарифы</span>
          </button>

          <button
            onClick={onResetNew}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Новая смета</span>
            <span className="sm:hidden">Новая</span>
          </button>
        </div>
      </div>
    </header>
  );
};
