"use client";

import React, { useState } from "react";
import { formatRuble } from "@/lib/calculator";
import { Plus, Trash2, Link as LinkIcon, Zap, FileSpreadsheet, Printer, Copy, Check } from "lucide-react";
import { printElementById, openPrintableInNewTab } from "@/lib/print";
import { downloadBlob } from "@/lib/mobile-download";

interface CustomWork {
  id: string;
  name: string;
  quantity: number;
  workPricePerMeter: number;
  materialPricePerMeter: number;
  materialName?: string;
}

interface EquipmentForSale {
  id: string;
  modelName: string;
  price: number;
  url?: string;
}

interface AdditionalWish {
  id: string;
  description: string;
  amount: number;
}

export const OtherWorksTab: React.FC = () => {
  const [customWorks, setCustomWorks] = useState<CustomWork[]>([
    {
      id: "1",
      name: "Штробление стены",
      quantity: 6,
      workPricePerMeter: 1100,
      materialPricePerMeter: 0,
      materialName: "",
    },
    {
      id: "2",
      name: "Укладка трассы кондиционера (фреонопровод)",
      quantity: 6,
      workPricePerMeter: 0,
      materialPricePerMeter: 1100,
      materialName: "Фреонопровод с теплоизоляцией",
    },
  ]);

  const [equipmentsForSale, setEquipmentsForSale] = useState<EquipmentForSale[]>([]);
  const [additionalWishes, setAdditionalWishes] = useState<AdditionalWish[]>([]);
  const [isParsing, setIsParsing] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contractNumber, setContractNumber] = useState("67");
  const [copied, setCopied] = useState(false);

  const addCustomWork = () => {
    const newWork: CustomWork = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      workPricePerMeter: 1100,
      materialPricePerMeter: 0,
    };
    setCustomWorks([...customWorks, newWork]);
  };

  const updateCustomWork = (id: string, field: keyof CustomWork, value: any) => {
    setCustomWorks(customWorks.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const removeCustomWork = (id: string) => {
    setCustomWorks(customWorks.filter(w => w.id !== id));
  };

  const addEquipmentForSale = () => {
    setEquipmentsForSale([
      ...equipmentsForSale,
      { id: Date.now().toString(), modelName: "", price: 0, url: "" },
    ]);
  };

  const updateEquipmentForSale = (id: string, field: keyof EquipmentForSale, value: any) => {
    setEquipmentsForSale(equipmentsForSale.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEquipmentForSale = (id: string) => {
    setEquipmentsForSale(equipmentsForSale.filter(e => e.id !== id));
  };

  const parseEquipmentLink = async (id: string) => {
    const eq = equipmentsForSale.find(e => e.id === id);
    if (!eq?.url?.trim()) return;
    
    setIsParsing(id);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: eq.url }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEquipmentsForSale(equipmentsForSale.map(e => 
          e.id === id 
            ? { ...e, modelName: json.data.modelName || e.modelName, price: json.data.equipmentPrice || e.price }
            : e
        ));
      }
    } catch {}
    setIsParsing(null);
  };

  const addAdditionalWish = () => {
    setAdditionalWishes([
      ...additionalWishes,
      { id: Date.now().toString(), description: "", amount: 0 },
    ]);
  };

  const updateAdditionalWish = (id: string, field: keyof AdditionalWish, value: any) => {
    setAdditionalWishes(additionalWishes.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const removeAdditionalWish = (id: string) => {
    setAdditionalWishes(additionalWishes.filter(w => w.id !== id));
  };

  // Calculations
  const totalWork = customWorks.reduce((sum, w) => sum + (w.quantity * (Number(w.workPricePerMeter) || 0)), 0);
  const totalMaterial = customWorks.reduce((sum, w) => sum + (w.quantity * (Number(w.materialPricePerMeter) || 0)), 0);
  const totalCustomWorks = totalWork + totalMaterial;
  const totalEquipment = equipmentsForSale.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
  const totalAdditional = additionalWishes.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const grandTotal = totalCustomWorks + totalEquipment + totalAdditional;

  const handlePrint = () => {
    printElementById("printable-other-works", `Другие_работы_договор_${contractNumber}`);
  };

  const handleOpenNewTab = () => {
    openPrintableInNewTab("printable-other-works", `Другие_работы_договор_${contractNumber}`);
  };

  const handleExportExcel = async () => {
    // Create simple Excel via API using otherExpenses
    const otherExpenses = [
      ...customWorks.map(w => ({
        description: `${w.name} ${w.quantity}м (работа ${w.workPricePerMeter}₽/м + материал ${w.materialPricePerMeter}₽/м)`,
        amount: (w.quantity * w.workPricePerMeter) + (w.quantity * w.materialPricePerMeter),
      })),
      ...equipmentsForSale.filter(e => e.modelName && e.price > 0).map(e => ({
        description: `Продажа кондиционера: ${e.modelName}`,
        amount: e.price,
      })),
      ...additionalWishes.filter(w => w.description && w.amount > 0).map(w => ({
        description: w.description,
        amount: w.amount,
      })),
    ];

    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: `Другие виды работ: ${customWorks.map(w => w.name).join(", ").slice(0, 50)}`,
          equipmentPrice: 0,
          traceLength: 4,
          complexity: "standard",
          complexityHours: 0,
          hasCableChannel: false,
          otherExpenses,
          clientName,
          clientAddress,
          installationDate: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Ошибка");
      const blob = await res.blob();
      await downloadBlob(blob, `smeta_drugie_raboty_${contractNumber}.xlsx`);
    } catch (e) {
      alert("Ошибка экспорта Excel: " + (e as Error).message);
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: `Другие виды работ`,
          equipmentPrice: 0,
          traceLength: 4,
          complexity: "standard",
          complexityHours: 0,
          hasCableChannel: false,
          otherExpenses: [
            ...customWorks.map(w => ({
              description: `${w.name} ${w.quantity}м`,
              amount: (w.quantity * w.workPricePerMeter) + (w.quantity * w.materialPricePerMeter),
            })),
            ...equipmentsForSale.filter(e => e.modelName && e.price > 0).map(e => ({
              description: `Продажа: ${e.modelName}`,
              amount: e.price,
            })),
            ...additionalWishes.filter(w => w.description && w.amount > 0).map(w => ({
              description: w.description,
              amount: w.amount,
            })),
          ],
          clientName,
          clientAddress,
        }),
      });
      if (!res.ok) throw new Error("PDF error");
      const blob = await res.blob();
      await downloadBlob(blob, `smeta_drugie_raboty_${contractNumber}.pdf`);
    } catch (e) {
      alert("Ошибка PDF: " + (e as Error).message);
    }
  };

  const handleExportDocx = async () => {
    try {
      const res = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: `Другие виды работ`,
          equipmentPrice: 0,
          traceLength: 4,
          complexity: "standard",
          complexityHours: 0,
          hasCableChannel: false,
          otherExpenses: [
            ...customWorks.map(w => ({
              description: `${w.name} ${w.quantity}м (работа ${w.workPricePerMeter}₽/м + материал ${w.materialPricePerMeter}₽/м)`,
              amount: (w.quantity * w.workPricePerMeter) + (w.quantity * w.materialPricePerMeter),
            })),
          ],
        }),
      });
      if (!res.ok) throw new Error("DOCX error");
      const blob = await res.blob();
      await downloadBlob(blob, `smeta_drugie_raboty_${contractNumber}.docx`);
    } catch (e) {
      alert("Ошибка DOCX: " + (e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              🔨 Другие виды работ
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ручной расчет: штробление, укладка трассы, любые работы с ценой за метр и материалами. Смета на работу и материал раздельно.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportExcel} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button onClick={handleExportPdf} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              PDF
            </button>
            <button onClick={handleExportDocx} className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              DOCX
            </button>
            <button onClick={handlePrint} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              Печать
            </button>
          </div>
        </div>

        {/* Client and contract info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
          <input type="text" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="№ договора (67)" className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ФИО Заказчика" className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
          <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Адрес объекта" className="md:col-span-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
        </div>
      </div>

      {/* Custom Works */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900">🔧 Основные работы (штробление, укладка трассы и т.д.)</h3>
          <button onClick={addCustomWork} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить работу
          </button>
        </div>

        <div className="space-y-4">
          {customWorks.map((work) => {
            const workTotal = work.quantity * work.workPricePerMeter;
            const materialTotal = work.quantity * work.materialPricePerMeter;
            const total = workTotal + materialTotal;

            return (
              <div key={work.id} className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={work.name}
                    onChange={(e) => updateCustomWork(work.id, "name", e.target.value)}
                    placeholder="Например: Штробление стены"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button onClick={() => removeCustomWork(work.id)} className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Количество (м)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={work.quantity || ""}
                      onChange={(e) => updateCustomWork(work.id, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Цена за метр работы (₽)</label>
                    <input
                      type="number"
                      min={0}
                      value={work.workPricePerMeter || ""}
                      onChange={(e) => updateCustomWork(work.id, "workPricePerMeter", parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold"
                      placeholder="1100"
                    />
                    <div className="text-2xs text-slate-500 mt-1">Работа: {formatRuble(workTotal)}</div>
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Цена за метр материала (₽)</label>
                    <input
                      type="number"
                      min={0}
                      value={work.materialPricePerMeter || ""}
                      onChange={(e) => updateCustomWork(work.id, "materialPricePerMeter", parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold"
                      placeholder="1100"
                    />
                    <div className="text-2xs text-amber-700 mt-1">Материал: {formatRuble(materialTotal)}</div>
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Итого</label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold font-mono text-blue-900">
                      {formatRuble(total)}
                    </div>
                    <div className="text-2xs text-slate-500 mt-1">{work.quantity}м × ({work.workPricePerMeter}+{work.materialPricePerMeter})</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {customWorks.length === 0 && (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
            <div className="text-sm text-slate-500">Нет работ. Нажмите "Добавить работу" чтобы добавить штробление, укладку трассы и т.д.</div>
            <div className="text-2xs text-slate-400 mt-1">Пример: Штробление стены 6м × 1100₽ + Укладка трассы 6м × 1100₽</div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800">Итого по основным работам:</span>
          <div className="text-right">
            <div className="text-xs text-slate-600">Работа: {formatRuble(totalWork)} + Материал: {formatRuble(totalMaterial)}</div>
            <div className="text-base font-black text-blue-900">{formatRuble(totalCustomWorks)}</div>
          </div>
        </div>
      </div>

      {/* Equipment for sale without mounting */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900">❄️ Продажа кондиционеров (без монтажа - штробление и укладка уже учтены как работа)</h3>
          <button onClick={addEquipmentForSale} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить кондиционер
          </button>
        </div>

        {equipmentsForSale.length > 0 ? (
          <div className="space-y-3">
            {equipmentsForSale.map((eq) => (
              <div key={eq.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={eq.url || ""}
                      onChange={(e) => updateEquipmentForSale(eq.id, "url", e.target.value)}
                      placeholder="Ссылка на кондиционер для парсинга"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <button onClick={() => parseEquipmentLink(eq.id)} disabled={isParsing === eq.id} className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {isParsing === eq.id ? "..." : "Парсить"}
                  </button>
                  <button onClick={() => removeEquipmentForSale(eq.id)} className="p-2.5 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input type="text" value={eq.modelName} onChange={(e) => updateEquipmentForSale(eq.id, "modelName", e.target.value)} placeholder="Модель кондиционера" className="md:col-span-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
                  <input type="number" value={eq.price || ""} onChange={(e) => updateEquipmentForSale(eq.id, "price", parseInt(e.target.value, 10) || 0)} placeholder="Цена ₽" className="px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold font-mono" />
                </div>
              </div>
            ))}
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
              <span className="text-xs text-slate-600">Итого продажа кондиционеров:</span>
              <span className="ml-2 font-black text-emerald-900">{formatRuble(totalEquipment)}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
            Нет кондиционеров для продажи. Нажмите "Добавить кондиционер" если нужно продать оборудование без учета монтажа (монтаж уже учтен в штроблении/укладке).
          </div>
        )}
      </div>

      {/* Additional wishes */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900">📝 Дополнительные пожелания (вручную с ценой)</h3>
          <button onClick={addAdditionalWish} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {additionalWishes.length > 0 ? (
          <div className="space-y-2">
            {additionalWishes.map((wish) => (
              <div key={wish.id} className="flex gap-2 p-3 bg-purple-50/50 border border-purple-200 rounded-xl">
                <input type="text" value={wish.description} onChange={(e) => updateAdditionalWish(wish.id, "description", e.target.value)} placeholder="Например: Установка доп. кронштейнов, Покраска короба" className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
                <input type="number" value={wish.amount || ""} onChange={(e) => updateAdditionalWish(wish.id, "amount", parseInt(e.target.value, 10) || 0)} placeholder="Сумма ₽" className="w-28 px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-bold font-mono" />
                <button onClick={() => removeAdditionalWish(wish.id)} className="p-2 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="text-right p-2 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-xs text-slate-600">Итого доп. пожелания:</span>
              <span className="ml-2 font-black text-purple-900">{formatRuble(totalAdditional)}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
            Нет дополнительных пожеланий.
          </div>
        )}
      </div>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-blue-200">Итоговая смета по другим видам работ:</div>
            <div className="text-2xs text-slate-400 mt-1">
              Работа: {formatRuble(totalWork)} + Материал: {formatRuble(totalMaterial)} + Оборудование: {formatRuble(totalEquipment)} + Доп: {formatRuble(totalAdditional)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-amber-300">{formatRuble(grandTotal)}</div>
            <div className="text-2xs text-blue-200">К оплате</div>
          </div>
        </div>
      </div>

      {/* Professional contract text preview */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 text-sm leading-relaxed" id="printable-other-works">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-lg font-bold uppercase">ДОГОВОР НА ВЫПОЛНЕНИЕ РАБОТ №{contractNumber}</h1>
          <p className="text-xs text-slate-500 mt-1">Другие виды работ • {new Date().toLocaleDateString("ru-RU")} • Вектор Комфорта</p>
          {clientName && <p className="text-sm font-bold mt-2">Заказчик: {clientName} • {clientAddress}</p>}
        </div>

        <div className="space-y-4 text-xs leading-relaxed">
          <p><strong>Предмет договора:</strong> Исполнитель обязуется выполнить следующие виды работ:</p>
          
          {customWorks.map((work, idx) => {
            const workTotal = work.quantity * work.workPricePerMeter;
            const materialTotal = work.quantity * work.materialPricePerMeter;
            const total = workTotal + materialTotal;
            return (
              <div key={work.id} className="ml-4 p-2 bg-slate-50 rounded border">
                <p className="font-bold">{idx + 1}. {work.name || "Работа"} — {work.quantity} м</p>
                <p className="ml-4">• Штробление стены с укладкой фреонопровода {work.quantity} метров: цена за материал с работой {formatRuble(total)} (работа {formatRuble(workTotal)} + материал {formatRuble(materialTotal)})</p>
                <p className="ml-4">• Цена за {work.name.toLowerCase()}: {work.quantity} м × {formatRuble(work.workPricePerMeter)}/м = {formatRuble(workTotal)} материал {formatRuble(work.materialPricePerMeter)}/м = {formatRuble(materialTotal)}</p>
              </div>
            );
          })}

          {equipmentsForSale.length > 0 && (
            <div className="mt-3">
              <p className="font-bold">Продажа оборудования (без монтажа, монтаж учтен в штроблении/укладке):</p>
              <ul className="list-disc ml-6">
                {equipmentsForSale.map((eq, i) => (
                  <li key={eq.id}>{i + 1}. {eq.modelName || "Кондиционер"} — {formatRuble(eq.price)}</li>
                ))}
              </ul>
            </div>
          )}

          {additionalWishes.length > 0 && (
            <div className="mt-3">
              <p className="font-bold">Дополнительные пожелания:</p>
              <ul className="list-disc ml-6">
                {additionalWishes.map((w) => (
                  <li key={w.id}>{w.description}: {formatRuble(w.amount)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-bold">Итого к оплате: {formatRuble(grandTotal)}</p>
            <p className="text-2xs text-slate-600">В т.ч. работа: {formatRuble(totalWork)}, материал: {formatRuble(totalMaterial)}, оборудование: {formatRuble(totalEquipment)}, доп. пожелания: {formatRuble(totalAdditional)}</p>
          </div>

          <div className="mt-6 border-t-2 border-slate-800 pt-4 text-xs">
            <p className="font-bold">Исполнитель: ИП Сергеева М.В., ИНН 381113658680, ОГРНИП 325385000065256, Банк Точка р/с 40802810720000687178</p>
            <p className="mt-2">Исполнитель работ:</p>
            <p>Чебанов Дмитрий Юрьевич т. +7(914) 914-66-06</p>
            <p>Кокорин Антон Олегович т. +7 9086401166</p>
            <p className="mt-4">Заказчик: {clientName || "__________________"} / __________________</p>
          </div>
        </div>
      </div>
    </div>
  );
};
