import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { formatRuble } from "@/lib/calculator";

interface CustomWork {
  id: string;
  name: string;
  quantity: number;
  workPricePerMeter: number;
  materialPricePerMeter: number;
}

interface EquipmentForSale {
  id: string;
  modelName: string;
  price: number;
}

interface AdditionalWish {
  id: string;
  description: string;
  amount: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customWorks = [],
      equipmentsForSale = [],
      additionalWishes = [],
      clientName = "",
      clientAddress = "",
      contractNumber = "67",
      prepaymentPercent = 100,
      prepaymentAmount: bodyPrepayment = 0,
      finalPaymentAmount: bodyFinal = 0,
      grandTotal: bodyGrandTotal = 0,
    } = body;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Вектор Комфорта - Сметчик";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Смета - Другие виды работ", {
      views: [{ showGridLines: false }],
    });

    sheet.columns = [
      { key: "num", width: 6 },
      { key: "name", width: 50 },
      { key: "qty", width: 12 },
      { key: "unit", width: 14 },
      { key: "price", width: 18 },
      { key: "sum", width: 20 },
    ];

    // Header
    sheet.mergeCells("A1:F1");
    const companyCell = sheet.getCell("A1");
    companyCell.value = `ИП Сергеева М.В. | +7(914) 914-66-06 | +7(908) 640-11-66 | Вектор Комфорта - строительно монтажная компания`;
    companyCell.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    companyCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 18;

    sheet.mergeCells("A2:F2");
    const titleCell = sheet.getCell("A2");
    titleCell.value = `СМЕТА № ${contractNumber} - ДРУГИЕ ВИДЫ РАБОТ`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
    sheet.getRow(2).height = 32;

    sheet.mergeCells("A3:F3");
    const subCell = sheet.getCell("A3");
    subCell.value = `Дата: ${new Date().toLocaleDateString("ru-RU")} | Заказчик: ${clientName || "Не указан"} | Адрес: ${clientAddress || "Не указан"}`;
    subCell.font = { name: "Arial", size: 10, italic: true };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    sheet.getRow(3).height = 22;

    sheet.addRow([]);

    // Headers
    const headerRow = sheet.addRow(["№", "Наименование работ", "Кол-во", "Ед.", "Цена за ед., ₽", "Сумма, ₽"]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
      };
    });

    let rowCounter = 1;
    let totalWork = 0;
    let totalMaterial = 0;
    let totalEquipment = 0;
    let totalAdditional = 0;

    // Section: Main works with work and material separated
    if (customWorks.length > 0) {
      const sectionRow = sheet.addRow(["", "ОСНОВНЫЕ РАБОТЫ (штробление, укладка трассы)", "", "", "", ""]);
      sectionRow.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF92400E" } };
      sectionRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      sectionRow.eachCell((cell) => {
        cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
      });

      for (const work of customWorks as CustomWork[]) {
        const qty = Number(work.quantity) || 0;
        const workPrice = Number(work.workPricePerMeter) || 0;
        const matPrice = Number(work.materialPricePerMeter) || 0;
        const workTotal = qty * workPrice;
        const matTotal = qty * matPrice;
        const total = workTotal + matTotal;

        totalWork += workTotal;
        totalMaterial += matTotal;

        // Work row
        if (workPrice > 0) {
          const row = sheet.addRow([
            rowCounter++,
            `${work.name} - работа (${qty}м × ${workPrice}₽/м)`,
            qty,
            "м",
            workPrice,
            workTotal,
          ]);
          row.getCell(5).numFmt = '#,##0 "₽"';
          row.getCell(6).numFmt = '#,##0 "₽"';
          row.eachCell((cell) => {
            cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
          });
        }

        // Material row
        if (matPrice > 0) {
          const row = sheet.addRow([
            rowCounter++,
            `${work.name} - материал (${qty}м × ${matPrice}₽/м) ${work.name.toLowerCase().includes("штроб") ? "" : ""}`,
            qty,
            "м",
            matPrice,
            matTotal,
          ]);
          row.getCell(5).numFmt = '#,##0 "₽"';
          row.getCell(6).numFmt = '#,##0 "₽"';
          row.getCell(2).font = { italic: true, color: { argb: "FF92400E" } };
          row.eachCell((cell) => {
            cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
          });
        }

        // Professional description row
        const descRow = sheet.addRow([
          "",
          `Штробление стены с укладкой фреонопровода ${qty} метров: цена за материал с работой ${total.toLocaleString("ru-RU")} ₽ (работа ${workTotal.toLocaleString("ru-RU")} ₽ + материал ${matTotal.toLocaleString("ru-RU")} ₽), цена за ${work.name.toLowerCase()} ${qty}м × ${workPrice}₽ = ${workTotal.toLocaleString("ru-RU")} ₽`,
          "",
          "",
          "",
          total,
        ]);
        descRow.getCell(2).font = { size: 9, italic: true, color: { argb: "FF57534E" } };
        descRow.getCell(6).font = { bold: true };
        descRow.getCell(6).numFmt = '#,##0 "₽"';
        descRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      }
    }

    // Equipment for sale
    if (equipmentsForSale && equipmentsForSale.length > 0) {
      const sectionRow = sheet.addRow(["", "ПРОДАЖА ОБОРУДОВАНИЯ (без монтажа)", "", "", "", ""]);
      sectionRow.getCell(2).font = { bold: true, color: { argb: "FF065F46" } };
      sectionRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };

      for (const eq of equipmentsForSale as EquipmentForSale[]) {
        if (!eq.modelName || !eq.price) continue;
        totalEquipment += Number(eq.price) || 0;
        const row = sheet.addRow([
          rowCounter++,
          `Продажа кондиционера: ${eq.modelName}`,
          1,
          "шт",
          eq.price,
          eq.price,
        ]);
        row.getCell(5).numFmt = '#,##0 "₽"';
        row.getCell(6).numFmt = '#,##0 "₽"';
        row.getCell(6).font = { bold: true, color: { argb: "FF065F46" } };
      }
    }

    // Additional wishes
    if (additionalWishes && additionalWishes.length > 0) {
      const sectionRow = sheet.addRow(["", "ДОПОЛНИТЕЛЬНЫЕ ПОЖЕЛАНИЯ", "", "", "", ""]);
      sectionRow.getCell(2).font = { bold: true, color: { argb: "FF5B21B6" } };
      sectionRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };

      for (const wish of additionalWishes as AdditionalWish[]) {
        if (!wish.description || !wish.amount) continue;
        totalAdditional += Number(wish.amount) || 0;
        const row = sheet.addRow([
          rowCounter++,
          wish.description,
          1,
          "усл",
          wish.amount,
          wish.amount,
        ]);
        row.getCell(5).numFmt = '#,##0 "₽"';
        row.getCell(6).numFmt = '#,##0 "₽"';
      }
    }

    sheet.addRow([]);

    // Summary
    const workRow = sheet.addRow(["", "Итого работа:", "", "", "", totalWork]);
    workRow.getCell(2).alignment = { horizontal: "right" };
    workRow.getCell(2).font = { bold: true };
    workRow.getCell(6).numFmt = '#,##0 "₽"';

    const matRow = sheet.addRow(["", "Итого материал:", "", "", "", totalMaterial]);
    matRow.getCell(2).alignment = { horizontal: "right" };
    matRow.getCell(2).font = { bold: true };
    matRow.getCell(6).numFmt = '#,##0 "₽"';

    if (totalEquipment > 0) {
      const eqRow = sheet.addRow(["", "Итого оборудование (продажа):", "", "", "", totalEquipment]);
      eqRow.getCell(2).alignment = { horizontal: "right" };
      eqRow.getCell(2).font = { bold: true };
      eqRow.getCell(6).numFmt = '#,##0 "₽"';
      eqRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    }

    if (totalAdditional > 0) {
      const addRow = sheet.addRow(["", "Итого доп. пожелания:", "", "", "", totalAdditional]);
      addRow.getCell(2).alignment = { horizontal: "right" };
      addRow.getCell(6).numFmt = '#,##0 "₽"';
    }

    const grandTotal = totalWork + totalMaterial + totalEquipment + totalAdditional;
    const totalRow = sheet.addRow(["", "ИТОГО К ОПЛАТЕ:", "", "", "", grandTotal]);
    totalRow.height = 28;
    sheet.mergeCells(`B${totalRow.number}:E${totalRow.number}`);
    totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(2).font = { bold: true, size: 12, color: { argb: "FF92400E" } };
    totalRow.getCell(6).font = { bold: true, size: 14, color: { argb: "FF92400E" } };
    totalRow.getCell(6).numFmt = '#,##0 "₽"';
    totalRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
      cell.border = { top: { style: "medium" }, bottom: { style: "double" } };
    });

    // Prepayment and final payment if provided
    if (bodyPrepayment > 0 || prepaymentPercent !== 100) {
      const prepayRow = sheet.addRow(["", `Предоплата ${prepaymentPercent}%:`, "", "", "", bodyPrepayment || Math.round((grandTotal * prepaymentPercent) / 100)]);
      prepayRow.getCell(2).alignment = { horizontal: "right" };
      prepayRow.getCell(2).font = { bold: true, color: { argb: "FF065F46" } };
      prepayRow.getCell(6).numFmt = '#,##0 "₽"';
      prepayRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };

      const finalRow = sheet.addRow(["", "Остаток после выполнения работ:", "", "", "", bodyFinal || (grandTotal - (bodyPrepayment || Math.round((grandTotal * prepaymentPercent) / 100)))]);
      finalRow.getCell(2).alignment = { horizontal: "right" };
      finalRow.getCell(2).font = { bold: true };
      finalRow.getCell(6).numFmt = '#,##0 "₽"';
      finalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    }

    // Footer
    sheet.addRow([]);
    const footerIdx = sheet.rowCount + 1;
    sheet.mergeCells(`A${footerIdx}:F${footerIdx}`);
    const footerCell = sheet.getCell(`A${footerIdx}`);
    footerCell.value = `Вектор Комфорта | Чебанов Д.Ю. +7(914)914-66-06 | Кокорин А.О. +7(908)640-11-66 | Сформировано: ${new Date().toLocaleString("ru-RU")}`;
    footerCell.font = { size: 8, color: { argb: "FF64748B" }, italic: true };
    footerCell.alignment = { horizontal: "center" };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="smeta_drugie_raboty_${contractNumber}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
