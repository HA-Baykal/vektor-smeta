"use client";

import React, { useState } from "react";
import {
  EstimateInputs,
  BASE_INSTALLATION_PRICE,
  COMPLEXITY_PRICE_PER_HOUR,
  EXTRA_TRACE_PRICE_PER_METER,
  CABLE_CHANNEL_PACK_PRICE,
} from "@/lib/calculator";
import {
  Link as LinkIcon,
  Search,
  Sparkles,
  Zap,
  Layers,
  Wrench,
  ShieldAlert,
  Percent,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface EstimateBuilderProps {
  inputs: EstimateInputs;
  onChange: (inputs: EstimateInputs) => void;
}

export const EstimateBuilder: React.FC<EstimateBuilderProps> = ({ inputs, onChange }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [showAddWorks, setShowAddWorks] = useState(false);

  const updateField = <K extends keyof EstimateInputs>(field: K, value: EstimateInputs[K]) => {
    onChange({
      ...inputs,
      [field]: value,
    });
  };

  const handleParseLink = async () => {
    if (!inputs.equipmentUrl?.trim()) {
      setParseMessage("Пожалуйста, укажите ссылку на товар");
      return;
    }
    setIsParsing(true);
    setParseMessage(null);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputs.equipmentUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onChange({
          ...inputs,
          modelName: json.data.modelName || inputs.modelName,
          equipmentPrice: json.data.equipmentPrice || inputs.equipmentPrice,
          equipmentBrand: json.data.equipmentBrand || inputs.equipmentBrand,
          equipmentType: json.data.equipmentType || inputs.equipmentType,
        });
        setParseMessage("Данные оборудования успешно извлечены!");
      } else {
        setParseMessage("Автопарсинг недоступен для данной ссылки. Укажите название и цену вручную.");
      }
    } catch {
      setParseMessage("Не удалось загрузить страницу. Пожалуйста, введите модель и цену вручную.");
    } finally {
      setIsParsing(false);
    }
  };

  const extraMeters = Math.max(0, (inputs.traceLength || 4) - 5);
  const packsCount = inputs.hasCableChannel ? Math.ceil((inputs.traceLength || 4) / 2) : 0;

  return (
    <div className="space-y-6">
      {/* STEP 1: Equipment & Link */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Шаг 1. Оборудование и ссылка на кондиционер
              </h3>
              <p className="text-xs text-slate-500">
                Вставьте ссылку на товар (Авито, Яндекс.Маркет, DNS) или введите данные вручную
              </p>
            </div>
          </div>
        </div>

        {/* Link Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={inputs.equipmentUrl || ""}
              onChange={(e) => updateField("equipmentUrl", e.target.value)}
              placeholder="https://market.yandex.ru/product/... или https://avito.ru/..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
            />
          </div>
          <button
            type="button"
            onClick={handleParseLink}
            disabled={isParsing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            {isParsing ? "Парсинг..." : "Парсить ссылку"}
          </button>
        </div>

        {parseMessage && (
          <div className="text-xs px-3 py-2 bg-blue-50 text-blue-800 rounded-lg mb-4 flex items-center gap-1.5 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{parseMessage}</span>
          </div>
        )}

        {/* Manual inputs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Название модели кондиционера *
            </label>
            <input
              type="text"
              value={inputs.modelName}
              onChange={(e) => updateField("modelName", e.target.value)}
              placeholder="Haier Coral HSU-07HPL102/R3"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Цена оборудования (₽) *
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={inputs.equipmentPrice || ""}
              onChange={(e) => updateField("equipmentPrice", parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-blue-900 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Тип кондиционера
            </label>
            <select
              value={inputs.equipmentType || "Сплит-система"}
              onChange={(e) => updateField("equipmentType", e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="Сплит-система">Сплит-система</option>
              <option value="Инверторная сплит-система">Инверторная сплит-система</option>
              <option value="Мульти-сплит система">Мульти-сплит система</option>
              <option value="Канальный кондиционер">Канальный кондиционер</option>
              <option value="Кассетный кондиционер">Кассетный кондиционер</option>
            </select>
          </div>
        </div>
      </div>

      {/* STEP 2: Installation Parameters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Шаг 2. Уточнение параметров монтажа
            </h3>
            <p className="text-xs text-slate-500">
              Длина трассы, сложность и необходимость укладки в кабель-канал
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Trace length */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Длина трассы (расстояние между блоками)
                </label>
                <span className="text-base font-extrabold text-blue-700 font-mono bg-blue-100 px-2 py-0.5 rounded-lg">
                  {inputs.traceLength || 4} м
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                step={1}
                value={inputs.traceLength || 4}
                onChange={(e) => updateField("traceLength", parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            <div className="mt-3 text-xs pt-2 border-t border-slate-200">
              {extraMeters > 0 ? (
                <div className="text-amber-800 font-medium">
                  Свыше 5 м: +{extraMeters} м × 2 100 ₽ ={" "}
                  <strong>{(extraMeters * EXTRA_TRACE_PRICE_PER_METER).toLocaleString("ru-RU")} ₽</strong>
                </div>
              ) : (
                <div className="text-emerald-700 font-medium">
                  До 5 м включено в базовый монтаж (18 000 ₽)
                </div>
              )}
            </div>
          </div>

          {/* 2. Complexity */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Сложность монтажа
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateField("complexity", "standard");
                    updateField("complexityHours", 0);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    inputs.complexity === "standard"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Стандартный (0 ₽)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateField("complexity", "complex");
                    if (!inputs.complexityHours) updateField("complexityHours", 2);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    inputs.complexity === "complex"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Сложный (+1 000 ₽/ч)
                </button>
              </div>
            </div>

            {inputs.complexity === "complex" && (
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">Часов сложности:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("complexityHours", Math.max(1, (inputs.complexityHours || 1) - 1))
                    }
                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold font-mono text-sm px-1.5">
                    {inputs.complexityHours || 1} ч
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("complexityHours", Math.min(12, (inputs.complexityHours || 1) + 1))
                    }
                    className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Cable duct */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Кабель-канал (короб)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField("hasCableChannel", false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    !inputs.hasCableChannel
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Открытая трасса
                </button>
                <button
                  type="button"
                  onClick={() => updateField("hasCableChannel", true)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    inputs.hasCableChannel
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  В кабель-канале
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs pt-2 border-t border-slate-200">
              {inputs.hasCableChannel ? (
                <div className="text-blue-800 font-medium">
                  {inputs.traceLength || 4} м → {packsCount} упак. (по 2 м) ={" "}
                  <strong>{(packsCount * CABLE_CHANNEL_PACK_PRICE).toLocaleString("ru-RU")} ₽</strong>
                </div>
              ) : (
                <div className="text-slate-500">Доплата 0 ₽ (трасса без пластикового короба)</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Client Details, Discounts & Commercial parameters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Шаг 3. Реквизиты клиента, скидки и НДС
              </h3>
              <p className="text-xs text-slate-500">
                Эти данные автоматически попадут на лист «Параметры» в Excel и PDF
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ФИО / Имя клиента
            </label>
            <input
              type="text"
              value={inputs.clientName || ""}
              onChange={(e) => updateField("clientName", e.target.value)}
              placeholder="Иван Петров"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Телефон клиента
            </label>
            <input
              type="text"
              value={inputs.clientPhone || ""}
              onChange={(e) => updateField("clientPhone", e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Адрес монтажа
            </label>
            <input
              type="text"
              value={inputs.clientAddress || ""}
              onChange={(e) => updateField("clientAddress", e.target.value)}
              placeholder="г. Москва, ул. Ленина, д. 42, кв. 15"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Дата монтажа
            </label>
            <input
              type="date"
              value={inputs.installationDate || ""}
              onChange={(e) => updateField("installationDate", e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Discounts & VAT switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Скидка клиенту
            </label>
            <div className="flex items-center gap-2">
              <select
                value={inputs.discountType || "none"}
                onChange={(e) => updateField("discountType", e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="none">Без скидки</option>
                <option value="percent">Процентная (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>

              {inputs.discountType && inputs.discountType !== "none" && (
                <input
                  type="number"
                  min={0}
                  value={inputs.discountValue || ""}
                  onChange={(e) => updateField("discountValue", parseInt(e.target.value, 10) || 0)}
                  placeholder={inputs.discountType === "percent" ? "5%" : "2000 ₽"}
                  className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900"
                />
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Режим налогообложения / НДС
            </label>
            <select
              value={inputs.vatType || "none"}
              onChange={(e) => updateField("vatType", e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
            >
              <option value="none">Без НДС</option>
              <option value="vat6">С НДС 6%</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
