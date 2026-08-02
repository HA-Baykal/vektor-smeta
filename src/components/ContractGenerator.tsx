"use client";

import React, { useState, useEffect } from "react";
import { EstimateInputs, EstimateCalculationResult, formatRuble } from "@/lib/calculator";
import { formatRublesInWords } from "@/lib/numberToWords";
import {
  FileText,
  Printer,
  Copy,
  Check,
  CreditCard,
  Wrench,
  AlertCircle,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { printElementById, openPrintableInNewTab } from "@/lib/print";

interface ContractGeneratorProps {
  inputs: EstimateInputs;
  calculation: EstimateCalculationResult;
  onChangeInputs: (updated: EstimateInputs) => void;
  onSaveToDatabase?: () => Promise<void>;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  inputs,
  calculation,
  onChangeInputs,
  onSaveToDatabase,
}) => {
  // Contract meta - editable, customer fields empty by default as requested
  const [contractNumber, setContractNumber] = useState("67");
  const [contractDate, setContractDate] = useState("08 июля 2026 г.");
  const [contractCity, setContractCity] = useState("");

  // Customer - empty by default (user requested not to pre-fill)
  const [customerName, setCustomerName] = useState("");
  const [customerPassportSeries, setCustomerPassportSeries] = useState("");
  const [customerPassportNumber, setCustomerPassportNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerApartment, setCustomerApartment] = useState("");

  // Manual cost entry for contract - as requested
  const [equipmentCostManual, setEquipmentCostManual] = useState<number>(inputs.equipmentPrice || 0);
  const [consumablesCostManual, setConsumablesCostManual] = useState<number>(0);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(0);
  const [finalPaymentAmount, setFinalPaymentAmount] = useState<number>(0);
  const [totalContractAmount, setTotalContractAmount] = useState<number>(calculation.finalTotal || 0);
  const [maintenancePrepaymentPercent, setMaintenancePrepaymentPercent] = useState<number>(100);

  // Payment method: card (no tax) or bank (6% auto)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">(
    inputs.vatType === "vat6" ? "bank" : "card"
  );

  const [copied, setCopied] = useState(false);

  // Sync equipment cost from calculation (supports multiple conditioners)
  useEffect(() => {
    setEquipmentCostManual(calculation.equipmentTotal || inputs.equipmentPrice || 0);
  }, [calculation.equipmentTotal, inputs.equipmentPrice, inputs.equipments]);

  // Sync total from calculation
  useEffect(() => {
    setTotalContractAmount(calculation.finalTotal || 0);
  }, [calculation.finalTotal]);

  // Auto-calculate prepayment and final - different for maintenance vs sale
  useEffect(() => {
    if (inputs.contractType === "maintenance") {
      const maintTotal = calculation.maintenanceTotal || 0;
      const prepay = Math.round((maintTotal * (maintenancePrepaymentPercent || 0)) / 100);
      setPrepaymentAmount(prepay);
      setFinalPaymentAmount(Math.max(0, (totalContractAmount || 0) - prepay));
    } else {
      const prepayment = (equipmentCostManual || 0) + (consumablesCostManual || 0);
      setPrepaymentAmount(prepayment);
      const final = Math.max(0, (totalContractAmount || 0) - prepayment);
      setFinalPaymentAmount(final);
    }
  }, [equipmentCostManual, consumablesCostManual, totalContractAmount, inputs.contractType, calculation.maintenanceTotal, maintenancePrepaymentPercent]);

  // When consumables change, update inputs for history? Not necessary

  const handlePaymentChange = (method: "card" | "bank") => {
    setPaymentMethod(method);
    if (method === "bank") {
      onChangeInputs({ ...inputs, vatType: "vat6" });
    } else {
      onChangeInputs({ ...inputs, vatType: "none" });
    }
  };

  const autoSave = async () => {
    try {
      if (onSaveToDatabase) {
        await onSaveToDatabase();
      } else {
        // Fallback direct save
        await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputs),
        });
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  };

  const handlePrintContract = async () => {
    await autoSave();
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) {
      // On mobile, direct PDF download is more reliable than print
      await handleExportContract("pdf");
    } else {
      printElementById("printable-contract", `Договор_${contractNumber}_${customerName || "заказчик"}`);
    }
  };

  const handleOpenContractInNewTab = async () => {
    await autoSave();
    openPrintableInNewTab("printable-contract", `Договор_${contractNumber}_${customerName || "заказчик"}`);
  };

  const handleCopyContract = () => {
    const contractText = document.getElementById("printable-contract")?.innerText || "";
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportContract = async (type: "docx" | "pdf") => {
    try {
      // Auto-save to DB before export
      await autoSave();

      // For PDF, try client-side canvas first (better for mobile Cyrillic), fallback to server
      if (type === "pdf") {
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        if (!isMobile) {
          try {
            const { exportElementToPdf } = await import("@/lib/export-docx-pdf");
            const pdf = await exportElementToPdf("printable-contract", `dogovor_${contractNumber || "67"}`);
            pdf.save(`dogovor_${contractNumber || "67"}.pdf`);
            return;
          } catch (e) {
            console.log("Canvas PDF failed, fallback to server", e);
          }
        }
      }

      const endpoint = type === "docx" ? "/api/export-docx" : "/api/export-pdf";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contract",
          inputs,
          contractData: {
            contractNumber,
            contractDate,
            customerName,
            customerAddress: `${customerAddress} ${customerApartment}`.trim(),
            equipmentCost: equipmentCostManual,
            consumablesCost: consumablesCostManual,
            prepayment: prepaymentAmount,
            finalPayment: finalPaymentAmount,
            total: totalContractAmount,
          },
        }),
      });
      if (!res.ok) throw new Error(`Ошибка ${type}`);
      const blob = await res.blob();
      
      const { downloadBlob } = await import("@/lib/mobile-download");
      await downloadBlob(blob, `dogovor_${contractNumber || "67"}.${type}`);
    } catch (e) {
      alert(`Не удалось скачать ${type.toUpperCase()}: ` + (e as Error).message);
    }
  };

  const totalInWords = formatRublesInWords(totalContractAmount || 0);
  const prepaymentInWords = formatRublesInWords(prepaymentAmount || 0);
  const finalInWords = formatRublesInWords(finalPaymentAmount || 0);

  return (
    <div className="space-y-6">
      {/* Configuration Panel - no-print */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-slate-900">Договор на монтажные работы — точный текст</h2>
              <p className="text-xs text-slate-500">Реквизиты исполнителя неизменны, заказчик пустой, ручной ввод стоимости</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrintContract}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Печать / PDF
            </button>
            <button
              onClick={() => handleExportContract("docx")}
              className="px-3 py-2.5 bg-blue-700 hover:bg-blue-800 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              DOCX
            </button>
            <button
              onClick={handleCopyContract}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-300" />
                  Копировать
                </>
              )}
            </button>
          </div>
        </div>

        {/* Manual cost entry - as requested */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2 mb-3">
            <Edit3 className="w-4 h-4" />
            Ручной ввод стоимости для договора (предоплата 100% за оборудование + расходники)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Стоимость кондиционера (₽)</label>
              <input
                type="number"
                value={equipmentCostManual || ""}
                onChange={(e) => setEquipmentCostManual(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="37990"
              />
              <div className="text-2xs text-slate-500 mt-1">Из сметы: {formatRuble(inputs.equipmentPrice)}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Расходные материалы (₽)</label>
              <input
                type="number"
                value={consumablesCostManual || ""}
                onChange={(e) => setConsumablesCostManual(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="0"
              />
              <div className="text-2xs text-slate-500 mt-1">Кабель-канал, крепеж, etc.</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Предоплата 100% (авто)</label>
              <input
                type="number"
                value={prepaymentAmount || ""}
                onChange={(e) => setPrepaymentAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl text-sm font-bold font-mono text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="text-2xs text-amber-700 mt-1">{prepaymentInWords}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Итого договор (₽)</label>
              <input
                type="number"
                value={totalContractAmount || ""}
                onChange={(e) => setTotalContractAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <div className="text-2xs text-slate-500 mt-1">Из сметы: {formatRuble(calculation.finalTotal)}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-2 bg-white rounded-lg border border-amber-200">
              <span className="font-bold text-slate-700">Остаток после выполнения работ:</span>{" "}
              <span className="font-bold font-mono text-blue-900">{formatRuble(finalPaymentAmount)} = {totalContractAmount} - {prepaymentAmount}</span>
              <div className="text-2xs text-slate-600 mt-1">{finalInWords}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Формула:</span> Предоплата 100% за кондиционер + расходники сразу, остаток после подписания Акта
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Способ оплаты по договору:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handlePaymentChange("card")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                paymentMethod === "card" ? "bg-blue-50/70 border-blue-600 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${paymentMethod === "card" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                {paymentMethod === "card" && <span className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900">Перевод на карту Т-Банк</div>
                <p className="text-xs text-slate-600 mt-1">+7-999-420-11-19, Т-Банк, без налога</p>
              </div>
            </div>
            <div
              onClick={() => handlePaymentChange("bank")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                paymentMethod === "bank" ? "bg-blue-50/70 border-blue-600 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${paymentMethod === "bank" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                {paymentMethod === "bank" && <span className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900">По расчетному счету +6% УСН</div>
                <p className="text-xs text-slate-600 mt-1">ООО «Банк Точка», р/с 40802810720000687178, авто +6%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer fields - empty by default as requested */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h4 className="font-bold text-sm text-slate-900 mb-3">Данные для договора (заказчик пустой — заполните вручную):</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">№ договора</label>
              <input type="text" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="67" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Дата договора</label>
              <input type="text" value={contractDate} onChange={(e) => setContractDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="08 июля 2026 г." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ФИО Заказчика (пусто)</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="Русакова Анна Владимировна" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Паспорт серия</label>
              <input type="text" value={customerPassportSeries} onChange={(e) => setCustomerPassportSeries(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="____" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Паспорт номер</label>
              <input type="text" value={customerPassportNumber} onChange={(e) => setCustomerPassportNumber(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="________" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Адрес монтажа (пусто)</label>
              <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="г. Иркутск, ул. Советская, д. 176/187" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Кв / офис</label>
              <input type="text" value={customerApartment} onChange={(e) => setCustomerApartment(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" placeholder="кв____" />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Contract - Exact text as provided */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 md:p-10 text-slate-900 text-sm leading-relaxed" id="printable-contract">
        {/* Header - Dynamic based on contract type */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase tracking-tight">ДОГОВОР</h1>
          <h2 className="text-lg font-bold uppercase">
            {inputs.contractType === "maintenance"
              ? `НА ОБСЛУЖИВАНИЕ КОНДИЦИОНЕРОВ №${contractNumber || "____"}`
              : inputs.contractType === "both"
              ? `НА МОНТАЖНЫЕ РАБОТЫ И ОБСЛУЖИВАНИЕ №${contractNumber || "____"}`
              : `НА МОНТАЖНЫЕ РАБОТЫ №${contractNumber || "____"}`}
          </h2>
          <div className="flex justify-end mt-4 text-xs">
            <span>{contractDate || "«__» ________ 20__ г."}</span>
          </div>
          {inputs.contractType === "maintenance" && (
            <div className="mt-2 inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
              Тип: Только обслуживание • {inputs.maintenance?.quantity || 1} кондиционеров • {formatRuble(calculation.maintenanceTotal)}
            </div>
          )}
        </div>

        <div className="mb-4 text-justify text-xs leading-relaxed">
          <p>
            Индивидуальный предприниматель <strong>Сергеева Мария Владимировна</strong>, именуемый в дальнейшем «Исполнитель», с одной стороны, и{" "}
            <strong>{customerName ? <span className="border-b border-slate-800 px-2">{customerName}</span> : "________________________________________"}</strong>
            , именуемый в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор (далее по тексту «Договор») о нижеследующем:
          </p>
        </div>

        <div className="space-y-4 text-xs leading-relaxed">
          <div>
            <h3 className="font-bold uppercase text-center">1. ПРЕДМЕТ ДОГОВОРА</h3>
            {inputs.contractType === "maintenance" ? (
              <p className="mt-2">
                1.1. Исполнитель обязуется оказать услуги по <strong>комплексному обслуживанию кондиционеров</strong> в количестве <strong>{inputs.maintenance?.quantity || 1} шт</strong> по цене <strong>{formatRuble(inputs.maintenance?.costPerUnit || 0)}/шт</strong> на общую сумму <strong>{formatRuble(calculation.maintenanceTotal)}</strong> (далее в Договоре «Услуги/Работы»), а Заказчик обязуется принять и оплатить его стоимость.
                <span className="block mt-1 text-2xs">Перечень работ по обслуживанию указан в п.1.4</span>
              </p>
            ) : (
              <p className="mt-2">
                1.1. Исполнитель обязуется оказать услуги по поставке и монтажу{" "}
                <strong>
                  {inputs.equipments && inputs.equipments.length > 1
                    ? `${inputs.equipments.length} кондиционеров: ${inputs.equipments.map((eq, i) => `${i + 1}) ${eq.modelName || "Сплит-система"} (${formatRuble(eq.equipmentPrice)})`).join("; ")}`
                    : inputs.modelName || "Сплит-система инверторного типа ___________________"}
                </strong>{" "}
                {inputs.contractType === "both" && inputs.maintenance?.enabled && (
                  <span> и комплексному обслуживанию {inputs.maintenance.quantity} кондиционеров ({formatRuble(calculation.maintenanceTotal)})</span>
                )}{" "}
                (далее в Договоре «Услуги/Работы»), а Заказчик обязуется принять и оплатить его стоимость.
                {calculation.equipmentsCount > 1 && (
                  <span className="block mt-1 text-2xs">
                    Всего единиц оборудования: {calculation.equipmentsCount} шт на сумму {formatRuble(calculation.equipmentTotal)}
                  </span>
                )}
              </p>
            )}
            <p className="mt-1">
              1.2. Место оказания Услуг: {customerAddress ? <strong>{customerAddress}{customerApartment ? `, ${customerApartment}` : ""}</strong> : "г. Иркутск, ул. Советская, д. 176/187, кв________"}
            </p>
            <p className="mt-1">
              1.3. Оказание Услуг осуществляется Исполнителем в соответствии с законодательством Российской Федерации, требованиями иных нормативных правовых актов, регулирующих порядок предоставления такого вида Услуг, устанавливающих требования к качеству такого вида Услуг, в соответствии с условиями договора.
            </p>
            {inputs.maintenance && inputs.maintenance.enabled && (
              <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="font-bold">1.4. Комплексное обслуживание кондиционера ({inputs.maintenance.quantity} шт × {formatRuble(inputs.maintenance.costPerUnit)} = {formatRuble(calculation.maintenanceTotal)}), включающее:</p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5 text-2xs">
                  <li>Визуальный осмотр внутреннего и наружного блока</li>
                  <li>Чистка фильтров, теплообменников, вентилятора</li>
                  <li>Мойка корпусов и лопастей внутреннего блока</li>
                  <li>Мойка корпуса и лопастей наружного блока</li>
                  <li>Дезинфекция внутреннего блока (антисептик, устранение запахов, бактерий, плесени)</li>
                  <li>Проверка давления в системе, выявление утечек</li>
                  <li>Дозаправка фреона при необходимости (до 200 г/блок без доплаты)</li>
                  <li>Проверка дренажной системы и электроподключений</li>
                  <li>Тестирование работы всех режимов</li>
                  <li>Подъём к наружным блокам на автовышке</li>
                </ul>
              </div>
            )}
            {inputs.otherExpenses && inputs.otherExpenses.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="font-bold">1.5. Прочие расходы ({inputs.otherExpenses.length} поз. на сумму {formatRuble(calculation.otherExpensesTotal)}):</p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5 text-2xs">
                  {inputs.otherExpenses.map((exp, i) => (
                    <li key={i}>{exp.description}: {formatRuble(exp.amount)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ</h3>
            <p className="mt-2">
              2.1. Общая стоимость Договора составляет <strong>{formatRuble(totalContractAmount)}</strong> (<strong>{totalInWords}</strong>).
            </p>
            <p className="mt-1">
              {inputs.contractType === "maintenance" ? (
                <>
                  2.2. Заказчик вносит предоплату{" "}
                  <strong>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={maintenancePrepaymentPercent}
                      onChange={(e) => setMaintenancePrepaymentPercent(parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1 py-0.5 bg-white border border-teal-300 rounded text-xs font-bold text-center inline-block mx-1"
                    />
                    %
                  </strong>{" "}
                  на обслуживание в размере <strong>{formatRuble(prepaymentAmount)}</strong> (<strong>{prepaymentInWords}</strong>) в течение 3 (трех) рабочих дней с момента заключения Договора путем перечисления денежных средств по номеру телефона Исполнителя <strong>+7-999-420-11-19, Т-Банк</strong>
                  {paymentMethod === "bank" && (
                    <span> (при оплате по р/с +6% УСН автоматически учтено: {formatRuble(calculation.vatAmount)})</span>
                  )}
                  .
                </>
              ) : (
                <>
                  2.2. Заказчик вносит предоплату 100% от стоимости кондиционера и расходных материалов в размере{" "}
                  <strong>{formatRuble(prepaymentAmount)}</strong> (<strong>{prepaymentInWords}</strong>) в течение 3 (трех) рабочих дней с момента заключения Договора путем перечисления денежных средств по номеру телефона Исполнителя <strong>+7-999-420-11-19, Т-Банк</strong>
                  {paymentMethod === "bank" && (
                    <span> (при оплате по р/с +6% УСН автоматически учтено: {formatRuble(calculation.vatAmount)})</span>
                  )}
                  {equipmentCostManual > 0 && (
                    <span> (в т.ч. кондиционер {formatRuble(equipmentCostManual)} + расходники {formatRuble(consumablesCostManual)})</span>
                  )}
                  .
                </>
              )}
            </p>
            <p className="mt-1">
              2.3. Заказчик производит окончательный расчет в размере <strong>{formatRuble(finalPaymentAmount)}</strong> (<strong>{finalInWords}</strong>) в течение 3 (трех) рабочих дней с момента приемки результата Работ Заказчиком и подписания сторонами Акта приемки выполненных работ.
            </p>
            <p className="mt-1">2.4. Стоимость Договора может быть изменена в ходе его исполнения по взаимному согласию Сторон. Спецификация Оборудования и перечень Работ могут быть уточнены Сторонами при выполнении Работ.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">3. СРОКИ И УСЛОВИЯ ВЫПОЛНЕНИЯ РАБОТ</h3>
            <p className="mt-1">3.2. Исполнитель обязуется выполнить Услуги, предусмотренные в п. 1.2. договора в следующие сроки: 10 рабочих дней с момента поступления денег на счет Исполнителя</p>
            <p>3.3. Факт выполнения Работ в полном объеме оформляется двусторонним Актом приемки выполненных работ.</p>
            <p>3.4. В случае отсутствия письменного обоснованного отказа Заказчика от приемки Работ по Актам Исполнителя в течение 5 (Пяти) календарных дней с момента предоставления каждого акта, Работы считаются принятыми Заказчиком в полном объеме, в установленные сроки, с надлежащим качеством и Стороны претензий друг к другу не имеют.</p>
            <p>3.5. Договор считается выполненным со стороны Исполнителя после оформления последней накладной на Оборудование и подписания Актов в соответствии с п. 3.3. или наступления условий, указанных в п. 3.4.</p>
            <p>3.6. В случае возникновения необходимости, приобретение дополнительного Оборудования и выполнение Работ, не предусмотренных п.п.1.1 и 1.2., согласовываются и осуществляются Сторонами после подписания двухстороннего письменного соглашения.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h3>
            <p className="mt-1">4.1. Заказчик обязуется:</p>
            <p className="ml-4">4.1.1. Предоставить Исполнителю необходимую информацию, требуемую для исполнения им своих обязательств.</p>
            <p className="ml-4">4.1.2. Обеспечить свободный доступ Исполнителя на место выполнения Работ.</p>
            <p className="ml-4">4.1.3. Принять Работы по Акту выполненных работ.</p>
            <p className="ml-4">4.1.4. До принятия Работ по Актам не использовать Оборудование и результат Работ для других целей и задач, не относящихся к предмету Договора, не передавать их третьим лицам.</p>
            <p className="ml-4">4.1.5. Производить оплату за материалы и выполненные Исполнителем Работы, в порядке и в сроки, предусмотренные Договором.</p>
            <p className="ml-4">4.1.6. Оплатить в порядке, форме, сроки и на условиях, определённых в соответствии с дополнительным соглашением, заключенным между Сторонами, выполнение дополнительных Работ и использование дополнительного Оборудования.</p>
            <p>4.2. Заказчик имеет право:</p>
            <p className="ml-4">4.2.1 Получать у специалистов Исполнителя всю необходимую информацию о выполненных Работах.</p>
            <p className="ml-4">4.2.2 Контролировать выполнение Работ по Договору специалистами Исполнителя не вмешиваясь в процесс Работ.</p>
            <p className="ml-4">4.2.3 Если Исполнитель допустил отступления от условий Договора, ухудшившие работу, или допустил иные недостатки в работе, Заказчик может потребовать безвозмездного исправления указанных недостатков в соразмерный срок.</p>
            <p>4.3. Исполнитель обязуется:</p>
            <p className="ml-4">4.3.1. Добросовестно, охраняя интересы Заказчика, оказывать Услуги в объеме и в сроки, определенные Договором.</p>
            <p className="ml-4">4.3.2. Предоставлять Заказчику информацию о Работах.</p>
            <p className="ml-4">4.3.3. При обнаружении возможных неблагоприятных для Заказчика последствий, немедленно информировать Заказчика об этом, и при получении от него соответствующих указаний, приостановить выполнение Работ по Договору. В этом случае Стороны обязаны в течение трех рабочих дней с момента получения информации от Исполнителя рассмотреть вопрос о целесообразности Работ.</p>
            <p className="ml-4">4.3.4. Требовать от своих работников соблюдения правил внутреннего трудового распорядка, действующих у Заказчика, а также требований правил, инструкций и других нормативных документов по вопросам охраны труда, пожарной и техники безопасности.</p>
            <p className="ml-4">4.3.5. За свой счет исправить недостатки, возникшие по его вине при выполнении Работ.</p>
            <p>4.4. Исполнитель имеет право:</p>
            <p className="ml-4">4.4.1 Запрашивать у Заказчика необходимую для выполнения Работ, в рамках Договора, информацию.</p>
            <p className="ml-4">4.4.2 По согласованию с Заказчиком получать от третьих лиц информацию, необходимую для выполнения Работ.</p>
            <p className="ml-4">4.4.3 В случае нарушения Заказчиком условий пп. 4.1.4., приостановить выполнение Работ, изменить сроки выполнения Работ, потребовать возмещения ущерба (в каком бы виде он не был).</p>
            <p className="ml-4">4.4.4 Отказаться от выполнения Работ, в случае не предоставления необходимой информации и невыполнения каких-либо обязательств Заказчиком.</p>
            <p className="ml-4">4.4.5 Требовать доплату за дополнительное Оборудование и выполняемые Работы, не предусмотренные в п.п. 1.1. и 1.2.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА — Вектор Комфорта</h3>
            <p className="mt-1">5.1 <strong>Вектор Комфорта</strong> (ИП Сергеева М.В.) гарантирует Заказчику качество выполняемых Работ.</p>
            <p>5.2 Гарантия на оборудование (кондиционер) предоставляется в соответствии с гарантией завода-изготовителя. На протяжении гарантийного периода завода-изготовителя <strong>Вектор Комфорта</strong> ведет данную гарантию: в случае выхода из строя оборудования по вине производителя, Исполнитель бесплатно демонтирует неисправное оборудование и бесплатно устанавливает новое/отремонтированное. Доставка оборудования по гарантии осуществляется за счет Исполнителя в пределах г. Иркутска.</p>
            {(calculation.mountingTotal > 0 || (inputs.contractType !== "maintenance" && (inputs.equipments?.some(eq => eq.hasInstallation !== false) ?? (inputs.modelName || inputs.equipmentPrice)))) && (
              <p>5.3 Гарантия на выполняемые Работы по монтажу Исполнителя составляет 12 (двенадцать) месяцев с момента подписания Акта приемки выполненных работ. <strong>Вектор Комфорта</strong> гарантирует качество монтажа.</p>
            )}
            <p>5.4 Исполнитель не несет гарантийных обязательств за дефекты и неисправности, возникшие вследствие:</p>
            <p className="ml-4">• ненадлежащего использования Оборудования Заказчиком или третьим лицом;</p>
            <p className="ml-4">• механических повреждений Оборудования Заказчиком или третьим лицом;</p>
            <p className="ml-4">• модернизации Оборудования Заказчиком или третьим лицом;</p>
            <p className="ml-4">• отсутствия регулярного технического обслуживания (рекомендуется 2 раза в год);</p>
            <p>5.5 Необходимым условием сохранения гарантийных обязательств является проведение технического обслуживания Оборудования персоналом <strong>Вектор Комфорта</strong> не реже 2 раз в год. Само техническое обслуживание к гарантийным обязательствам не относится и выполняется за дополнительную плату согласно прейскуранту <strong>Вектор Комфорта</strong>.</p>
            {(inputs.contractType === "maintenance" || inputs.contractType === "both") && (
              <p>5.6 Гарантия на работы по комплексному обслуживанию составляет 30 (тридцать) календарных дней с момента выполнения. В течение гарантийного периода на обслуживание <strong>Вектор Комфорта</strong> бесплатно устраняет выявленные недостатки, возникшие по вине Исполнителя.</p>
            )}
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">6. ОТВЕТСТВЕННОСТЬ СТОРОН</h3>
            <p className="mt-1">6.1 В случае нарушения сроков выполнения Работ Заказчик вправе потребовать от Исполнителя уплату неустойки в виде пени в размере 0,1% от цены невыполненных обязательств за каждый день просрочки до момента полного исполнения обязательств.</p>
            <p>6.2 За нарушение сроков платежей согласно п.2.2, п.2.3. Исполнитель вправе потребовать от Заказчика уплату неустойки в виде пени в размере 0,1% от суммы задолженности за каждый день просрочки и приостановить выполнения своих обязательств по Договору до полного исполнения обязательств Заказчиком.</p>
            <p>6.3 Все иные споры между Сторонами, при отсутствии возможности решить их путем переговоров, решаются в Арбитражном суде Иркутской области.</p>
            <p>6.4 Стороны освобождаются от ответственности за частичное или полное невыполнение обязательств по Договору, если оно явилось следствием обстоятельств непреодолимой силы, которые Стороны не могли предвидеть и предотвратить, включая объявленную или фактическую войну, гражданские волнения, забастовки, эпидемии, блокаду, эмбарго, землетрясения, наводнения, пожары и другие стихийные бедствия.</p>
            <p>6.5 Сторона, не исполняющая своих обязательств по причинам, указанным в п.6.5. Договора, должна дать извещение другой Стороне о препятствии и его влиянии на исполнение обязательств по Договору не позднее 10 дней с момента начала действия таких обстоятельств.</p>
            <p>6.6 Не уведомление или несвоевременное уведомление лишает соответствующую Сторону права ссылаться на любое вышеуказанное обстоятельство как на основание, освобождающее от ответственности за неисполнение обязательств.</p>
            <p>6.7 В случае если обстоятельства, указанные в п. 6.5, продолжаются более 30 дней, каждая из Сторон имеет право расторгнуть настоящий Договор в одностороннем порядке, полностью или частично, письменно предупредив об этом другую Сторону. При этом Стороны обязуются произвести взаиморасчеты в течение десяти банковских дней со дня письменного уведомления о расторжении Договора.</p>
            <p>6.8 Исполнитель не несет ответственность за неисполнение или не надлежащее исполнение обязательств в натуре по вине изготовителя Оборудования и/или транспортной компании, осуществляющей доставку (перевозку) данного Оборудования.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">7. СРОК ДЕЙСТВИЯ ДОГОВОРА</h3>
            <p className="mt-1">7.1 Договор вступает в силу с момента подписания его обеими Сторонами и действует до полного исполнения обязательств по Договору обеими Сторонами.</p>
            <p>7.2 Односторонний отказ Заказчика от исполнения Договора не допускается.</p>
            <p>7.3 Договор может быть расторгнут одной из Сторон по причине не исполнения своих обязательств другой Стороной, в том случае, если другая Сторона была извещена в письменной форме не позднее, чем за 30 (тридцать) дней до его расторжения. По взаимному согласию Сторонами может быть установлен более короткий срок для расторжения Договора.</p>
            <p>7.4 Сроки исполнения обязательств по Договору могут быть продлены по соглашению Сторон.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">8. ПРОЧИЕ УСЛОВИЯ</h3>
            <p className="mt-1">8.1 Исполнитель вправе привлечь к исполнению Договора третьих лиц, отвечая перед Заказчиком за результаты их Работы.</p>
            <p>8.2 Исполнитель вправе размещать информацию о себе на объекте Заказчика во время проведения Работ.</p>
            <p>8.3 Заказчик обязан передать Исполнителю для монтажа Оборудование, принятое по товарной накладной, не позднее следующего дня после получения на то требования Исполнителя.</p>
            <p>8.4 В течение срока действия Договора, а также в течение 5 (Пяти) лет после его прекращения Стороны не имеют права разглашать конфиденциальную информацию полученную друг от друга, необходимость в которой возникла в рамках выполнения Договора.</p>
            <p>8.5 Во всем, что не оговорено Договором, Стороны руководствуются нормами действующего законодательства Российской Федерации.</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">9. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h3>
            <p className="mt-1">9.1 Договор подписан в 2 (Двух) идентичных экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой Стороны.</p>
            <p>9.2 После подписания настоящего Договора все предыдущие переговоры и переписка по нему теряют силу.</p>
            <p>9.3 В случае изменения реквизитов, Сторона, реквизиты которой изменились, обязана в 3 (Трех) дневный срок с момента изменения, уведомить другую Сторону об изменении.</p>
            <p>9.4 Стороны признают юридическую силу документов, переданных факсимильной связью, электронной почтой с последующим оформлением и передачей оригиналов другой стороне.</p>
            <p>9.5 Все Приложения, указанные в Договоре, являются его неотъемлемой частью и считаются действительными, если они оформлены в письменном виде и подписаны Сторонами.</p>
            <p>9.6 Все дополнения и изменения Договора действительны при условии, если они были исполнены в письменном виде и надлежащим образом оформлены уполномоченными представителями Сторон (в виде Дополнительных Соглашений).</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-center">10. КОНТАКТНЫЕ ЛИЦА СТОРОН</h3>
            <p className="mt-1">Исполнитель работ Чебанов Дмитрий Юрьевич т. +7(914) 914-66-06</p>
            <p className="mt-1">Исполнитель работ Кокорин Антон Олегович т. +7 9086401166</p>
          </div>

          <div className="border-t-2 border-slate-800 pt-4 mt-6">
            <h3 className="font-bold uppercase text-center">11. ЮРИДИЧЕСКИЕ АДРЕСА, ПЛАТЕЖНЫЕ РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-xs">
              <div>
                <p className="font-bold">Исполнитель:</p>
                <p className="mt-1">ИП Сергеева М.В</p>
                <p>ИНН: 381113658680</p>
                <p>ОГРН/ОГРНИП: 325385000065256</p>
                <p>Банк ООО «Банк Точка»</p>
                <p>р/сч: 40802810720000687178</p>
                <p>к/сч: 30101810745374525104</p>
                <p>БИК банка: 044525104</p>
                <p>ИНН банка: 9721194461</p>
                <p>Юр. адрес:109044, г. Москва, вн.тер.г. муниципальный округ Южнопортовый, пер. 3-й Крутицкий, д.11, помещ. 7Н</p>
                {paymentMethod === "card" ? (
                  <p className="mt-2 font-bold">Оплата по номеру: +7-999-420-11-19, Т-Банк (без налога)</p>
                ) : (
                  <p className="mt-2 font-bold">Оплата по р/с +6% УСН: {formatRuble(calculation.vatAmount)} налог</p>
                )}
                <div className="mt-8">
                  <p>ИП Сергеева М.В.</p>
                  <p className="mt-6 border-b border-slate-800 w-48">____________________/Сергеева М.В.</p>
                </div>
              </div>
              <div>
                <p className="font-bold">Заказчик:</p>
                <p className="mt-1">{customerName || "______________________________________"}</p>
                <p className="mt-2">Паспорт: серия:{customerPassportSeries || "______"} номер:{customerPassportNumber || "_______________"}</p>
                <p className="mt-2">Адрес: {customerAddress || "______________________________________"} {customerApartment ? `, ${customerApartment}` : ""}</p>
                <div className="mt-8">
                  <p>{customerName ? customerName.split(" ")[0] + " " + (customerName.split(" ")[1]?.[0] || "") + "." + (customerName.split(" ")[2]?.[0] || "") + "." : "______________________________________"}</p>
                  <p className="mt-6 border-b border-slate-800 w-48">____________________/{customerName ? customerName.split(" ")[0] + " " + (customerName.split(" ")[1]?.[0] || "") + "." : "_____________"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Приложение смета */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-400">
            <h3 className="font-bold text-center">Приложение №1 — Смета к Договору №{contractNumber}</h3>
            <p className="text-center text-2xs text-slate-500">Оборудование: {inputs.modelName} | Трасса: {inputs.traceLength} м | Кабель-канал: {calculation.cableChannelMeters > 0 ? `${calculation.cableChannelMeters} м` : "нет"}</p>
            <table className="w-full border-collapse border border-slate-300 text-2xs mt-3">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-300 p-1">№</th>
                  <th className="border border-slate-300 p-1">Наименование</th>
                  <th className="border border-slate-300 p-1">Кол-во</th>
                  <th className="border border-slate-300 p-1">Ед.</th>
                  <th className="border border-slate-300 p-1">Цена</th>
                  <th className="border border-slate-300 p-1">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {calculation.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-1">{it.name}</td>
                    <td className="border border-slate-300 p-1 text-center">{it.quantity}</td>
                    <td className="border border-slate-300 p-1 text-center">{it.unit}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono">{formatRuble(it.pricePerUnit)}</td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatRuble(it.total)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td colSpan={5} className="border border-slate-300 p-1 text-right">Подитог без скидок:</td>
                  <td className="border border-slate-300 p-1 text-right font-mono">{formatRuble(calculation.subtotal)}</td>
                </tr>
                {calculation.discountAmount > 0 && (
                  <tr className="bg-rose-50">
                    <td colSpan={5} className="border border-slate-300 p-1 text-right font-bold text-rose-800">
                      Скидка {inputs.discountType === "percent" ? `(${inputs.discountValue}%)` : ""}:
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-rose-700">-{formatRuble(calculation.discountAmount)}</td>
                  </tr>
                )}
                {calculation.vatAmount > 0 && (
                  <tr className="bg-slate-100">
                    <td colSpan={5} className="border border-slate-300 p-1 text-right font-bold">
                      {inputs.vatType === "vat6" ? "НДС 6%:" : "НДС:"}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold">+{formatRuble(calculation.vatAmount)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="border border-slate-300 p-1 text-right">ИТОГО К ОПЛАТЕ ПО ДОГОВОРУ:</td>
                  <td className="border border-slate-300 p-1 text-right font-mono text-blue-900">{formatRuble(calculation.finalTotal)}</td>
                </tr>
                <tr className="bg-amber-50">
                  <td colSpan={5} className="border border-slate-300 p-1 text-right font-bold">Предоплата (оборудование + расходники):</td>
                  <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatRuble(prepaymentAmount)}</td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={5} className="border border-slate-300 p-1 text-right font-bold">Остаток после работ:</td>
                  <td className="border border-slate-300 p-1 text-right font-mono font-bold">{formatRuble(finalPaymentAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
