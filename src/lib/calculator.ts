export interface EstimateItem {
  id: number;
  name: string;
  quantity: number | string;
  unit: string;
  pricePerUnit: number;
  total: number;
  highlight?: boolean;
}

export interface EstimateInputs {
  modelName: string;
  equipmentPrice: number;
  equipmentBrand?: string;
  equipmentType?: string;
  equipmentUrl?: string;
  traceLength: number; // in meters (e.g. 4, 5, 7, 8)
  complexity: "standard" | "complex";
  complexityHours: number; // hours (e.g. 0, 2, 3)
  hasCableChannel: boolean;
  cableChannelPacks?: number;
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
  additionalWorksTotal: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  finalTotal: number;
}

export const BASE_INSTALLATION_PRICE = 18000;
export const COMPLEXITY_PRICE_PER_HOUR = 1000;
export const EXTRA_TRACE_PRICE_PER_METER = 2100; // 1 100 ₽ material + 1 000 ₽ labor
export const CABLE_CHANNEL_PACK_PRICE = 1200; // 1 pack = 2 meters

export function calculateEstimate(inputs: EstimateInputs): EstimateCalculationResult {
  const equipPrice = Number(inputs.equipmentPrice) || 0;
  const trace = Math.max(1, Number(inputs.traceLength) || 4);
  const isComplex = inputs.complexity === "complex";
  const hours = isComplex ? Math.max(1, Number(inputs.complexityHours) || 1) : 0;
  const hasCable = Boolean(inputs.hasCableChannel);

  // 1. Base install (up to 5m)
  const baseInstallCost = BASE_INSTALLATION_PRICE;

  // 2. Extra complexity
  const complexityCost = isComplex ? hours * COMPLEXITY_PRICE_PER_HOUR : 0;

  // 3. Extra trace over 5m
  const extraTraceMeters = Math.max(0, trace - 5);
  const extraTraceCost = extraTraceMeters * EXTRA_TRACE_PRICE_PER_METER;

  // 4. Cable duct: 1 pack = 2m, rounded up
  const cableChannelPacks = hasCable ? Math.ceil(trace / 2) : 0;
  const cableChannelCost = cableChannelPacks * CABLE_CHANNEL_PACK_PRICE;

  // 5. Additional optional custom items
  let additionalWorksTotal = 0;
  const additionalItemsFormatted: EstimateItem[] = [];
  if (inputs.additionalItems && Array.isArray(inputs.additionalItems)) {
    inputs.additionalItems.forEach((add, idx) => {
      const itemTotal = (Number(add.price) || 0) * (Number(add.quantity) || 1);
      additionalWorksTotal += itemTotal;
      additionalItemsFormatted.push({
        id: 10 + idx,
        name: add.name,
        quantity: add.quantity || 1,
        unit: add.unit || "усл",
        pricePerUnit: add.price || 0,
        total: itemTotal,
      });
    });
  }

  // Construct table items matching prompt specification
  const items: EstimateItem[] = [];
  let itemCounter = 1;

  // Item 1: Equipment
  items.push({
    id: itemCounter++,
    name: `Кондиционер ${inputs.modelName || "Сплит-система"}`,
    quantity: 1,
    unit: "шт",
    pricePerUnit: equipPrice,
    total: equipPrice,
  });

  // Item 2: Standard Installation (up to 5m)
  items.push({
    id: itemCounter++,
    name: "Стандартный монтаж (трасса до 5 м)",
    quantity: 1,
    unit: "компл",
    pricePerUnit: BASE_INSTALLATION_PRICE,
    total: BASE_INSTALLATION_PRICE,
  });

  // Item 3: Complexity surcharge (if complex)
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

  // Item 4: Extra trace surcharge (if trace > 5m)
  if (extraTraceMeters > 0) {
    items.push({
      id: itemCounter++,
      name: "Доплата за трассу свыше 5 м",
      quantity: extraTraceMeters,
      unit: "м",
      pricePerUnit: EXTRA_TRACE_PRICE_PER_METER,
      total: extraTraceCost,
    });
  }

  // Item 5: Cable duct (if enabled)
  if (hasCable && cableChannelPacks > 0) {
    items.push({
      id: itemCounter++,
      name: "Кабель-канал",
      quantity: cableChannelPacks,
      unit: "упак (2 м)",
      pricePerUnit: CABLE_CHANNEL_PACK_PRICE,
      total: cableChannelCost,
    });
  }

  // Append any extra works
  additionalItemsFormatted.forEach((extra) => {
    items.push({
      ...extra,
      id: itemCounter++,
    });
  });

  const installationTotal =
    baseInstallCost + complexityCost + extraTraceCost + cableChannelCost + additionalWorksTotal;
  const subtotal = equipPrice + installationTotal;

  // Discounts
  let discountAmount = 0;
  if (inputs.discountType === "percent" && inputs.discountValue) {
    discountAmount = Math.round((subtotal * inputs.discountValue) / 100);
  } else if (inputs.discountType === "fixed" && inputs.discountValue) {
    discountAmount = Math.min(subtotal, inputs.discountValue);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // VAT
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
    equipmentTotal: equipPrice,
    installationTotal,
    extraTraceCost,
    extraTraceMeters,
    complexityCost,
    cableChannelCost,
    cableChannelPacks,
    additionalWorksTotal,
    subtotal,
    discountAmount,
    vatAmount,
    finalTotal,
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

// Popular sample presets for quick selection
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
