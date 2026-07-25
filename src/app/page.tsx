"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { EstimateBuilder } from "@/components/EstimateBuilder";
import { EstimateTable } from "@/components/EstimateTable";
import { ChatAssistant } from "@/components/ChatAssistant";
import { EstimateHistory } from "@/components/EstimateHistory";
import { ContractGenerator } from "@/components/ContractGenerator";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminPanel } from "@/components/AdminPanel";
import { PrintPdfModal } from "@/components/PrintPdfModal";
import { TariffRulesModal } from "@/components/TariffRulesModal";
import {
  EstimateInputs,
  calculateEstimate,
  SAMPLE_AIR_CONDITIONERS,
} from "@/lib/calculator";
import {
  Calculator,
  MessageSquare,
  History,
  FileText,
  Settings,
} from "lucide-react";

function MainApp() {
  const [activeTab, setActiveTab] = useState<
    "builder" | "contract" | "chat" | "history" | "admin"
  >("builder");
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isTariffsOpen, setIsTariffsOpen] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const [inputs, setInputs] = useState<EstimateInputs>({
    modelName: SAMPLE_AIR_CONDITIONERS[0].model,
    equipmentPrice: SAMPLE_AIR_CONDITIONERS[0].price,
    equipmentBrand: SAMPLE_AIR_CONDITIONERS[0].brand,
    equipmentType: SAMPLE_AIR_CONDITIONERS[0].type,
    equipmentUrl: SAMPLE_AIR_CONDITIONERS[0].url,
    traceLength: 4,
    complexity: "standard",
    complexityHours: 0,
    hasCableChannel: false,
    clientName: "Иван Сергеев",
    clientPhone: "+7 (999) 450-20-10",
    clientAddress: "г. Москва, ул. Ленина, д. 42",
    installationDate: new Date().toISOString().split("T")[0],
    discountType: "none",
    discountValue: 0,
    vatType: "none",
  });

  const calculation = calculateEstimate(inputs);

  const handleResetNew = () => {
    setInputs({
      modelName: "Ballu Eco Pro BSPI-09HN1/EP/24Y",
      equipmentPrice: 34500,
      equipmentBrand: "Ballu",
      equipmentType: "Сплит-система",
      equipmentUrl: "",
      traceLength: 4,
      complexity: "standard",
      complexityHours: 0,
      hasCableChannel: false,
      clientName: "",
      clientPhone: "",
      clientAddress: "",
      installationDate: new Date().toISOString().split("T")[0],
      discountType: "none",
      discountValue: 0,
      vatType: "none",
    });
    setActiveTab("builder");
  };

  const handleSaveToDatabase = async () => {
    try {
      setIsSavingDb(true);
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    } catch (err) {
      alert("Ошибка сохранения: " + (err as Error).message);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error("Ошибка генерации Excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smeta-${(inputs.modelName || "aircon")
        .toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, "_")
        .slice(0, 25)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Не удалось скачать Excel: " + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      <Navbar onOpenTariffs={() => setIsTariffsOpen(true)} onResetNew={handleResetNew} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-300/80 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("builder")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "builder"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Конструктор и таблица сметы
          </button>

          <button
            onClick={() => setActiveTab("contract")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "contract"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            Договор на оказание услуг
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "chat"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            ИИ-Ассистент «Сметчик» (Чат)
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            История смет (БД)
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "admin"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Админ / Доступ / GitHub / Бот
          </button>
        </div>

        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-6">
              <EstimateBuilder inputs={inputs} onChange={setInputs} />
            </div>
            <div className="lg:col-span-6 space-y-6 sticky top-24">
              <EstimateTable
                inputs={inputs}
                calculation={calculation}
                onOpenPdf={() => setIsPdfOpen(true)}
                onSaveToDatabase={handleSaveToDatabase}
                isSaving={isSavingDb}
              />
            </div>
          </div>
        )}

        {activeTab === "contract" && (
          <ContractGenerator
            inputs={inputs}
            calculation={calculation}
            onChangeInputs={setInputs}
          />
        )}

        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <ChatAssistant
                currentInputs={inputs}
                onApplyInputs={(newInputs) => {
                  setInputs(newInputs);
                  setActiveTab("builder");
                }}
              />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <EstimateTable
                inputs={inputs}
                calculation={calculation}
                onOpenPdf={() => setIsPdfOpen(true)}
                onSaveToDatabase={handleSaveToDatabase}
                isSaving={isSavingDb}
              />
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <EstimateHistory
            onLoadEstimate={(loaded) => {
              setInputs(loaded);
              setActiveTab("builder");
            }}
          />
        )}

        {activeTab === "admin" && <AdminPanel />}
      </main>

      <PrintPdfModal
        isOpen={isPdfOpen}
        inputs={inputs}
        calculation={calculation}
        onClose={() => setIsPdfOpen(false)}
        onDownloadExcel={handleDownloadExcel}
      />

      <TariffRulesModal isOpen={isTariffsOpen} onClose={() => setIsTariffsOpen(false)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <MainApp />
    </AuthGuard>
  );
}
