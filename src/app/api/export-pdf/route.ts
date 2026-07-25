import { NextRequest, NextResponse } from "next/server";
import { calculateEstimate, EstimateInputs } from "@/lib/calculator";
import { formatRuble } from "@/lib/calculator";
import { formatRublesInWords } from "@/lib/numberToWords";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getFontBase64(): string | null {
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf");
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      return fontBuffer.toString("base64");
    }
    // Fallback to system path (for local dev)
    const systemPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
    if (fs.existsSync(systemPath)) {
      const fontBuffer = fs.readFileSync(systemPath);
      return fontBuffer.toString("base64");
    }
  } catch (e) {
    console.error("Failed to load font:", e);
  }
  return null;
}

function createPdfWithCyrillic(): jsPDF {
  const doc = new jsPDF();
  
  const fontBase64 = getFontBase64();
  if (fontBase64) {
    try {
      doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
      doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
      doc.addFont("DejaVuSans.ttf", "DejaVuSans", "bold");
      doc.setFont("DejaVuSans");
    } catch (e) {
      console.error("Failed to add font to PDF:", e);
      doc.setFont("helvetica");
    }
  } else {
    doc.setFont("helvetica");
  }
  
  return doc;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type || "estimate";

    if (type === "contract") {
      const data: EstimateInputs = body.inputs || body;
      const contractData = body.contractData || {
        contractNumber: body.contractNumber || "67",
        contractDate: body.contractDate || new Date().toLocaleDateString("ru-RU"),
        customerName: body.customerName || "",
        customerAddress: body.customerAddress || "",
        equipmentCost: body.equipmentCost || data.equipmentPrice || 0,
        consumablesCost: body.consumablesCost || 0,
        prepayment: body.prepayment || 0,
        finalPayment: body.finalPayment || 0,
        total: body.total || 0,
      };

      const calculation = calculateEstimate(data);

      const finalContractData = {
        contractNumber: contractData.contractNumber,
        contractDate: contractData.contractDate,
        customerName: contractData.customerName,
        customerAddress: contractData.customerAddress,
        equipmentCost: contractData.equipmentCost,
        consumablesCost: contractData.consumablesCost,
        prepayment: contractData.prepayment || contractData.equipmentCost + contractData.consumablesCost,
        finalPayment: contractData.finalPayment,
        total: contractData.total || calculation.finalTotal,
      };

      const doc = createPdfWithCyrillic();
      doc.setFontSize(14);
      doc.text(`ДОГОВОР НА МОНТАЖНЫЕ РАБОТЫ №${finalContractData.contractNumber}`, 105, 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(finalContractData.contractDate, 180, 22, { align: "right" });

      let y = 30;
      doc.setFontSize(9);

      const contractText = [
        `Индивидуальный предприниматель Сергеева Мария Владимировна, именуемый «Исполнитель», и ${finalContractData.customerName || "Заказчик"}, именуемый «Заказчик», заключили договор:`,
        ``,
        `1. ПРЕДМЕТ ДОГОВОРА`,
        `1.1. Исполнитель обязуется оказать услуги по поставке и монтажу ${data.modelName || "Сплит-система"} (далее «Услуги/Работы»).`,
        `1.2. Место оказания Услуг: ${finalContractData.customerAddress || "г. Иркутск, ул. Советская"}.`,
        ``,
        `2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ`,
        `2.1. Общая стоимость: ${formatRuble(finalContractData.total)} (${formatRublesInWords(finalContractData.total)}).`,
        `2.2. Предоплата 100% кондиционера и расходников: ${formatRuble(finalContractData.prepayment)} (${formatRublesInWords(finalContractData.prepayment)}) в течение 3 дней по телефону +7-999-420-11-19, Т-Банк (в т.ч. кондиционер ${formatRuble(finalContractData.equipmentCost)} + расходники ${formatRuble(finalContractData.consumablesCost)}).`,
        `2.3. Окончательный расчет: ${formatRuble(finalContractData.finalPayment)} (${formatRublesInWords(finalContractData.finalPayment)}) в течение 3 дней после приемки работ.`,
        ``,
        `3. СРОКИ: 10 рабочих дней с момента поступления денег. Акт приемки.`,
        ``,
        `4. ПРАВА И ОБЯЗАННОСТИ: Заказчик предоставляет информацию, доступ, принимает работы, оплачивает. Исполнитель добросовестно оказывает услуги, информирует, исправляет недостатки.`,
        ``,
        `5. ГАРАНТИЯ: 12 месяцев на работы, на кондиционер по гарантии завода.`,
        ``,
        `6. ОТВЕТСТВЕННОСТЬ: Пени 0,1% за просрочку. Споры в Арбитражном суде Иркутской области. Форс-мажор.`,
        ``,
        `7. СРОК ДЕЙСТВИЯ: С момента подписания до полного исполнения.`,
        ``,
        `10. КОНТАКТНЫЕ ЛИЦА: Исполнитель работ Кокорин Антон Олегович т. +7 9086401166`,
        ``,
        `11. РЕКВИЗИТЫ:`,
        `Исполнитель: ИП Сергеева М.В., ИНН 381113658680, ОГРНИП 325385000065256`,
        `Банк: ООО «Банк Точка», р/с 40802810720000687178, БИК 044525104`,
        `Заказчик: ${finalContractData.customerName || "________________"}, Адрес: ${finalContractData.customerAddress || "________________"}`,
        ``,
        `Приложение: Смета - Итого ${formatRuble(calculation.finalTotal)}`,
      ];

      for (const line of contractText) {
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        const lines = doc.splitTextToSize(line, 180);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 2;
      }

      const pdfBuffer = doc.output("arraybuffer");

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="dogovor_${finalContractData.contractNumber}.pdf"`,
          "Content-Type": "application/pdf",
        },
      });
    } else {
      const data: EstimateInputs = body;
      const calculation = calculateEstimate(data);

      const doc = createPdfWithCyrillic();
      doc.setFontSize(14);
      doc.text("СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Оборудование: ${data.modelName || "Сплит-система"} | Дата: ${data.installationDate || new Date().toLocaleDateString("ru-RU")} | Трасса: ${data.traceLength}м`, 105, 22, { align: "center" });

      let y = 30;
      doc.setFontSize(8);

      // Header
      doc.setFont("DejaVuSans", "bold");
      doc.text("№", 10, y);
      doc.text("Наименование", 18, y);
      doc.text("Кол-во", 95, y);
      doc.text("Ед.", 115, y);
      doc.text("Цена", 130, y);
      doc.text("Сумма", 165, y);
      y += 4;
      doc.line(10, y, 200, y);
      y += 4;

      doc.setFont("DejaVuSans", "normal");
      calculation.items.forEach((item, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        doc.text(String(idx + 1), 10, y);
        const name = item.name.length > 55 ? item.name.slice(0, 55) + "..." : item.name;
        doc.text(name, 18, y);
        doc.text(String(item.quantity), 95, y);
        doc.text(item.unit, 115, y);
        doc.text(formatRuble(item.pricePerUnit), 130, y);
        doc.text(formatRuble(item.total), 165, y);
        y += 5;
      });

      y += 3;
      doc.line(10, y, 200, y);
      y += 5;

      if (calculation.discountAmount > 0) {
        doc.text(`Скидка: -${formatRuble(calculation.discountAmount)}`, 130, y);
        y += 5;
      }
      if (calculation.vatAmount > 0) {
        doc.text(`НДС 6%: +${formatRuble(calculation.vatAmount)}`, 130, y);
        y += 5;
      }

      doc.setFont("DejaVuSans", "bold");
      doc.text(`ИТОГО: ${formatRuble(calculation.finalTotal)}`, 130, y);
      y += 8;

      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(7);
      doc.text(`Трасса: ${data.traceLength}м | В кабель-канале: ${calculation.cableChannelMeters}м | Сложность: ${data.complexity === "complex" ? `Сложный +${data.complexityHours}ч` : "Стандарт"} | Гарантия 12 мес.`, 10, y);
      y += 5;
      doc.text(`Исполнитель: ИП Сергеева М.В. | Кокорин А.О. +7(908)640-11-66 | Т-Банк +7(999)420-11-19`, 10, y);

      const pdfBuffer = doc.output("arraybuffer");

      const cleanFilename = `smeta-${(data.modelName || "aircon")
        .toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, "_")
        .slice(0, 30)}.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(cleanFilename)}"`,
          "Content-Type": "application/pdf",
        },
      });
    }
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
