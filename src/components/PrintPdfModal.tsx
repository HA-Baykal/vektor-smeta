"use client";

import React from "react";
import { EstimateInputs, EstimateCalculationResult, formatRuble } from "@/lib/calculator";
import { Printer, Download, X, CheckCircle2, ShieldCheck } from "lucide-react";

interface PrintPdfModalProps {
  inputs: EstimateInputs;
  calculation: EstimateCalculationResult;
  isOpen: boolean;
  onClose: () => void;
  onDownloadExcel: () => void;
}

export const PrintPdfModal: React.FC<PrintPdfModalProps> = ({
  inputs,
  calculation,
  isOpen,
  onClose,
  onDownloadExcel,
}) => {
  if (!isOpen) return null;

  const currentDate =
    inputs.installationDate ||
    new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
              PDF
            </div>
            <div>
              <h3 className="font-semibold text-base">Печатная форма / PDF-смета</h3>
              <p className="text-xs text-slate-400">
                Готова для отправки клиенту или печати на принтере
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Распечатать / PDF
            </button>
            <button
              onClick={onDownloadExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              Excel (.xlsx)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Estimate Body */}
        <div className="overflow-y-auto p-8 bg-white" id="printable-estimate">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 font-semibold text-xs rounded tracking-wider uppercase mb-2">
                  Официальная коммерческая смета
                </span>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА
                </h1>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  Объект: {inputs.modelName || "Сплит-система"}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-slate-800 text-base">ООО «Климат Профи»</div>
                <div className="text-slate-500 text-xs">Монтаж и сервис систем кондиционирования</div>
                <div className="text-slate-700 mt-2 font-medium">Дата: {currentDate}</div>
              </div>
            </div>
          </div>

          {/* Client & Specs Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                Информация о клиенте
              </div>
              <div className="font-semibold text-slate-900">
                {inputs.clientName || "Частное лицо"}
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                Тел: {inputs.clientPhone || "Не указан"}
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                Адрес: {inputs.clientAddress || "По согласованию"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                Параметры монтажа
              </div>
              <div className="text-slate-700 text-xs flex justify-between py-0.5">
                <span>Длина фреоновой трассы:</span>
                <span className="font-semibold text-slate-900">{inputs.traceLength || 4} м</span>
              </div>
              <div className="text-slate-700 text-xs flex justify-between py-0.5">
                <span>Сложность монтажа:</span>
                <span className="font-semibold text-slate-900">
                  {inputs.complexity === "complex"
                    ? `Сложный (+${inputs.complexityHours || 0} ч.)`
                    : "Стандартный"}
                </span>
              </div>
              <div className="text-slate-700 text-xs flex justify-between py-0.5">
                <span>Кабель-канал:</span>
                <span className="font-semibold text-slate-900">
                  {inputs.hasCableChannel
                    ? `Да (${calculation.cableChannelPacks} упак. по 2 м = ${calculation.cableChannelPacks * 2} м)`
                    : "Открытая трасса"}
                </span>
              </div>
            </div>
          </div>

          {/* Estimate Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  <th className="py-2.5 px-3 w-10 text-center">№</th>
                  <th className="py-2.5 px-3">Наименование</th>
                  <th className="py-2.5 px-3 text-center w-16">Кол-во</th>
                  <th className="py-2.5 px-3 text-center w-24">Ед.</th>
                  <th className="py-2.5 px-3 text-right w-28">Цена за ед.</th>
                  <th className="py-2.5 px-3 text-right w-32">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculation.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatRuble(item.pricePerUnit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatRuble(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {calculation.discountAmount > 0 && (
                  <tr className="bg-rose-50 border-t border-slate-300 text-rose-800">
                    <td colSpan={5} className="py-2 px-3 text-right font-semibold">
                      Скидка клиенту:
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      -{formatRuble(calculation.discountAmount)}
                    </td>
                  </tr>
                )}
                {calculation.vatAmount > 0 && inputs.vatType !== "none" && (
                  <tr className="bg-slate-50 border-t border-slate-300 text-slate-800">
                    <td colSpan={5} className="py-2 px-3 text-right font-semibold">
                      {inputs.vatType === "vat6" ? "С НДС 6%:" : "НДС:"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      +{formatRuble(calculation.vatAmount)}
                    </td>
                  </tr>
                )}
                <tr className="bg-amber-100 border-t-2 border-slate-800 text-slate-900">
                  <td colSpan={5} className="py-3 px-3 text-right font-bold text-sm">
                    ИТОГО К ОПЛАТЕ:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-base text-blue-900">
                    {formatRuble(calculation.finalTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Guarantees & Signature Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Гарантии и условия
              </div>
              <p>
                Гарантия на монтажные работы — 12 месяцев. Используются медные толстостенные трубы ГОСТ,
                качественная теплоизоляция и вакуумирование системы двухступенчатым насосом.
              </p>
            </div>
            <div className="flex flex-col justify-end items-end text-right">
              <div className="text-slate-800 font-medium">Монтажная бригада / Сметчик</div>
              <div className="mt-6 border-b border-slate-400 w-48 text-center text-2xs text-slate-400 pb-1">
                Подпись / М.П.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
