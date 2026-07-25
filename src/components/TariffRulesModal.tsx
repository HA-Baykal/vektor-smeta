"use client";

import React from "react";
import { X, CheckCircle2, Calculator, Info } from "lucide-react";
import { formatRuble } from "@/lib/calculator";

interface TariffRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TariffRulesModal: React.FC<TariffRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Тарифы и формулы расчёта сметы</h3>
              <p className="text-xs text-blue-200/80">
                Прозрачные фиксированные цены и правила ценообразования
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
          {/* Base rates cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                1. Базовый монтаж
              </div>
              <div className="text-xl font-bold text-blue-950">18 000 ₽</div>
              <p className="text-xs text-blue-800 mt-1">
                Включает трассу <strong>до 5 метров</strong>, кронштейны, бурение 1 отверстия, вакуумирование и пусконаладку.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                2. Сложный монтаж
              </div>
              <div className="text-xl font-bold text-amber-950">+1 000 ₽ / час</div>
              <p className="text-xs text-amber-800 mt-1">
                Дополнительное время при нестандартных условиях, стеснённом доступе или специфике фасада.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                3. Трасса свыше 5 метров
              </div>
              <div className="text-xl font-bold text-emerald-950">2 100 ₽ / метр</div>
              <p className="text-xs text-emerald-800 mt-1">
                Состоит из: <strong>материал 1 100 ₽</strong> + <strong>работа 1 000 ₽</strong> за каждый метр свыше 5 м.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
                4. Кабель-канал (короб)
              </div>
              <div className="text-xl font-bold text-purple-950">1 200 ₽ / упаковка</div>
              <p className="text-xs text-purple-800 mt-1">
                1 упаковка = 2 метра. Округление вверх до целого числа (например: 5 м → 3 шт. = 6 м).
              </p>
            </div>
          </div>

          {/* Prompt Formula Section */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs space-y-2 border border-slate-800">
            <div className="text-blue-400 font-bold text-sm mb-2">Общая формула расчёта:</div>
            <div>1. Оборудование = цена из ссылки или каталога</div>
            <div>2. Монтаж = 18 000 ₽ (базовый пакет до 5 м)</div>
            <div>3. Если сложный: + (часы сложности × 1 000 ₽)</div>
            <div>4. Если трасса &gt; 5 м: + ((длина трассы − 5) × 2 100 ₽)</div>
            <div>5. Если кабель-канал: + (округление_вверх(длина / 2) × 1 200 ₽)</div>
            <div className="pt-2 text-emerald-400 font-bold">ИТОГО = Сумма всех пунктов</div>
          </div>

          {/* Verified Examples */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Примеры эталонных расчётов:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">Пример 1 (стандарт):</div>
                <div className="text-slate-600">• Кондиционер: 25 000 ₽</div>
                <div className="text-slate-600">• Трасса: 4 м (базовая)</div>
                <div className="text-slate-600">• Сложность: стандарт (0 ₽)</div>
                <div className="text-slate-600">• Кабель-канал: нет</div>
                <div className="font-bold text-blue-700 pt-1 border-t border-slate-200">
                  ИТОГО: 25 000 + 18 000 = 43 000 ₽
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">Пример 2 (сложный + кабель-канал):</div>
                <div className="text-slate-600">• Кондиционер: 32 000 ₽</div>
                <div className="text-slate-600">• Трасса: 8 м (+3 м сверх 5 м = 6 300 ₽)</div>
                <div className="text-slate-600">• Сложность: +3 ч (3 000 ₽)</div>
                <div className="text-slate-600">• Кабель-канал: 8 м → 4 упак × 1 200 = 4 800 ₽</div>
                <div className="font-bold text-blue-700 pt-1 border-t border-slate-200">
                  ИТОГО: 32 000 + 18 000 + 3 000 + 6 300 + 4 800 = 64 100 ₽
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
          >
            Понятно, к расчёту
          </button>
        </div>
      </div>
    </div>
  );
};
