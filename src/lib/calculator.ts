export interface EstimateItem {
  id: number;
  name: string;
  quantity: number | string;
  unit: string;
  pricePerUnit: number;
  total: number;
  highlight?: boolean;
}

export interface EquipmentInput {
  id?: string;
  modelName: string;
  equipmentPrice: number;
  equipmentBrand?: string;
  equipmentType?: string;
  equipmentUrl?: string;
  traceLength?: number;
  hasCableChannel?: boolean;
  cableChannelMeters?: number;
}

export interface OtherExpense {
  id?: string;
  description: string;
  amount: number;
}

export interface MaintenanceService {
  enabled: boolean;
  costPerUnit: number;
  quantity: number;
  description?: string;
}

export interface EstimateInputs {
  modelName: string;
  equipmentPrice: number;
  equipmentBrand?: string;
  equipmentType?: string;
  equipmentUrl?: string;
  traceLength: number;
  complexity: "standard" | "complex";
  complexityHours: number;
  hasCableChannel: boolean;
  cableChannelMeters?: number;
  cableChannelPacks?: number;
  equipments?: EquipmentInput[];
  otherExpenses?: OtherExpense[];
  maintenance?: MaintenanceService;
  contractType?: "sale_installation" | "maintenance" | "both";
  additionalItems?: Array<{ name: string; price: number; quantity: number; unit: string }>;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  vatType?: "none" | "vat6" | string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  installationDate?: string;
  notes?: string;
}

export interface EstimateCalculationResult {
  items: EstimateItem[];
  equipmentTotal: number;
  installationTotal: number;
  extraTraceCost: number;
  extraTraceMeters: number;
  complexityCost: number;
  cableChannelCost: number;
  cableChannelPacks: number;
  cableChannelMeters: number;
  otherExpensesTotal: number;
  maintenanceTotal: number;
  additionalWorksTotal: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  finalTotal: number;
  equipmentsCount: number;
}

export const BASE_INSTALLATION_PRICE = 18000;
export const COMPLEXITY_PRICE_PER_HOUR = 1000;
export const EXTRA_TRACE_PRICE_PER_METER = 2100;
export const CABLE_CHANNEL_PACK_PRICE = 1200;

