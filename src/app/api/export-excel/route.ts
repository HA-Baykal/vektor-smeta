import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { calculateEstimate, EstimateInputs } from "@/lib/calculator";

export async function POST(req: NextRequest) {
  try {
    const data: EstimateInputs = await req.json();

    const calculation = calculateEstimate(data);
    const currentDate =
      data.installationDate ||
      new Date().toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ИИ-Ассистент Сметчик";
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: Смета
    // ==========================================
    const sheet1 = workbook.addWorksheet("Смета", {
      views: [{ showGridLines: true }],
    });

    // Set column widths
    sheet1.columns = [
      { key: "num", width: 8 },
      { key: "name", width: 44 },
      { key: "qty", width: 14 },
      { key: "unit", width: 14 },
      { key: "price", width: 18 },
      { key: "sum", width: 20 },
    ];

    // Main Header
    sheet1.mergeCells("A1:F1");
    const titleCell = sheet1.getCell("A1");
    titleCell.value = `СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА`;
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Deep Navy Blue
    };
    sheet1.getRow(1).height = 36;

    // Subtitle
    sheet1.mergeCells("A2:F2");
    const subCell = sheet1.getCell("A2");
    subCell.value = `Оборудование: ${data.modelName || "Кондиционер"} | Дата: ${currentDate}`;
    subCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF374151" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet1.getRow(2).height = 24;

    // Blank row
    sheet1.addRow([]);

    // Table Headers
    const headerRow = sheet1.addRow([
      "№",
      "Наименование",
      "Количество",
      "Единица",
      "Цена за ед. (₽)",
      "Сумма (₽)",
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" }, // Royal Blue
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
    });

    // Populate rows
    calculation.items.forEach((item, index) => {
      const row = sheet1.addRow([
        index + 1,
        item.name,
        item.quantity,
        item.unit,
        item.pricePerUnit,
        item.total,
      ]);
      row.height = 22;

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

      row.getCell(5).numFmt = '#,##0 "₽"';
      row.getCell(6).numFmt = '#,##0 "₽"';

      const isEven = index % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (isEven) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      });
    });

    // Blank row
    sheet1.addRow([]);

    // Subtotal if discount or VAT exists
    if (calculation.discountAmount > 0 || calculation.vatAmount > 0) {
      const subtotalRow = sheet1.addRow(["", "Подитог без скидок:", "", "", "", calculation.subtotal]);
      subtotalRow.getCell(2).font = { name: "Arial", size: 10, italic: true };
      subtotalRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
      subtotalRow.getCell(6).numFmt = '#,##0 "₽"';

      if (calculation.discountAmount > 0) {
        const discRow = sheet1.addRow(["", "Скидка клиенту:", "", "", "", -calculation.discountAmount]);
        discRow.getCell(2).font = { name: "Arial", size: 10, color: { argb: "FFDC2626" } };
        discRow.getCell(6).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFDC2626" } };
        discRow.getCell(6).numFmt = '-#,##0 "₽"';
      }

      if (calculation.vatAmount > 0 && data.vatType !== "none") {
        const vatLabel = data.vatType === "vat6" ? "С НДС 6%:" : "НДС:";
        const vatRow = sheet1.addRow(["", vatLabel, "", "", "", calculation.vatAmount]);
        vatRow.getCell(2).font = { name: "Arial", size: 10, italic: true };
        vatRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
        vatRow.getCell(6).numFmt = '#,##0 "₽"';
      }
    }

    // Bold TOTAL Row
    const totalRow = sheet1.addRow(["", "ИТОГО К ОПЛАТЕ:", "", "", "", calculation.finalTotal]);
    totalRow.height = 30;

    sheet1.mergeCells(`B${totalRow.number}:E${totalRow.number}`);
    const totalLabelCell = totalRow.getCell(2);
    totalLabelCell.value = "ИТОГО:";
    totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };
    totalLabelCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FF1E3A8A" } };

    const totalValCell = totalRow.getCell(6);
    totalValCell.alignment = { horizontal: "right", vertical: "middle" };
    totalValCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
    totalValCell.numFmt = '#,##0 "₽"';

    totalRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF08A" }, // Light amber highlight
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1E3A8A" } },
        bottom: { style: "double", color: { argb: "FF1E3A8A" } },
      };
    });

    // ==========================================
    // SHEET 2: Параметры
    // ==========================================
    const sheet2 = workbook.addWorksheet("Параметры", {
      views: [{ showGridLines: true }],
    });

    sheet2.columns = [{ width: 28 }, { width: 45 }];

    sheet2.mergeCells("A1:B1");
    const paramTitle = sheet2.getCell("A1");
    paramTitle.value = "ПАРАМЕТРЫ ЗАКАЗА И КЛИЕНТА";
    paramTitle.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    paramTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" }, // Teal
    };
    paramTitle.alignment = { vertical: "middle", horizontal: "center" };
    sheet2.getRow(1).height = 30;

    const paramData = [
      ["ФИО Клиента", data.clientName || "Не указано"],
      ["Телефон клиента", data.clientPhone || "Не указан"],
      ["Адрес монтажа", data.clientAddress || "Не указан"],
      ["Дата монтажа", currentDate],
      ["Модель кондиционера", data.modelName || "—"],
      ["Бренд / Тип", `${data.equipmentBrand || "—"} / ${data.equipmentType || "Сплит-система"}`],
      ["Цена оборудования", `${calculation.equipmentTotal.toLocaleString("ru-RU")} ₽`],
      ["Длина трассы", `${data.traceLength || 4} м`],
      [
        "Сложность монтажа",
        data.complexity === "complex"
          ? `Сложный (+${data.complexityHours || 0} час.)`
          : "Стандартный",
      ],
      [
        "Кабель-канал",
        data.hasCableChannel
          ? `Да (${calculation.cableChannelPacks} упак. по 2 м = ${calculation.cableChannelPacks * 2} м)`
          : "Нет (открытая трасса)",
      ],
      ["Примечания", data.notes || "Без особых примечаний"],
    ];

    sheet2.addRow([]);
    paramData.forEach(([label, value]) => {
      const row = sheet2.addRow([label, value]);
      row.height = 22;
      row.getCell(1).font = { name: "Arial", size: 10, bold: true };
      row.getCell(2).font = { name: "Arial", size: 10 };
      row.getCell(1).border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      row.getCell(2).border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const cleanFilename = `smeta-${(data.modelName || "aircon")
      .toLowerCase()
      .replace(/[^a-zа-я0-9]/gi, "_")
      .slice(0, 30)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(cleanFilename)}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
