"use client";

import React, { useState, useEffect } from "react";
import { EstimateInputs, EstimateCalculationResult, formatRuble } from "@/lib/calculator";
import {
  FileText,
  Printer,
  Copy,
  Check,
  Building2,
  User,
  CreditCard,
  Building,
  ShieldCheck,
  Calendar,
  Wrench,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { printElementById, openPrintableInNewTab } from "@/lib/print";

interface ContractGeneratorProps {
  inputs: EstimateInputs;
  calculation: EstimateCalculationResult;
  onChangeInputs: (updated: EstimateInputs) => void;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  inputs,
  calculation,
  onChangeInputs,
}) => {
  // Local contract specific fields
  const [contractNumber, setContractNumber] = useState(
    `КЛ-${Math.floor(100 + Math.random() * 900)}/${new Date().getFullYear().toString().slice(-2)}`
  );
  const [contractCity, setContractCity] = useState("г. Москва");
  const [contractDate, setContractDate] = useState(
    inputs.installationDate ||
      new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })
  );
  
  // Payment method: 'card' (0% tax) or 'bank' (6% tax auto calculation)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">(
    inputs.vatType === "vat6" ? "bank" : "card"
  );

  // Customer details (editable, prepopulated from estimate inputs)
  const [customerName, setCustomerName] = useState(inputs.clientName || "");
  const [customerType, setCustomerType] = useState<"individual" | "legal">("individual");
  const [customerDoc, setCustomerDoc] = useState(""); // Passport or INN/OGRN
  const [customerAddress, setCustomerAddress] = useState(inputs.clientAddress || "");
  const [customerPhone, setCustomerPhone] = useState(inputs.clientPhone || "");
  const [customerEmail, setCustomerEmail] = useState("");

  const [copied, setCopied] = useState(false);

  // When payment method changes, automatically switch tax calculation in the estimate
  const handlePaymentChange = (method: "card" | "bank") => {
    setPaymentMethod(method);
    if (method === "bank") {
      onChangeInputs({ ...inputs, vatType: "vat6" });
    } else {
      onChangeInputs({ ...inputs, vatType: "none" });
    }
  };

  // Keep customer name/phone/address in sync if edited here
  const handleUpdateCustomer = (field: "name" | "phone" | "address", val: string) => {
    if (field === "name") {
      setCustomerName(val);
      onChangeInputs({ ...inputs, clientName: val });
    } else if (field === "phone") {
      setCustomerPhone(val);
      onChangeInputs({ ...inputs, clientPhone: val });
    } else if (field === "address") {
      setCustomerAddress(val);
      onChangeInputs({ ...inputs, clientAddress: val });
    }
  };

  const handlePrintContract = () => {
    printElementById("printable-contract", `Договор_${contractNumber}_${customerName || "клиент"}`);
  };

  const handleOpenContractInNewTab = () => {
    openPrintableInNewTab("printable-contract", `Договор_${contractNumber}_${customerName || "клиент"}`);
  };

  const handleCopyContract = () => {
    let text = `ДОГОВОР № ${contractNumber} НА ОКАЗАНИЕ УСЛУГ И ПОСТАВКУ ОБОРУДОВАНИЯ\n`;
    text += `Дата: ${contractDate}, ${contractCity}\n\n`;
    text += `ИСПОЛЬНИТЕЛЬ: ИП Сергеева Мария Владимировна (ИНН 381113658680, ОГРНИП 325385000065256)\n`;
    text += `ЗАКАЗЧИК: ${customerName || "«Укажите ФИО или юридическое лицо»"}\n\n`;
    text += `ПРЕДМЕТ ДОГОВОРА:\nПоставка климатического оборудования (${inputs.modelName || "Сплит-система"}) и его профессиональный монтаж по адресу: ${customerAddress || "«Адрес объекта»"}.\n\n`;
    text += `ОТВЕТСТВЕННЫЙ ИСПОЛНИТЕЛЬ РАБОТ:\nКокорин Антон Олегович, тел. +7 (908) 640-11-66.\n\n`;
    text += `СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ:\n`;
    text += `Общая стоимость договора составляет ${formatRuble(calculation.finalTotal)} (${
      paymentMethod === "bank"
        ? `включая налог 6% УСН в размере ${formatRuble(calculation.vatAmount)}`
        : `без НДС и налоговых надбавок при оплате переводом на карту`
    }).\n`;
    if (paymentMethod === "card") {
      text += `Способ оплаты: Перевод на карту по номеру +7 (999) 420-11-19 (Т-Банк).\n`;
    } else {
      text += `Способ оплаты: Безналичный перевод на расчетный счет.\n`;
      text += `Реквизиты: ООО «Банк Точка», р/с 40802810720000687178, к/с 30101810745374525104, БИК 044525104, ИНН банка 9721194461.\n`;
    }
    text += `\nГАРАНТИЯ НА УСТАНОВКУ: 12 месяцев с даты подписания акта выполненных работ.\n`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Top Configuration & Payment Switch (no-print) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Генерация договора на монтаж и поставку
              </h2>
              <p className="text-xs text-slate-500">
                Исполнитель: ИП Сергеева М.В. • Исполнитель работ: Кокорин Антон Олегович
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handlePrintContract}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Распечатать / PDF
            </button>
            <button
              onClick={handleOpenContractInNewTab}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
              title="Открыть в новой вкладке — работает в Telegram Mini App"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть в новой вкладке
            </button>
            <button
              onClick={handleCopyContract}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Текст скопирован!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-300" />
                  Скопировать текст
                </>
              )}
            </button>
          </div>
        </div>

        {/* Payment Method Selector (Key Interactive Toggle) */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Выберите способ оплаты (автоматический пересчёт налога в договоре и смете):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handlePaymentChange("card")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                paymentMethod === "card"
                  ? "bg-blue-50/70 border-blue-600 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  paymentMethod === "card" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                }`}
              >
                {paymentMethod === "card" && <span className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    Перевод на карту Т-Банк
                  </span>
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                    Налог не учитывается (0 ₽)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Оплата по номеру: <strong>+7 (999) 420-11-19</strong> (Т-Банк / Тинькофф). Для физ. лиц без надбавок.
                </p>
                <div className="mt-2 text-xs font-bold font-mono text-blue-900">
                  Итоговая сумма по договору: {formatRuble(paymentMethod === "card" ? calculation.finalTotal : calculation.subtotal - calculation.discountAmount)}
                </div>
              </div>
            </div>

            <div
              onClick={() => handlePaymentChange("bank")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                paymentMethod === "bank"
                  ? "bg-blue-50/70 border-blue-600 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  paymentMethod === "bank" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                }`}
              >
                {paymentMethod === "bank" && <span className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    По расчетному счету (Бак Точка)
                  </span>
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    +6% Налог УСН автоматически
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Безналичный расчёт для юр. лиц и ИП. Реквизиты: ООО «Банк Точка», р/с 40802810720000687178.
                </p>
                <div className="mt-2 text-xs font-bold font-mono text-amber-900">
                  Итоговая сумма с НДС 6%: {formatRuble(paymentMethod === "bank" ? calculation.finalTotal : Math.round((calculation.subtotal - calculation.discountAmount) * 1.06))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Custom Fields */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Данные Заказчика (свободны для заполнения):
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCustomerType("individual")}
                className={`px-3 py-1 rounded-lg font-semibold border transition ${
                  customerType === "individual"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Физическое лицо
              </button>
              <button
                type="button"
                onClick={() => setCustomerType("legal")}
                className={`px-3 py-1 rounded-lg font-semibold border transition ${
                  customerType === "legal"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Юридическое лицо / ИП
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {customerType === "individual" ? "ФИО Заказчика *" : "Название организации / ИП *"}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => handleUpdateCustomer("name", e.target.value)}
                placeholder={customerType === "individual" ? "Иван Сергеевич Петров" : "ООО «ТехСтройКомплект»"}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {customerType === "individual" ? "Паспортные данные (серия, номер, кем выдан)" : "ИНН / ОГРН / ОГРНИП"}
              </label>
              <input
                type="text"
                value={customerDoc}
                onChange={(e) => setCustomerDoc(e.target.value)}
                placeholder={customerType === "individual" ? "4512 345678, выдан ГУ МВД по г. Москве" : "ИНН 7701234567, ОГРН 1027700001234"}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Телефон Заказчика
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => handleUpdateCustomer("phone", e.target.value)}
                placeholder="+7 (999) 111-22-33"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Адрес монтажа / Юридический адрес
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => handleUpdateCustomer("address", e.target.value)}
                placeholder="г. Москва, ул. Тверская, д. 10, оф. 205"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email / Доп. контакты
              </label>
              <input
                type="text"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="client@example.ru"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Contract Meta Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Номер договора:</span>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold w-28 text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Город заключения:</span>
            <input
              type="text"
              value={contractCity}
              onChange={(e) => setContractCity(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded w-36 text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Дата договора:</span>
            <input
              type="text"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded flex-1 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Printable Official Contract Form */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-8 md:p-12 text-slate-900 text-sm leading-relaxed" id="printable-contract">
        {/* Document Header */}
        <div className="text-center pb-6 border-b-2 border-slate-800 mb-6">
          <div className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1">
            Официальный договор на выполнение работ
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-950">
            ДОГОВОР № {contractNumber}
          </h1>
          <p className="text-base font-semibold text-slate-800 mt-1">
            НА ОКАЗАНИЕ УСЛУГ И ПОСТАВКУ КЛИМАТИЧЕСКОГО ОБОРУДОВАНИЯ
          </p>
          <div className="flex justify-between text-xs text-slate-700 font-medium mt-4 pt-2">
            <span>{contractCity}</span>
            <span>«{contractDate}»</span>
          </div>
        </div>

        {/* Preamble / Стороны */}
        <div className="mb-6 space-y-2">
          <p>
            <strong>Индивидуальный предприниматель Сергеева Мария Владимировна</strong> (ИП Сергеева М.В.), действующая на основании ОГРНИП № 325385000065256 от регистрации, именуемая в дальнейшем <strong>«Исполнитель»</strong>, с одной стороны, и
          </p>
          <p>
            <strong>{customerName || "____________________________________"}</strong>
            {customerDoc ? ` (${customerDoc})` : ""}, именуемый(ая) в дальнейшем <strong>«Заказчик»</strong>, с другой стороны, совместно именуемые <strong>«Стороны»</strong>, заключили настоящий Договор о нижеследующем:
          </p>
        </div>

        {/* Section 1 */}
        <div className="mb-5">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-1 mb-2">
            1. ПРЕДМЕТ ДОГОВОРА
          </h3>
          <p>
            1.1. По настоящему Договору Исполнитель обязуется оказать услуги по поставке климатического оборудования (кондиционера) и выполнить его квалифицированный профессиональный монтаж, а Заказчик обязуется принять и оплатить оказанные услуги в порядке и в сроки, предусмотренные настоящим Договором.
          </p>
          <p className="mt-1">
            1.2. Характеристика оборудования и состав работ:<br />
            • Оборудование: <strong>{inputs.modelName || "Сплит-система"}</strong> ({inputs.equipmentBrand || "Кондиционер"}, {inputs.equipmentType || "Сплит-система"}).<br />
            • Длина фреоновой трассы: <strong>{inputs.traceLength || 4} м</strong> ({inputs.traceLength <= 5 ? "включается в базовый комплект" : `сверх 5 м доплата за ${inputs.traceLength - 5} м`}).<br />
            • Кабель-канал (декоративный короб): <strong>{inputs.hasCableChannel ? `Укладка в кабель-канал (${calculation.cableChannelPacks} упак. / ${calculation.cableChannelPacks * 2} м)` : "Открытая трасса"}</strong>.<br />
            • Сложность работ: <strong>{inputs.complexity === "complex" ? `Сложный монтаж (+${inputs.complexityHours} час.)` : "Стандартный монтаж"}</strong>.
          </p>
          <p className="mt-1">
            1.3. Адрес выполнения работ (Объект): <strong>{customerAddress || "_________________________________________"}</strong>.
          </p>
        </div>

        {/* Section 2 */}
        <div className="mb-5">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-1 mb-2">
            2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ
          </h3>
          <p>
            2.1. Общая стоимость работ и материалов по настоящему Договору (в соответствии с Приложением № 1 «Смета») составляет: <strong>{formatRuble(calculation.finalTotal)}</strong>.
          </p>
          <div className="mt-2 p-3.5 bg-slate-50 border-l-4 border-blue-700 rounded-r-lg">
            {paymentMethod === "card" ? (
              <div>
                <div className="font-bold text-slate-900">
                  Способ оплаты: ПЕРЕВОД НА КАРТУ (Физ. лица) — Налог не учитывается
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  Оплата производится путем перевода денежных средств по номеру телефона: <strong>+7 (999) 420-11-19 (Т-Банк / Тинькофф)</strong>. НДС и налоговые надбавки в сумму договора не входят (налог 0%).
                </p>
              </div>
            ) : (
              <div>
                <div className="font-bold text-amber-900">
                  Способ оплаты: БЕЗНАЛИЧНЫЙ РАСЧЕТ ПО РАСЧЕТНОМУ СЧЕТУ (с учетом налога 6% УСН)
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  В стоимость договора автоматически включен налог 6% УСН в размере <strong>{formatRuble(calculation.vatAmount)}</strong>. Оплата перечисляется на расчетный счет Исполнителя:<br />
                  <strong>Получатель: ИП Сергеева М.В., р/сч 40802810720000687178 в ООО «Банк Точка», БИК 044525104, к/сч 30101810745374525104</strong>.
                </p>
              </div>
            )}
          </div>
          <p className="mt-2">
            2.2. Оплата производится в день проведения монтажных работ после успешного тестового запуска оборудования и подписания Акти приема-передачи выполненных работ, если иное не оговорено дополнительным соглашением.
          </p>
        </div>

        {/* Section 3 - Ответственный монтажник */}
        <div className="mb-5">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-1 mb-2">
            3. ПРАВА И ОБЯЗАННОСТИ СТОРОН. ИСПОЛЬНИТЕЛЬ РАБОТ
          </h3>
          <p>
            3.1. Исполнитель обязуется поставить качественное оборудование и выполнить монтаж в соответствии с техническими нормами и стандартами РФ, используя качественные расходные материалы (медная толстостенная труба ГОСТ, качественная теплоизоляция).
          </p>
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <Wrench className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950 text-sm">
                Ответственный исполнитель работ на объекте (монтажный специалист):
              </div>
              <div className="text-emerald-900 text-sm mt-0.5 font-medium">
                <strong>Кокорин Антон Олегович</strong> • Телефон: <strong className="font-mono text-base">+7 (908) 640-11-66</strong>
              </div>
              <div className="text-xs text-emerald-800/80 mt-0.5">
                Осуществляет непосредственное руководство монтажом, вакуумирование системы, тестовый пуск и инструктаж Заказчика.
              </div>
            </div>
          </div>
          <p className="mt-2">
            3.2. Заказчик обязуется обеспечить доступ специалистов к месту проведения монтажа в согласованные сроки и соблюдать правила безопасной эксплуатации кондиционера.
          </p>
        </div>

        {/* Section 4 & 5 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              4. ГАРАНТИЯ И ОТВЕТСТВЕННОСТЬ
            </h3>
            <p className="text-xs text-slate-700">
              4.1. Гарантийный срок на монтажные работы составляет <strong>12 (двенадцать) месяцев</strong> с даты проведения работ.<br />
              4.2. Гарантия на оборудование определяется официальным гарантийным талоном производителя.<br />
              4.3. При возникновении гарантийного случая Исполнитель безвозмездно устраняет выявленные недостатки в течение 14 рабочих дней.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              5. СРОК ДЕЙСТВИЯ И ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
            </h3>
            <p className="text-xs text-slate-700">
              5.1. Настоящий Договор вступает в силу с момента его подписания Сторонами и действует до полного исполнения Сторонами своих обязательств.<br />
              5.2. Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.
            </p>
          </div>
        </div>

        {/* Section 6: Реквизиты и подписи сторон */}
        <div className="border-t-2 border-slate-800 pt-5">
          <h3 className="font-bold text-base text-center uppercase tracking-wider text-slate-900 mb-6">
            6. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* Contractor */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
              <div className="font-bold text-sm text-blue-950 uppercase border-b border-slate-300 pb-1">
                ИСПОЛЬНИТЕЛЬ:
              </div>
              <div className="font-bold text-slate-900">ИП Сергеева Мария Владимировна (ИП Сергеева М.В.)</div>
              <div><strong>ИНН:</strong> 381113658680</div>
              <div><strong>ОГРНИП:</strong> 325385000065256</div>
              <div><strong>Юридический адрес:</strong> 109044, г. Москва, вн.тер.г. муниципальный округ Южнопортовый, пер. 3-й Крутицкий, д. 11, помещ. 7Н</div>
              <div className="pt-2 border-t border-slate-200">
                <strong>Банк:</strong> ООО «Банк Точка»<br />
                <strong>р/сч:</strong> 40802810720000687178<br />
                <strong>к/сч:</strong> 30101810745374525104<br />
                <strong>БИК:</strong> 044525104 • <strong>ИНН банка:</strong> 9721194461
              </div>
              <div className="pt-2 border-t border-slate-200 text-2xs text-slate-500">
                Оплата на карту Т-Банк: +7 (999) 420-11-19 • Исполнитель работ Кокорин А.О.: +7 (908) 640-11-66
              </div>

              <div className="pt-8 flex items-center justify-between font-bold text-slate-900">
                <span>ИП Сергеева М.В.</span>
                <span className="border-b border-slate-800 w-36 text-center text-2xs text-slate-400 pb-1">Подпись / М.П.</span>
              </div>
            </div>

            {/* Customer */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-blue-950 uppercase border-b border-slate-300 pb-1">
                  ЗАКАЗЧИК:
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {customerName || "«____________________________________»"}
                </div>
                <div><strong>Документ / ИНН:</strong> {customerDoc || "_____________________________"}</div>
                <div><strong>Адрес объекта:</strong> {customerAddress || "_____________________________"}</div>
                <div><strong>Телефон:</strong> {customerPhone || "_____________________________"}</div>
                <div><strong>Email:</strong> {customerEmail || "_____________________________"}</div>
                <div className="pt-3 text-slate-600 italic">
                  Подтверждаю согласие со стоимостью монтажных работ, моделью оборудования, способом оплаты и условиями предоставления гарантии.
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between font-bold text-slate-900">
                <span>Заказчик</span>
                <span className="border-b border-slate-800 w-36 text-center text-2xs text-slate-400 pb-1">Подпись</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attachment: Estimate Specification Table */}
        <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="font-bold text-xs uppercase bg-slate-200 px-2.5 py-1 rounded text-slate-800">
                Приложение № 1 к Договору № {contractNumber}
              </span>
              <h3 className="font-bold text-lg text-slate-950 mt-1">
                СПЕЦИФИКАЦИЯ-СМЕТА НА МОНТАЖНЫЕ РАБОТЫ И ОБОРУДОВАНИЕ
              </h3>
            </div>
            <div className="text-right text-xs">
              <div>Исполнитель: <strong>ИП Сергеева М.В.</strong></div>
              <div>Монтаж: <strong>Кокорин А.О.</strong></div>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs text-left mb-4">
            <thead>
              <tr className="bg-slate-800 text-white font-bold">
                <th className="py-2.5 px-3 border border-slate-700 w-10 text-center">№</th>
                <th className="py-2.5 px-3 border border-slate-700">Наименование позиции / услуги</th>
                <th className="py-2.5 px-3 border border-slate-700 text-center w-16">Кол-во</th>
                <th className="py-2.5 px-3 border border-slate-700 text-center w-20">Ед.</th>
                <th className="py-2.5 px-3 border border-slate-700 text-right w-28">Цена за ед.</th>
                <th className="py-2.5 px-3 border border-slate-700 text-right w-32">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calculation.items.map((it, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="py-2 px-3 border border-slate-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 border border-slate-300 font-medium text-slate-900">{it.name}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center">{it.quantity}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center text-slate-600">{it.unit}</td>
                  <td className="py-2 px-3 border border-slate-300 text-right font-mono">{formatRuble(it.pricePerUnit)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-right font-mono font-semibold text-slate-900">{formatRuble(it.total)}</td>
                </tr>
              ))}
              {calculation.discountAmount > 0 && (
                <tr className="bg-rose-50 font-semibold text-rose-800">
                  <td colSpan={5} className="py-2 px-3 text-right border border-slate-300">Скидка клиенту:</td>
                  <td className="py-2 px-3 text-right border border-slate-300 font-mono">-{formatRuble(calculation.discountAmount)}</td>
                </tr>
              )}
              {calculation.vatAmount > 0 && paymentMethod === "bank" && (
                <tr className="bg-amber-50 font-bold text-amber-900">
                  <td colSpan={5} className="py-2 px-3 text-right border border-slate-300">Включен налог 6% УСН (оплата на р/сч Банк Точка):</td>
                  <td className="py-2 px-3 text-right border border-slate-300 font-mono">+{formatRuble(calculation.vatAmount)}</td>
                </tr>
              )}
              <tr className="bg-slate-100 font-extrabold text-slate-950 text-sm">
                <td colSpan={5} className="py-3 px-3 text-right border border-slate-300">
                  ИТОГО К ОПЛАТЕ ПО ДОГОВОРУ:
                </td>
                <td className="py-3 px-3 text-right border border-slate-300 font-mono text-base text-blue-900">
                  {formatRuble(calculation.finalTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between text-xs pt-4 font-bold text-slate-800">
            <div>ОТ ИСПОЛЬНИТЕЛЯ: ИП Сергеева М.В. ___________</div>
            <div>ОТ ЗАКАЗЧИКА: {customerName ? customerName.split(" ")[0] : "___________"} ___________</div>
          </div>
        </div>
      </div>
    </div>
  );
};