export function calculateEstimate(inputs: EstimateInputs): EstimateCalculationResult {
  const isComplex = inputs.complexity === "complex";
  const hours = isComplex ? Math.max(1, Number(inputs.complexityHours) || 1) : 0;
  const complexityCost = isComplex ? hours * COMPLEXITY_PRICE_PER_HOUR : 0;

  // Build equipments list - support multiple
  let equipments: EquipmentInput[] = [];
  
  if (inputs.equipments && Array.isArray(inputs.equipments) && inputs.equipments.length > 0) {
    equipments = inputs.equipments.map(eq => ({
      modelName: eq.modelName || "Кондиционер",
      equipmentPrice: Number(eq.equipmentPrice) || 0,
      equipmentBrand: eq.equipmentBrand || "",
      equipmentType: eq.equipmentType || "Сплит-система",
      equipmentUrl: eq.equipmentUrl || "",
      traceLength: eq.traceLength !== undefined ? Math.max(1, Number(eq.traceLength) || 4) : Math.max(1, Number(inputs.traceLength) || 4),
      hasCableChannel: eq.hasCableChannel !== undefined ? Boolean(eq.hasCableChannel) : Boolean(inputs.hasCableChannel),
      cableChannelMeters: eq.cableChannelMeters !== undefined ? Number(eq.cableChannelMeters) : (inputs.cableChannelMeters !== undefined ? Number(inputs.cableChannelMeters) : undefined),
    }));
  } else {
    // Single equipment from main fields (backward compatibility)
    const hasEquip = (inputs.modelName && inputs.modelName.trim() !== "") || (inputs.equipmentPrice && inputs.equipmentPrice > 0);
    if (hasEquip || true) { // Always at least 1 if no equipments array
      equipments = [{
        modelName: inputs.modelName || "Кондиционер",
        equipmentPrice: Number(inputs.equipmentPrice) || 0,
        equipmentBrand: inputs.equipmentBrand || "",
        equipmentType: inputs.equipmentType || "Сплит-система",
        equipmentUrl: inputs.equipmentUrl || "",
        traceLength: Math.max(1, Number(inputs.traceLength) || 4),
        hasCableChannel: Boolean(inputs.hasCableChannel),
        cableChannelMeters: inputs.cableChannelMeters !== undefined ? Number(inputs.cableChannelMeters) : undefined,
      }];
    }
  }

  // If no equipment at all and modelName empty and price 0, keep at least 1 empty for UI
  if (equipments.length === 0) {
    equipments = [{
      modelName: "Кондиционер",
      equipmentPrice: 0,
      traceLength: Math.max(1, Number(inputs.traceLength) || 4),
      hasCableChannel: false,
    }];
  }

  let equipmentTotal = 0;
  let baseInstallTotal = 0;
  let extraTraceTotal = 0;
  let extraTraceMetersTotal = 0;
  let cableChannelTotal = 0;
  let cableChannelPacksTotal = 0;
  let cableChannelMetersTotal = 0;

  const items: EstimateItem[] = [];
  let itemCounter = 1;

  equipments.forEach((eq, eqIdx) => {
    const eqPrice = Number(eq.equipmentPrice) || 0;
    const eqTrace = Math.max(1, Number(eq.traceLength) || 4);
    const eqHasCable = Boolean(eq.hasCableChannel);
    
    let eqCableMeters = 0;
    if (eqHasCable) {
      const raw = eq.cableChannelMeters;
      if (raw !== undefined && raw !== null && Number(raw) > 0) {
        eqCableMeters = Math.min(Math.max(1, Math.round(Number(raw))), eqTrace);
      } else {
        eqCableMeters = eqTrace;
      }
    }

    const eqExtraMeters = Math.max(0, eqTrace - 5);
    const eqExtraCost = eqExtraMeters * EXTRA_TRACE_PRICE_PER_METER;
    const eqCablePacks = eqCableMeters > 0 ? Math.ceil(eqCableMeters / 2) : 0;
    const eqCableCost = eqCablePacks * CABLE_CHANNEL_PACK_PRICE;

    equipmentTotal += eqPrice;
    baseInstallTotal += BASE_INSTALLATION_PRICE;
    extraTraceTotal += eqExtraCost;
    extraTraceMetersTotal += eqExtraMeters;
    cableChannelTotal += eqCableCost;
    cableChannelPacksTotal += eqCablePacks;
    cableChannelMetersTotal += eqCableMeters;

    const prefix = equipments.length > 1 ? `Кондиционер ${eqIdx + 1}: ` : `Кондиционер `;
    
    // Equipment
    items.push({
      id: itemCounter++,
      name: `${prefix}${eq.modelName || "Сплит-система"}`,
      quantity: 1,
      unit: "шт",
      pricePerUnit: eqPrice,
      total: eqPrice,
    });

    // Installation per equipment
    const installName = equipments.length > 1 
      ? `Стандартный монтаж (трасса до 5 м) - блок ${eqIdx + 1}` 
      : `Стандартный монтаж (трасса до 5 м)`;
    
    items.push({
      id: itemCounter++,
      name: installName,
      quantity: 1,
      unit: "компл",
      pricePerUnit: BASE_INSTALLATION_PRICE,
      total: BASE_INSTALLATION_PRICE,
    });

    // Extra trace per equipment
    if (eqExtraMeters > 0) {
      items.push({
        id: itemCounter++,
        name: equipments.length > 1 
          ? `Доплата за трассу свыше 5 м - блок ${eqIdx + 1} (${eqExtraMeters} м)` 
          : `Доплата за трассу свыше 5 м`,
        quantity: eqExtraMeters,
        unit: "м",
        pricePerUnit: EXTRA_TRACE_PRICE_PER_METER,
        total: eqExtraCost,
      });
    }

    // Cable channel per equipment
    if (eqHasCable && eqCablePacks > 0) {
      items.push({
        id: itemCounter++,
        name: equipments.length > 1
          ? `Кабель-канал - блок ${eqIdx + 1} (${eqCableMeters} м)`
          : `Кабель-канал`,
        quantity: eqCablePacks,
        unit: "упак (2 м)",
        pricePerUnit: CABLE_CHANNEL_PACK_PRICE,
        total: eqCableCost,
      });
    }
  });

  // Complexity (global)
  if (isComplex && hours > 0) {
    items.push({
      id: itemCounter++,
      name: "Доплата за сложность",
      quantity: hours,
      unit: "час",
      pricePerUnit: COMPLEXITY_PRICE_PER_HOUR,
      total: complexityCost,
    });
  }

  // Additional items (legacy)
  let additionalWorksTotal = 0;
  if (inputs.additionalItems && Array.isArray(inputs.additionalItems)) {
    inputs.additionalItems.forEach((add) => {
      const itemTotal = (Number(add.price) || 0) * (Number(add.quantity) || 1);
      additionalWorksTotal += itemTotal;
      items.push({
        id: itemCounter++,
        name: add.name,
        quantity: add.quantity || 1,
        unit: add.unit || "усл",
        pricePerUnit: add.price || 0,
        total: itemTotal,
      });
    });
  }

  // Other expenses - as requested
  let otherExpensesTotal = 0;
  if (inputs.otherExpenses && Array.isArray(inputs.otherExpenses)) {
    inputs.otherExpenses.forEach((exp) => {
      const amount = Number(exp.amount) || 0;
      if (amount > 0 && exp.description && exp.description.trim() !== "") {
        otherExpensesTotal += amount;
        items.push({
          id: itemCounter++,
          name: `Прочие расходы: ${exp.description}`,
          quantity: 1,
          unit: "усл",
          pricePerUnit: amount,
          total: amount,
        });
      }
    });
  }

  // Maintenance service - as requested
  let maintenanceTotal = 0;
  if (inputs.maintenance && inputs.maintenance.enabled) {
    const costPerUnit = Number(inputs.maintenance.costPerUnit) || 0;
    const qty = Math.max(1, Number(inputs.maintenance.quantity) || 1);
    maintenanceTotal = costPerUnit * qty;
    
    if (maintenanceTotal > 0) {
      items.push({
        id: itemCounter++,
        name: `Комплексное обслуживание кондиционера (${qty} ${qty === 1 ? "шт" : qty < 5 ? "шт" : "шт"})`,
        quantity: qty,
        unit: "шт",
        pricePerUnit: costPerUnit,
        total: maintenanceTotal,
      });
    }
  }

  const installationTotal = baseInstallTotal + extraTraceTotal + cableChannelTotal + complexityCost + additionalWorksTotal + otherExpensesTotal + maintenanceTotal;
  const subtotal = equipmentTotal + installationTotal;

  let discountAmount = 0;
  if (inputs.discountType === "percent" && inputs.discountValue) {
    discountAmount = Math.round((subtotal * inputs.discountValue) / 100);
  } else if (inputs.discountType === "fixed" && inputs.discountValue) {
    discountAmount = Math.min(subtotal, inputs.discountValue);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let vatAmount = 0;
  let finalTotal = afterDiscount;

  if (inputs.vatType === "vat6") {
    vatAmount = Math.round(afterDiscount * 0.06);
    finalTotal = afterDiscount + vatAmount;
  } else if (inputs.vatType === "extra20") {
    vatAmount = Math.round(afterDiscount * 0.2);
    finalTotal = afterDiscount + vatAmount;
  } else if (inputs.vatType === "included") {
    vatAmount = Math.round((afterDiscount * 20) / 120);
    finalTotal = afterDiscount;
  }

  return {
    items,
    equipmentTotal,
    installationTotal,
    extraTraceCost: extraTraceTotal,
    extraTraceMeters: extraTraceMetersTotal,
    complexityCost,
    cableChannelCost: cableChannelTotal,
    cableChannelPacks: cableChannelPacksTotal,
    cableChannelMeters: cableChannelMetersTotal,
    otherExpensesTotal,
    maintenanceTotal,
    additionalWorksTotal,
    subtotal,
    discountAmount,
    vatAmount,
    finalTotal,
    equipmentsCount: equipments.length,
  };
}

export function formatRuble(val: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat("ru-RU").format(val || 0);
}

export const SAMPLE_AIR_CONDITIONERS = [
  {
    model: "Haier Coral HSU-07HPL102/R3",
    price: 28900,
    brand: "Haier",
    type: "Сплит-система",
    area: "до 20 м²",
    url: "https://www.dns-shop.ru/product/haier-coral-07",
  },
  {
    model: "Ballu Eco Pro BSPI-09HN1/EP/24Y",
    price: 34500,
    brand: "Ballu",
    type: "Инверторная сплит-система",
    area: "до 25 м²",
    url: "https://market.yandex.ru/product/ballu-eco-pro-09",
  },
  {
    model: "Daikin Sensira FTXC25C / RXC25C",
    price: 64000,
    brand: "Daikin",
    type: "Инверторная сплит-система",
    area: "до 25 м²",
    url: "https://climat-store.ru/daikin-sensira-25",
  },
  {
    model: "Gree Pular GWH09AGA-K3NNA1A",
    price: 31800,
    brand: "Gree",
    type: "Сплит-система",
    area: "до 25 м²",
    url: "https://avito.ru/item/gree-pular-09",
  },
  {
    model: "Midea Paramount MSAG1-09HRN1-I",
    price: 29400,
    brand: "Midea",
    type: "Сплит-система",
    area: "до 25 м²",
    url: "https://citilink.ru/product/midea-paramount-09",
  },
  {
    model: "Electrolux Fusion Pro EACS-12HF/N3",
    price: 38200,
    brand: "Electrolux",
    type: "Сплит-система",
    area: "до 35 м²",
    url: "https://ozon.ru/product/electrolux-fusion-12",
  },
];
