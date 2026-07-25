"use client";

import React, { useState, useEffect } from "react";
import { Estimate } from "@/db/schema";
import { EstimateInputs, formatRuble } from "@/lib/calculator";
import {
  History,
  Search,
  Copy,
  Trash2,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  Check,
  Calendar,
  Layers,
  Building,
} from "lucide-react";

interface EstimateHistoryProps {
  onLoadEstimate: (inputs: EstimateInputs) => void;
}

export const EstimateHistory: React.FC<EstimateHistoryProps> = ({ onLoadEstimate }) => {
  const [items, setItems] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/estimates");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту смету из истории?")) return;
    try {
      await fetch(`/api/estimates/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      alert("Ошибка удаления: " + (e as Error).message);
    }
  };

  const handleDuplicate = (item: Estimate) => {
    const inputs: EstimateInputs = {
      modelName: item.modelName,
      equipmentPrice: item.equipmentPrice,
      equipmentBrand: item.equipmentBrand || "",
      equipmentType: item.equipmentType || "Сплит-система",
      equipmentUrl: item.equipmentUrl || "",
      traceLength: item.traceLength,
      complexity: item.complexity as any,
      complexityHours: item.complexityHours,
      hasCableChannel: item.hasCableChannel,
      clientName: item.clientName || "",
      clientPhone: item.clientPhone || "",
      clientAddress: item.clientAddress || "",
      installationDate: item.installationDate || "",
      notes: item.notes || "",
      discountType: (item.discountType as any) || "none",
      discountValue: item.discountValue || 0,
      vatType: (item.vatType as any) || "none",
    };
    onLoadEstimate(inputs);
  };

  const handleDownloadExcel = async (item: Estimate) => {
    const inputs: EstimateInputs = {
      modelName: item.modelName,
      equipmentPrice: item.equipmentPrice,
      equipmentBrand: item.equipmentBrand || "",
      equipmentType: item.equipmentType || "Сплит-система",
      equipmentUrl: item.equipmentUrl || "",
      traceLength: item.traceLength,
      complexity: item.complexity as any,
      complexityHours: item.complexityHours,
      hasCableChannel: item.hasCableChannel,
      clientName: item.clientName || "",
      clientPhone: item.clientPhone || "",
      clientAddress: item.clientAddress || "",
      installationDate: item.installationDate || "",
      notes: item.notes || "",
      discountType: (item.discountType as any) || "none",
      discountValue: item.discountValue || 0,
      vatType: (item.vatType as any) || "none",
    };

    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smeta-${item.modelName.replace(/[^a-zа-я0-9]/gi, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    return (
      it.modelName.toLowerCase().includes(q) ||
      (it.clientName && it.clientName.toLowerCase().includes(q)) ||
      (it.clientAddress && it.clientAddress.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            История сохранённых смет (PostgreSQL)
          </h3>
          <p className="text-xs text-slate-500">
            Сохранённые расчёты смет с возможностью повторного открытия, редактирования и выгрузки
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по модели, клиенту или адресу..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Загрузка смет из базы данных...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-semibold text-slate-700 text-sm">История пока пуста</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Рассчитайте смету в конструкторе или в чате с ИИ-Ассистентом и нажмите «Сохранить в базу».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      № {item.id} • {item.equipmentType || "Сплит-система"}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
                      {item.modelName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-blue-900 font-mono">
                      {formatRuble(item.totalAmount)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Трасса:</span>{" "}
                    <strong>{item.traceLength} м</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Монтаж:</span>{" "}
                    <strong>
                      {item.complexity === "complex"
                        ? `Сложный (+${item.complexityHours} ч)`
                        : "Стандарт"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Кабель-канал:</span>{" "}
                    <strong>{item.hasCableChannel ? "Да" : "Нет"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Клиент:</span>{" "}
                    <strong>{item.clientName || "Не указан"}</strong>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDuplicate(item)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Открыть / Изменить
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadExcel(item)}
                    title="Скачать Excel"
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-300 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Удалить смету"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
