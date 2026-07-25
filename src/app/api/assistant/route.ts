import { NextRequest, NextResponse } from "next/server";
import { calculateEstimate, EstimateInputs } from "@/lib/calculator";

export async function POST(req: NextRequest) {
  try {
    const { message, currentInputs } = await req.json();
    const text = (message || "").toLowerCase();

    const updated: EstimateInputs = {
      modelName: currentInputs?.modelName || "Кондиционер",
      equipmentPrice: currentInputs?.equipmentPrice || 28900,
      traceLength: currentInputs?.traceLength || 4,
      complexity: currentInputs?.complexity || "standard",
      complexityHours: currentInputs?.complexityHours || 0,
      hasCableChannel: Boolean(currentInputs?.hasCableChannel),
      equipmentBrand: currentInputs?.equipmentBrand || "",
      equipmentType: currentInputs?.equipmentType || "Сплит-система",
      clientName: currentInputs?.clientName || "",
      clientPhone: currentInputs?.clientPhone || "",
      clientAddress: currentInputs?.clientAddress || "",
    };

    // 1. Detect price
    const priceMatch =
      message.match(/(\d[\d\s]{2,})\s*(руб|₽|rub|тыс)/i) ||
      message.match(/цена[:\s]+(\d[\d\s]+)/i) ||
      message.match(/(\d{4,6})/);
    if (priceMatch && priceMatch[1]) {
      const p = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
      if (p > 3000 && p < 1000000) {
        updated.equipmentPrice = p;
      }
    }

    // 2. Detect trace length
    const traceMatch =
      message.match(/(\d+)\s*(м|метр|метра|метров)/i) ||
      message.match(/трасс[аы][:\s]+(\d+)/i);
    if (traceMatch && traceMatch[1]) {
      const t = parseInt(traceMatch[1], 10);
      if (t >= 1 && t <= 50) {
        updated.traceLength = t;
      }
    }

    // 3. Detect complexity
    if (text.includes("сложн") || text.includes("тяжел") || text.includes("высот")) {
      updated.complexity = "complex";
      const hoursMatch = message.match(/(\d+)\s*(час|часа|часов)/i);
      if (hoursMatch && hoursMatch[1]) {
        updated.complexityHours = parseInt(hoursMatch[1], 10);
      } else if (updated.complexityHours === 0) {
        updated.complexityHours = 2;
      }
    } else if (text.includes("стандарт") || text.includes("прост")) {
      updated.complexity = "standard";
      updated.complexityHours = 0;
    }

    // 4. Detect cable duct
    if (text.includes("кабель") || text.includes("канал") || text.includes("короб")) {
      if (text.includes("без кабель") || text.includes("не нуж") || text.includes("открыт")) {
        updated.hasCableChannel = false;
      } else {
        updated.hasCableChannel = true;
      }
    }

    // 5. Detect model / brand
    const brands = [
      "shuft",
      "axioma",
      "daichi",
      "green",
      "haier",
      "ballu",
      "daikin",
      "gree",
      "midea",
      "electrolux",
      "mitsubishi",
      "toshiba",
      "lg",
      "samsung",
      "hisense",
      "kentatsu",
      "aux",
      "tcl",
      "royal clima",
      "zanussi",
      "timberk",
      "mdv",
      "hyundai",
      "neoclima",
    ];
    for (const b of brands) {
      if (text.includes(b)) {
        updated.equipmentBrand = b.charAt(0).toUpperCase() + b.slice(1);
        if (updated.modelName === "Кондиционер" || !updated.modelName) {
          updated.modelName = `${updated.equipmentBrand} Сплит-система`;
        }
        break;
      }
    }

    // Calculate result
    const calc = calculateEstimate(updated);

    let reply = `Я обновил расчёт сметы на основе ваших данных!\n\n`;
    reply += `📊 **Параметры:**\n`;
    reply += `• Оборудование: **${updated.modelName}** (${calc.equipmentTotal.toLocaleString("ru-RU")} ₽)\n`;
    reply += `• Длина трассы: **${updated.traceLength} м** (база до 5 м включена${
      calc.extraTraceMeters > 0 ? `, доплата за ${calc.extraTraceMeters} м: ${calc.extraTraceCost.toLocaleString("ru-RU")} ₽` : ""
    })\n`;
    reply += `• Сложность: **${
      updated.complexity === "complex"
        ? `Сложный (+${updated.complexityHours} ч. = ${calc.complexityCost.toLocaleString("ru-RU")} ₽)`
        : "Стандартный монтаж (0 ₽)"
    }**\n`;
    reply += `• Кабель-канал: **${
      updated.hasCableChannel
        ? `Да (${calc.cableChannelPacks} упак. по 2 м = ${calc.cableChannelCost.toLocaleString("ru-RU")} ₽)`
        : "Открытая трасса (0 ₽)"
    }**\n\n`;
    reply += `💰 **ИТОГО К ОПЛАТЕ: ${calc.finalTotal.toLocaleString("ru-RU")} ₽**\n`;
    reply += `Вы можете скачать файл Excel (.xlsx), распечатать PDF или сохранить смету в базу.`;

    return NextResponse.json({
      success: true,
      reply,
      inputs: updated,
      calculation: calc,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
