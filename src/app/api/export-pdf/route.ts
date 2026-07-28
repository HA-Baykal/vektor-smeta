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
      doc.setFont("helvetica");
    }
  } else {
    doc.setFont("helvetica");
  }
  return doc;
}

function addTextWithWrap(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight + 2;
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
        customerName: contractData.customerName || "________________________________________",
        customerAddress: contractData.customerAddress || "г. Иркутск, ул. Советская, д. 176/187, кв________",
        equipmentCost: contractData.equipmentCost,
        consumablesCost: contractData.consumablesCost,
        prepayment: contractData.prepayment || contractData.equipmentCost + contractData.consumablesCost,
        finalPayment: contractData.finalPayment,
        total: contractData.total || calculation.finalTotal,
      };

      const doc = createPdfWithCyrillic();
      let y = 15;

      doc.setFontSize(14);
      doc.setFont("DejaVuSans", "bold");
      doc.text(`ДОГОВОР НА МОНТАЖНЫЕ РАБОТЫ №${finalContractData.contractNumber}`, 105, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("DejaVuSans", "normal");
      doc.text(finalContractData.contractDate, 180, y, { align: "right" });
      y += 10;

      doc.setFontSize(8);
      y = addTextWithWrap(doc, `Индивидуальный предприниматель Сергеева Мария Владимировна, именуемый в дальнейшем «Исполнитель», с одной стороны, и ${finalContractData.customerName}, именуемый в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:`, 15, y, 180);

      // Section 1
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `1. ПРЕДМЕТ ДОГОВОРА`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `1.1. Исполнитель обязуется оказать услуги по поставке и монтажу ${data.modelName || "Сплит-система инверторного типа"} (далее «Услуги/Работы»), а Заказчик обязуется принять и оплатить его стоимость.`, 15, y, 180);
      y = addTextWithWrap(doc, `1.2. Место оказания Услуг: ${finalContractData.customerAddress}`, 15, y, 180);
      y = addTextWithWrap(doc, `1.3. Оказание Услуг осуществляется в соответствии с законодательством РФ и требованиями нормативных актов.`, 15, y, 180);
      y += 2;

      // Section 2
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `2.1. Общая стоимость Договора составляет ${formatRuble(finalContractData.total)} (${formatRublesInWords(finalContractData.total)}).`, 15, y, 180);
      y = addTextWithWrap(doc, `2.2. Заказчик вносит предоплату 100% от стоимости кондиционера и расходных материалов в размере ${formatRuble(finalContractData.prepayment)} (${formatRublesInWords(finalContractData.prepayment)}) в течение 3 рабочих дней с момента заключения Договора путем перечисления по номеру +7-999-420-11-19, Т-Банк (в т.ч. кондиционер ${formatRuble(finalContractData.equipmentCost)} + расходники ${formatRuble(finalContractData.consumablesCost)}).${calculation.vatAmount > 0 ? ` НДС 6%: ${formatRuble(calculation.vatAmount)}.` : ""}`, 15, y, 180);
      y = addTextWithWrap(doc, `2.3. Заказчик производит окончательный расчет в размере ${formatRuble(finalContractData.finalPayment)} (${formatRublesInWords(finalContractData.finalPayment)}) в течение 3 рабочих дней с момента приемки результата Работ и подписания Акта.`, 15, y, 180);
      y = addTextWithWrap(doc, `2.4. Стоимость может быть изменена по взаимному согласию. Спецификация может быть уточнена при выполнении Работ.`, 15, y, 180);
      y += 2;

      // Section 3
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `3. СРОКИ И УСЛОВИЯ ВЫПОЛНЕНИЯ РАБОТ`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `3.2. Исполнитель обязуется выполнить Услуги в течение 10 рабочих дней с момента поступления денег. 3.3. Факт выполнения оформляется Актом приемки. 3.4. При отсутствии отказа в течение 5 дней Работы считаются принятыми. 3.5. Договор выполнен после накладной и Актов. 3.6. Доп. Оборудование и Работы согласовываются письменно.`, 15, y, 180);
      y += 2;

      // Section 4
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `4. ПРАВА И ОБЯЗАННОСТИ СТОРОН`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `4.1. Заказчик обязуется: предоставить информацию, обеспечить доступ, принять Работы по Акту, не использовать Оборудование до приемки, производить оплату, оплатить доп. Работы по доп. соглашению. 4.2. Заказчик имеет право: получать информацию, контролировать не вмешиваясь, требовать исправления недостатков. 4.3. Исполнитель обязуется: добросовестно оказывать Услуги, предоставлять информацию, информировать о неблагоприятных последствиях, требовать соблюдения ТБ, исправить недостатки за свой счет. 4.4. Исполнитель имеет право: запрашивать информацию, получать от третьих лиц, приостановить Работы при нарушении, отказаться при не предоставлении информации, требовать доплату.`, 15, y, 180);
      y += 2;

      // Section 5
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `5.1 Гарантия качества Работ. 5.2 Гарантия на кондиционер по гарантии завода. 5.3 Гарантия на Работы 12 месяцев. 5.4 Не несет гарантии при ненадлежащем использовании, мех. повреждениях, модернизации Заказчиком. 5.5 Условие гарантии - техобслуживание персоналом Исполнителя за доп. плату.`, 15, y, 180);
      y += 2;

      // Check page break
      if (y > 220) { doc.addPage(); y = 15; }

      // Section 6
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `6. ОТВЕТСТВЕННОСТЬ СТОРОН`, 15, y, 180);
      doc.setFont("DejaVuSans", "normal");
      y = addTextWithWrap(doc, `6.1 При нарушении сроков Заказчик вправе требовать пени 0,1% за каждый день. 6.2 За нарушение сроков платежей Исполнитель вправе требовать пени 0,1% и приостановить Работы. 6.3 Споры в Арбитражном суде Иркутской области. 6.4 Форс-мажор. 6.5-6.8 Уведомление о форс-мажоре в 10 дней, расторжение при 30 днях.`, 15, y, 180);
      y += 2;

      // Section 7-9 short
      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `7. СРОК ДЕЙСТВИЯ: С момента подписания до исполнения. Односторонний отказ не допускается. Расторжение с уведомлением за 30 дней.`, 15, y, 180);
      y = addTextWithWrap(doc, `8. ПРОЧИЕ УСЛОВИЯ: Привлечение третьих лиц, размещение информации, передача Оборудования, конфиденциальность 5 лет, законодательство РФ.`, 15, y, 180);
      y = addTextWithWrap(doc, `9. ЗАКЛЮЧИТЕЛЬНЫЕ: 2 экземпляра, предыдущие переговоры теряют силу, уведомление о смене реквизитов 3 дня, юр. сила факса/email, Приложения - часть Договора, изменения - Доп. Соглашениями.`, 15, y, 180);
      y += 2;

      if (y > 240) { doc.addPage(); y = 15; }

      doc.setFont("DejaVuSans", "bold");
      y = addTextWithWrap(doc, `10. КОНТАКТНЫЕ ЛИЦА: Исполнитель работ Чебанов Дмитрий Юрьевич т. +7(914) 914-66-06, Исполнитель работ Кокорин Антон Олегович т. +7 9086401166`, 15, y, 180);
      y += 4;
      y = addTextWithWrap(doc, `11. РЕКВИЗИТЫ: Исполнитель: ИП Сергеева М.В., ИНН 381113658680, ОГРНИП 325385000065256, Банк ООО «Банк Точка», р/с 40802810720000687178, БИК 044525104, Юр. адрес: г. Москва, пер. 3-й Крутицкий, д.11, пом. 7Н. Заказчик: ${finalContractData.customerName}, Адрес: ${finalContractData.customerAddress}`, 15, y, 180);
      y += 8;

      // Estimate table in contract
      if (y > 200) { doc.addPage(); y = 15; }
      doc.setFont("DejaVuSans", "bold");
      doc.text(`Приложение №1 - Смета к Договору №${finalContractData.contractNumber}`, 105, y, { align: "center" });
      y += 6;
      doc.setFontSize(7);
      doc.setFont("DejaVuSans", "normal");
      doc.text(`Оборудование: ${data.modelName || "Не указано"} | Трасса: ${data.traceLength}м | Кабель-канал: ${calculation.cableChannelMeters}м | Итого: ${formatRuble(calculation.finalTotal)}`, 15, y);
      y += 6;

      // Table header
      doc.setFontSize(7);
      doc.setFont("DejaVuSans", "bold");
      doc.text("№", 15, y);
      doc.text("Наименование", 22, y);
      doc.text("Кол", 95, y);
      doc.text("Ед", 110, y);
      doc.text("Цена", 125, y);
      doc.text("Сумма", 160, y);
      y += 3;
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont("DejaVuSans", "normal");
      calculation.items.forEach((item, idx) => {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.text(String(idx + 1), 15, y);
        const name = item.name.length > 50 ? item.name.slice(0, 50) + "..." : item.name;
        doc.text(name, 22, y);
        doc.text(String(item.quantity), 95, y);
        doc.text(item.unit, 110, y);
        doc.text(formatRuble(item.pricePerUnit), 125, y);
        doc.text(formatRuble(item.total), 160, y);
        y += 5;
      });

      y += 2;
      doc.line(15, y, 195, y);
      y += 4;
      doc.setFont("DejaVuSans", "normal");
      doc.text(`Подитог: ${formatRuble(calculation.subtotal)}`, 130, y); y += 4;
      if (calculation.discountAmount > 0) {
        doc.text(`Скидка: -${formatRuble(calculation.discountAmount)}`, 130, y); y += 4;
      }
      if (calculation.vatAmount > 0) {
        doc.text(`НДС 6%: +${formatRuble(calculation.vatAmount)}`, 130, y); y += 4;
      }
      doc.setFont("DejaVuSans", "bold");
      doc.text(`ИТОГО: ${formatRuble(calculation.finalTotal)}`, 130, y); y += 5;
      doc.text(`Предоплата: ${formatRuble(finalContractData.prepayment)} | Остаток: ${formatRuble(finalContractData.finalPayment)}`, 130, y);

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
      doc.setFont("DejaVuSans", "bold");
      doc.text("СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("DejaVuSans", "normal");
      doc.text(`Оборудование: ${data.modelName || "Сплит-система"} | Дата: ${data.installationDate || new Date().toLocaleDateString("ru-RU")} | Трасса: ${data.traceLength}м`, 105, 22, { align: "center" });

      let y = 30;
      doc.setFontSize(8);
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
        if (y > 270) { doc.addPage(); y = 15; }
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
        doc.text(`Скидка: -${formatRuble(calculation.discountAmount)}`, 130, y); y += 5;
      }
      if (calculation.vatAmount > 0) {
        doc.text(`НДС 6%: +${formatRuble(calculation.vatAmount)}`, 130, y); y += 5;
      }

      doc.setFont("DejaVuSans", "bold");
      doc.text(`ИТОГО К ОПЛАТЕ: ${formatRuble(calculation.finalTotal)}`, 130, y);
      y += 8;
      doc.setFont("DejaVuSans", "normal");
      doc.setFontSize(7);
      doc.text(`Трасса: ${data.traceLength}м | В кабель-канале: ${calculation.cableChannelMeters}м | Сложность: ${data.complexity === "complex" ? `Сложный +${data.complexityHours}ч` : "Стандарт"} | Гарантия 12 мес.`, 10, y);
      y += 5;
      doc.text(`Исполнитель: ИП Сергеева М.В. | Кокорин А.О. +7(908)640-11-66 | Т-Банк +7(999)420-11-19`, 10, y);

      const pdfBuffer = doc.output("arraybuffer");
      const cleanFilename = `smeta-${(data.modelName || "aircon").toLowerCase().replace(/[^a-zа-я0-9]/gi, "_").slice(0, 30)}.pdf`;

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
