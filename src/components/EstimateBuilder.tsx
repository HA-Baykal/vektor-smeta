"use client";

import React, { useState } from "react";
import {
  EstimateInputs,
  EquipmentInput,
  BASE_INSTALLATION_PRICE,
  COMPLEXITY_PRICE_PER_HOUR,
  EXTRA_TRACE_PRICE_PER_METER,
  CABLE_CHANNEL_PACK_PRICE,
} from "@/lib/calculator";
import {
  Link as LinkIcon,
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";

interface EstimateBuilderProps {
  inputs: EstimateInputs;
  onChange: (inputs: EstimateInputs) => void;
}

export const EstimateBuilder: React.FC<EstimateBuilderProps> = ({ inputs, onChange }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [parsingIndex, setParsingIndex] = useState<number | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);

  const updateField = <K extends keyof EstimateInputs>(field: K, value: EstimateInputs[K]) => {
    onChange({
      ...inputs,
      [field]: value,
    });
  };

  const getEquipments = (): EquipmentInput[] => {
    if (inputs.equipments && inputs.equipments.length > 0) {
      return inputs.equipments;
    }
    // Convert main equipment to array for unified handling
    return [
      {
        modelName: inputs.modelName || "",
        equipmentPrice: inputs.equipmentPrice || 0,
        equipmentBrand: inputs.equipmentBrand || "",
        equipmentType: inputs.equipmentType || "Сплит-система",
        equipmentUrl: inputs.equipmentUrl || "",
        traceLength: inputs.traceLength || 4,
        hasCableChannel: inputs.hasCableChannel || false,
        cableChannelMeters: inputs.cableChannelMeters || 0,
      },
    ];
  };

  const setEquipments = (eqs: EquipmentInput[]) => {
    if (eqs.length === 0) {
      onChange({
        ...inputs,
        modelName: "",
        equipmentPrice: 0,
        equipmentBrand: "",
        equipmentType: "Сплит-система",
        equipmentUrl: "",
        equipments: [],
      });
      return;
    }

    if (eqs.length === 1) {
      // Keep main fields in sync for backward compat
      onChange({
        ...inputs,
        modelName: eqs[0].modelName,
        equipmentPrice: eqs[0].equipmentPrice,
        equipmentBrand: eqs[0].equipmentBrand || "",
        equipmentType: eqs[0].equipmentType || "Сплит-система",
        equipmentUrl: eqs[0].equipmentUrl || "",
        traceLength: eqs[0].traceLength || 4,
        hasCableChannel: eqs[0].hasCableChannel || false,
        cableChannelMeters: eqs[0].cableChannelMeters || 0,
        equipments: eqs,
      });
    } else {
      onChange({
        ...inputs,
        equipments: eqs,
        // Keep main fields as summary
        modelName: `${eqs.length} кондиционеров: ${eqs.map(e => e.modelName || "Без названия").join(", ").slice(0, 80)}`,
      });
    }
  };

  const handleParseLink = async (index: number) => {
    const eqs = getEquipments();
    const eq = eqs[index];
    if (!eq.equipmentUrl?.trim()) {
      setParseMessage(`Укажите ссылку для кондиционера ${index + 1}`);
      return;
    }
    setIsParsing(true);
    setParsingIndex(index);
    setParseMessage(null);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: eq.equipmentUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newEqs = [...eqs];
        newEqs[index] = {
          ...newEqs[index],
          modelName: json.data.modelName || newEqs[index].modelName,
          equipmentPrice: json.data.equipmentPrice || newEqs[index].equipmentPrice,
          equipmentBrand: json.data.equipmentBrand || newEqs[index].equipmentBrand,
          equipmentType: json.data.equipmentType || newEqs[index].equipmentType,
        };
        setEquipments(newEqs);
        setParseMessage(`Данные для кондиционера ${index + 1} извлечены: ${json.data.modelName}`);
      } else {
        setParseMessage("Автопарсинг недоступен. Введите вручную.");
      }
    } catch {
      setParseMessage("Не удалось загрузить страницу. Введите вручную.");
    } finally {
      setIsParsing(false);
      setParsingIndex(null);
    }
  };

  const addEquipment = () => {
    const eqs = getEquipments();
    const newEq: EquipmentInput = {
      modelName: "",
      equipmentPrice: 0,
      equipmentBrand: "",
      equipmentType: "Сплит-система",
      equipmentUrl: "",
      traceLength: inputs.traceLength || 4,
      hasCableChannel: false,
      cableChannelMeters: 0,
    };
    setEquipments([...eqs, newEq]);
  };

  const removeEquipment = (index: number) => {
    const eqs = getEquipments();
    if (eqs.length <= 1) {
      // Clear instead of remove last
      setEquipments([
        {
          modelName: "",
          equipmentPrice: 0,
          equipmentBrand: "",
          equipmentType: "Сплит-система",
          equipmentUrl: "",
          traceLength: 4,
          hasCableChannel: false,
          cableChannelMeters: 0,
        },
      ]);
      return;
    }
    const newEqs = eqs.filter((_, i) => i !== index);
    setEquipments(newEqs);
  };

  const updateEquipment = (index: number, field: keyof EquipmentInput, value: any) => {
    const eqs = getEquipments();
    const newEqs = [...eqs];
    newEqs[index] = { ...newEqs[index], [field]: value };
    
    // If traceLength reduced below cableChannelMeters, adjust cable meters
    if (field === "traceLength" && newEqs[index].hasCableChannel) {
      const trace = Number(value) || 4;
      const cableM = Number(newEqs[index].cableChannelMeters) || 0;
      if (cableM > trace) {
        newEqs[index].cableChannelMeters = trace;
      }
    }
    
    setEquipments(newEqs);
  };

  const equipments = getEquipments();
  const extraMeters = Math.max(0, (inputs.traceLength || 4) - 5);

  return (
    <div className="space-y-6">
      {/* STEP 1: Multiple Equipments */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Шаг 1. Оборудование — {equipments.length} {equipments.length === 1 ? "кондиционер" : equipments.length < 5 ? "кондиционера" : "кондиционеров"}
              </h3>
              <p className="text-xs text-slate-500">
                Добавьте ссылки, парсите цены или вводите вручную. Можно добавить 2-3 кондиционера для одного договора.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addEquipment}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Добавить кондиционер
          </button>
        </div>

        {parseMessage && (
          <div className="text-xs px-3 py-2 bg-blue-50 text-blue-800 rounded-lg mb-4 flex items-center gap-1.5 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{parseMessage}</span>
          </div>
        )}

        <div className="space-y-5">
          {equipments.map((eq, idx) => {
            const eqTrace = eq.traceLength || 4;
            const eqCableMeters = eq.hasCableChannel
              ? Math.min(eq.cableChannelMeters && eq.cableChannelMeters > 0 ? eq.cableChannelMeters : eqTrace, eqTrace)
              : 0;
            const eqPacks = eqCableMeters > 0 ? Math.ceil(eqCableMeters / 2) : 0;
            const eqExtra = Math.max(0, eqTrace - 5);

            return (
              <div key={idx} className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-sm text-slate-900">
                      Кондиционер {idx + 1}
                    </span>
                    {eq.equipmentPrice > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-2xs font-bold">
                        {eq.equipmentPrice.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newEqs = [...equipments];
                        const copy = { ...eq, id: undefined };
                        newEqs.splice(idx + 1, 0, copy);
                        setEquipments(newEqs);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200"
                      title="Дублировать"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEquipment(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Link + Parse row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={eq.equipmentUrl || ""}
                      onChange={(e) => updateEquipment(idx, "equipmentUrl", e.target.value)}
                      placeholder="https://... ссылка на кондиционер (Авито, Яндекс.Маркет, Русклимат, Даичи)"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleParseLink(idx)}
                    disabled={isParsing && parsingIndex === idx}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    {isParsing && parsingIndex === idx ? "Парсинг..." : "Парсить"}
                  </button>
                </div>

                {/* Manual fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                    <label className="block text-2xs font-semibold text-slate-700 mb-1">Модель *</label>
                    <input
                      type="text"
                      value={eq.modelName}
                      onChange={(e) => updateEquipment(idx, "modelName", e.target.value)}
                      placeholder="Ballu Eco Pro 09 / Axioma ASX09HZ1R"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-2xs font-semibold text-slate-700 mb-1">Цена (₽) *</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={eq.equipmentPrice || ""}
                      onChange={(e) => updateEquipment(idx, "equipmentPrice", parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-blue-900 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      placeholder="35000"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-2xs font-semibold text-slate-700 mb-1">Тип</label>
                    <select
                      value={eq.equipmentType || "Сплит-система"}
                      onChange={(e) => updateEquipment(idx, "equipmentType", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Сплит-система">Сплит</option>
                      <option value="Инверторная сплит-система">Инвертор</option>
                      <option value="Мульти-сплит система">Мульти-сплит</option>
                      <option value="Канальный кондиционер">Канальный</option>
                      <option value="Кассетный кондиционер">Кассетный</option>
                    </select>
                  </div>
                </div>

                {/* Per-equipment trace and cable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-2xs font-bold text-slate-700">Трасса (м):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={25}
                        value={eqTrace}
                        onChange={(e) => updateEquipment(idx, "traceLength", parseInt(e.target.value, 10))}
                        className="w-20 accent-blue-600 h-1.5"
                      />
                      <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border min-w-[45px] text-center">
                        {eqTrace} м
                      </span>
                      {eqExtra > 0 && (
                        <span className="text-2xs text-amber-700 font-bold">
                          +{eqExtra}м = {(eqExtra * EXTRA_TRACE_PRICE_PER_METER).toLocaleString("ru-RU")}₽
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <label className="text-2xs font-bold text-slate-700">Кабель-канал:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateEquipment(idx, "hasCableChannel", !eq.hasCableChannel)}
                        className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition ${
                          eq.hasCableChannel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300"
                        }`}
                      >
                        {eq.hasCableChannel ? `Да ${eqCableMeters}м` : "Нет"}
                      </button>
                      {eq.hasCableChannel && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={eqTrace}
                            value={eqCableMeters}
                            onChange={(e) => updateEquipment(idx, "cableChannelMeters", parseInt(e.target.value, 10) || 0)}
                            className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded text-2xs font-mono font-bold text-center"
                          />
                          <span className="text-2xs text-slate-500">м = {eqPacks}уп { (eqPacks * CABLE_CHANNEL_PACK_PRICE).toLocaleString("ru-RU")}₽</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xs font-bold shrink-0 mt-0.5">i</div>
          <div>
            <div className="font-bold">Несколько кондиционеров в одном договоре:</div>
            <div>Добавьте 2-3 кондиционера кнопкой выше. Смета автоматически пересчитается: оборудование суммируется, монтаж 18 000 ₽ × количество, трасса и кабель-канал считаются для каждого блока отдельно. В договоре будут перечислены все кондиционеры.</div>
          </div>
        </div>
      </div>

      {/* STEP 2: Global params */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">2</div>
          <div>
            <h3 className="font-bold text-base text-slate-900">Шаг 2. Общие параметры монтажа</h3>
            <p className="text-xs text-slate-500">Сложность, скидка, НДС — применяются ко всей смете</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">Сложность монтажа</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  updateField("complexity", "standard");
                  updateField("complexityHours", 0);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${inputs.complexity === "standard" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-300"}`}
              >
                Стандартный
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField("complexity", "complex");
                  if (!inputs.complexityHours) updateField("complexityHours", 2);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${inputs.complexity === "complex" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-300"}`}
              >
                Сложный (+1 000 ₽/ч)
              </button>
            </div>
            {inputs.complexity === "complex" && (
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-200 pt-2">
                <span>Часов сложности:</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateField("complexityHours", Math.max(1, (inputs.complexityHours || 1) - 1))} className="w-6 h-6 rounded bg-slate-200 font-bold">-</button>
                  <span className="font-bold font-mono">{inputs.complexityHours || 1} ч</span>
                  <button type="button" onClick={() => updateField("complexityHours", Math.min(12, (inputs.complexityHours || 1) + 1))} className="w-6 h-6 rounded bg-slate-200 font-bold">+</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">Скидка</label>
              <div className="flex gap-2">
                <select value={inputs.discountType || "none"} onChange={(e) => updateField("discountType", e.target.value as any)} className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs">
                  <option value="none">Без скидки</option>
                  <option value="percent">% Процент</option>
                  <option value="fixed">Фикс ₽</option>
                </select>
                {inputs.discountType !== "none" && (
                  <input type="number" value={inputs.discountValue || ""} onChange={(e) => updateField("discountValue", parseInt(e.target.value, 10) || 0)} className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold" placeholder={inputs.discountType === "percent" ? "5" : "2000"} />
                )}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">НДС</label>
              <select value={inputs.vatType || "none"} onChange={(e) => updateField("vatType", e.target.value as any)} className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs">
                <option value="none">Без НДС</option>
                <option value="vat6">С НДС 6%</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Client */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">3</div>
          <div>
            <h3 className="font-bold text-base text-slate-900">Шаг 3. Заказчик (пусто по умолчанию)</h3>
            <p className="text-xs text-slate-500">Заполните вручную для договора</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={inputs.clientName || ""} onChange={(e) => updateField("clientName", e.target.value)} placeholder="ФИО Заказчика" className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
          <input type="text" value={inputs.clientPhone || ""} onChange={(e) => updateField("clientPhone", e.target.value)} placeholder="Телефон" className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
          <input type="text" value={inputs.clientAddress || ""} onChange={(e) => updateField("clientAddress", e.target.value)} placeholder="Адрес монтажа" className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
        </div>
      </div>
    </div>
  );
};
