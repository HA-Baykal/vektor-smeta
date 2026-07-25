"use client";

import React, { useState } from "react";
import { EstimateInputs, EstimateCalculationResult, formatRuble } from "@/lib/calculator";
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Save,
  Check,
  Share2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

interface EstimateTableProps {
  inputs: EstimateInputs;
  calculation: EstimateCalculationResult;
  onOpenPdf: () => void;
  onSaveToDatabase: () => Promise<void>;
  isSaving?: boolean;
}

export const EstimateTable: React.FC<EstimateTableProps> = ({
  inputs,
  calculation,
  onOpenPdf,
  onSaveToDatabase,
  isSaving,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDownload = async (type: "excel" | "docx" | "pdf") => {
    const endpoints: Record<string, string> = {
      excel: "/api/export-excel",
      docx: "/api/export-docx",
      pdf: "/api/export-pdf",
    };
    const extensions: Record<string, string> = {
      excel: "xlsx",
      docx: "docx",
      pdf: "pdf",
    };

    try {
      if (type === "excel") setIsExportingExcel(true);
      if (type === "docx") setIsExportingDocx(true);
      if (type === "pdf") setIsExportingPdf(true);

      // For PDF with Russian support, use client-side canvas method that preserves Cyrillic
      if (type === "pdf") {
        const { exportElementToPdf } = await import("@/lib/export-docx-pdf");
        // Try to find printable element, if not in modal, use table element
        const elementId = document.getElementById("printable-estimate") ? "printable-estimate" : "";
        if (elementId) {
          const pdf = await exportElementToPdf(elementId, `smeta-${inputs.modelName || "aircon"}`);
          pdf.save(`smeta-${(inputs.modelName || "aircon").toLowerCase().replace(/[^a-zа-я0-9]/gi, "_").slice(0, 25)}.pdf`);
          return;
        }
        // Fallback to server API if element not found
      }

      const res = await fetch(endpoints[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error(`Ошибка формирования ${type.toUpperCase()}`);
      const blob = await res.blob();
      
      // For Telegram Mini App, try to handle download differently
      const tg = (window as any).Telegram?.WebApp;
      const isInTelegram = !!tg;
      
      if (isInTelegram && type !== "excel") {
        // In Telegram, try to open blob URL via openLink for better compatibility
        const url = window.URL.createObjectURL(blob);
        try {
          if (tg.openLink) {
            // For Telegram, we need to create a temporary URL that can be downloaded
            // Use direct anchor click with download attribute - works better in WebView
            const a = document.createElement("a");
            a.href = url;
            a.download = `smeta-${(inputs.modelName || "aircon").toLowerCase().replace(/[^a-zа-я0-9]/gi, "_").slice(0, 25)}.${extensions[type]}`;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 1000);
          } else {
            throw new Error("Telegram openLink not available");
          }
        } catch {
          // Fallback to regular download
          const a = document.createElement("a");
          a.href = url;
          a.download = `smeta-${(inputs.modelName || "aircon").toLowerCase().replace(/[^a-zа-я0-9]/gi, "_").slice(0, 25)}.${extensions[type]}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `smeta-${(inputs.modelName || "aircon")
          .toLowerCase()
          .replace(/[^a-zа-я0-9]/gi, "_")
          .slice(0, 25)}.${extensions[type]}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(`Не удалось скачать ${type.toUpperCase()} файл: ` + (err as Error).message);
    } finally {
      setIsExportingExcel(false);
      setIsExportingDocx(false);
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExcel = () => handleDownload("excel");
  const handleDownloadDocx = () => handleDownload("docx");
  const handleDownloadPdf = () => handleDownload("pdf");

  const handleCopyText = () => {
    let msg = `❄️ *СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА*\n`;
    msg += `Оборудование: ${inputs.modelName || "Сплит-система"}\n`;
    msg += `---------------------------------\n`;
    calculation.items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name}: ${it.quantity} ${it.unit} × ${formatRuble(it.pricePerUnit)} = ${formatRuble(it.total)}\n`;
    });
    if (calculation.discountAmount > 0) {
      msg += `Скидка: -${formatRuble(calculation.discountAmount)}\n`;
    }
    if (inputs.vatType === "vat6" && calculation.vatAmount > 0) {
      msg += `С НДС 6%: +${formatRuble(calculation.vatAmount)}\n`;
    }
    msg += `---------------------------------\n`;
    msg += `💰 *ИТОГО К ОПЛАТЕ: ${formatRuble(calculation.finalTotal)}*\n`;
    if (inputs.clientAddress) msg += `📍 Адрес: ${inputs.clientAddress}\n`;
    msg += `📞 Гарантия на установку: 12 месяцев.`;

    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSave = async () => {
    await onSaveToDatabase();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
      {/* Table Header & Title */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Структура сметы
            </span>
            <span className="text-xs text-slate-400">
              {inputs.installationDate || "Текущая дата"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Смета на монтаж: {inputs.modelName || "Сплит-система"}
          </h2>
        </div>

        {/* Big Total Badge */}
        <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 text-right flex flex-col items-end">
          <div className="text-2xs uppercase tracking-wider text-blue-200 font-semibold">
            Итоговая стоимость
          </div>
          <div className="text-2xl font-black text-amber-300 tracking-tight font-mono">
            {formatRuble(calculation.finalTotal)}
          </div>
        </div>
      </div>

      {/* Action Toolbar - Professional export options */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <button
          onClick={handleDownloadExcel}
          disabled={isExportingExcel}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isExportingExcel ? "Excel..." : "Excel (.xlsx)"}
        </button>

        <button
          onClick={handleDownloadDocx}
          disabled={isExportingDocx}
          className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isExportingDocx ? "DOCX..." : "Word (.docx)"}
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={isExportingPdf}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          {isExportingPdf ? "PDF..." : "PDF (.pdf)"}
        </button>

        <button
          onClick={onOpenPdf}
          className="px-3.5 py-2 bg-slate-600 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Предпросмотр печати
        </button>

        <button
          onClick={handleCopyText}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Скопировано в буфер!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-blue-300" />
              Скопировать для Telegram / WhatsApp
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              Сохранено в историю!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? "Сохранение..." : "Сохранить в базу"}
            </>
          )}
        </button>
      </div>

      {/* Main Table Layout */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
              <th className="py-3.5 px-4 text-center w-12 text-slate-500">№</th>
              <th className="py-3.5 px-4">Наименование</th>
              <th className="py-3.5 px-4 text-center w-20">Кол-во</th>
              <th className="py-3.5 px-4 text-center w-28">Ед.</th>
              <th className="py-3.5 px-4 text-right w-36">Цена за ед.</th>
              <th className="py-3.5 px-4 text-right w-40">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {calculation.items.map((row, index) => (
              <tr
                key={index}
                className={`transition hover:bg-blue-50/40 ${
                  index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                }`}
              >
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                  {index + 1}
                </td>
                <td className="py-3 px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {row.name}
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded text-2xs bg-blue-100 text-blue-700 font-semibold">
                        Оборудование
                      </span>
                    )}
                    {index === 1 && (
                      <span className="px-2 py-0.5 rounded text-2xs bg-emerald-100 text-emerald-700 font-semibold">
                        Базовый монтаж
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-slate-700">
                  {row.quantity}
                </td>
                <td className="py-3 px-4 text-center text-slate-500 text-xs">
                  {row.unit}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">
                  {formatRuble(row.pricePerUnit)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  {formatRuble(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Discount subrow */}
            {calculation.discountAmount > 0 && (
              <tr className="bg-rose-50/80 border-t border-rose-200 text-rose-800 text-xs">
                <td colSpan={4} className="py-2.5 px-4 text-right font-semibold">
                  Скидка клиенту ({inputs.discountType === "percent" ? `${inputs.discountValue}%` : "фикс."}):
                </td>
                <td colSpan={2} className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                  -{formatRuble(calculation.discountAmount)}
                </td>
              </tr>
            )}

            {/* VAT breakdown row */}
            {inputs.vatType && inputs.vatType !== "none" && calculation.vatAmount > 0 && (
              <tr className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs">
                <td colSpan={4} className="py-2 px-4 text-right font-semibold text-slate-700">
                  {inputs.vatType === "vat6" ? "С НДС 6%:" : "НДС:"}
                </td>
                <td colSpan={2} className="py-2 px-4 text-right font-mono font-semibold text-slate-800">
                  +{formatRuble(calculation.vatAmount)}
                </td>
              </tr>
            )}

            {/* TOTAL HIGHLIGHTED ROW */}
            <tr className="bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 border-t-2 border-slate-900 font-bold text-slate-950">
              <td colSpan={4} className="py-4 px-4 text-right text-base uppercase tracking-wider font-extrabold text-blue-950">
                ИТОГО:
              </td>
              <td colSpan={2} className="py-4 px-4 text-right font-mono text-2xl font-black text-blue-900">
                {formatRuble(calculation.finalTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Info Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            Трасса: <strong className="text-slate-900">{inputs.traceLength || 4} м</strong>
          </div>
          <div>
            Сложность:{" "}
            <strong className="text-slate-900">
              {inputs.complexity === "complex"
                ? `Сложный (+${inputs.complexityHours || 0} ч.)`
                : "Стандартный"}
            </strong>
          </div>
          <div>
            Кабель-канал:{" "}
            <strong className="text-slate-900">
              {inputs.hasCableChannel && calculation.cableChannelMeters > 0
                ? `Да (${calculation.cableChannelMeters} м, ${calculation.cableChannelPacks} упак.)`
                : "Нет"}
            </strong>
          </div>
        </div>

        <div className="text-slate-400 text-2xs">
          Расчёт выполнен в строгом соответствии с формулой калькуляции
        </div>
      </div>
    </div>
  );
};
