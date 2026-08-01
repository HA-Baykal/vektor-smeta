import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { calculateEstimate, EstimateInputs } from "@/lib/calculator";

export async function POST(req: NextRequest) {
  try {
    const data: EstimateInputs = await req.json();

    const calculation = calculateEstimate(data);
    const estimateDate = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const installationDate = data.installationDate
      ? new Date(data.installationDate).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "По согласованию";
    const currentDate = estimateDate;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ИИ-Ассистент Сметчик";
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: Смета - Professional version
    // ==========================================
    const sheet1 = workbook.addWorksheet("Смета", {
      views: [{ showGridLines: false }],
    });

    sheet1.columns = [
      { key: "num", width: 6 },
      { key: "name", width: 50 },
      { key: "qty", width: 12 },
      { key: "unit", width: 14 },
      { key: "price", width: 18 },
      { key: "sum", width: 20 },
    ];

    // Company Header
    sheet1.mergeCells("A1:F1");
    const companyCell = sheet1.getCell("A1");
    companyCell.value = `ИП Сергеева М.В. | Монтаж кондиционеров | +7 (908) 640-11-66 | +7 (999) 420-11-19`;
    companyCell.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    companyCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet1.getRow(1).height = 18;

    // Main Title
    sheet1.mergeCells("A2:F2");
    const titleCell = sheet1.getCell("A2");
    titleCell.value = `СМЕТА № ${new Date().getTime().toString().slice(-6)} НА МОНТАЖ КОНДИЦИОНЕРА`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    sheet1.getRow(2).height = 32;

    // Subtitle with equipment and date
    sheet1.mergeCells("A3:F3");
    const subCell = sheet1.getCell("A3");
    subCell.value = `Оборудование: ${data.modelName || "Не указано"} | Дата: ${currentDate} | Трасса: ${data.traceLength || 4} м`;
    subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF374151" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    subCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    sheet1.getRow(3).height = 22;

    // Customer info row if available
    if (data.clientName || data.clientAddress) {
      sheet1.mergeCells("A4:F4");
      const custCell = sheet1.getCell("A4");
      custCell.value = `Заказчик: ${data.clientName || "Частное лицо"} | Адрес: ${data.clientAddress || "Не указан"} | Тел: ${data.clientPhone || "Не указан"}`;
      custCell.font = { name: "Arial", size: 9, color: { argb: "FF475569" } };
      custCell.alignment = { vertical: "middle", horizontal: "left" };
      sheet1.getRow(4).height = 18;
    }

    sheet1.addRow([]);

    // Table Headers with professional styling
    const headerRowIndex = sheet1.rowCount + 1;
    const headerRow = sheet1.addRow([
      "№",
      "Наименование работ / материалов",
      "Кол-во",
      "Ед. изм.",
      "Цена за ед., ₽",
      "Сумма, ₽",
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E40AF" } },
        left: { style: "thin", color: { argb: "FF1E40AF" } },
        bottom: { style: "thin", color: { argb: "FF1E40AF" } },
        right: { style: "thin", color: { argb: "FF1E40AF" } },
      };
    });

    // Equipment Section Header
    const equipHeaderRow = sheet1.addRow(["", "ОБОРУДОВАНИЕ", "", "", "", ""]);
    equipHeaderRow.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E3A8A" } };
    equipHeaderRow.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDBEAFE" },
    };
    equipHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });

    // Populate equipment item (first item)
    const equipmentItems = calculation.items.filter((_, idx) => idx === 0);
    const workItems = calculation.items.filter((_, idx) => idx !== 0);

    calculation.items.forEach((item, index) => {
      // Add section header for works after first item
      if (index === 1) {
        const workHeaderRow = sheet1.addRow(["", "МОНТАЖНЫЕ РАБОТЫ И МАТЕРИАЛЫ", "", "", "", ""]);
        workHeaderRow.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF065F46" } };
        workHeaderRow.getCell(2).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
        workHeaderRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
      }

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
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

      row.getCell(5).numFmt = '#,##0 "₽"';
      row.getCell(6).numFmt = '#,##0 "₽"';

      const isEven = index % 2 === 1;
      row.eachCell((cell, colNumber) => {
        cell.font = { 
          name: "Arial", 
          size: 10,
          bold: colNumber === 2 && index === 0 // Equipment bold
        };
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

    // Subtotal breakdown
    const equipmentTotal = calculation.equipmentTotal;
    const worksTotal = calculation.installationTotal;

    if (calculation.items.length > 1) {
      const equipSubtotalRow = sheet1.addRow(["", "Итого оборудование:", "", "", "", equipmentTotal]);
      equipSubtotalRow.getCell(2).font = { name: "Arial", size: 10, bold: true };
      equipSubtotalRow.getCell(2).alignment = { horizontal: "right" };
      equipSubtotalRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
      equipSubtotalRow.getCell(6).numFmt = '#,##0 "₽"';
      equipSubtotalRow.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };

      const worksSubtotalRow = sheet1.addRow(["", "Итого монтажные работы:", "", "", "", worksTotal]);
      worksSubtotalRow.getCell(2).font = { name: "Arial", size: 10, bold: true };
      worksSubtotalRow.getCell(2).alignment = { horizontal: "right" };
      worksSubtotalRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
      worksSubtotalRow.getCell(6).numFmt = '#,##0 "₽"';
      worksSubtotalRow.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
    }

    if (calculation.discountAmount > 0 || calculation.vatAmount > 0) {
      const subtotalRow = sheet1.addRow(["", "Подитог без скидок:", "", "", "", calculation.subtotal]);
      subtotalRow.getCell(2).font = { name: "Arial", size: 10, italic: true };
      subtotalRow.getCell(2).alignment = { horizontal: "right" };
      subtotalRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
      subtotalRow.getCell(6).numFmt = '#,##0 "₽"';

      if (calculation.discountAmount > 0) {
        const discRow = sheet1.addRow(["", "Скидка клиенту:", "", "", "", -calculation.discountAmount]);
        discRow.getCell(2).font = { name: "Arial", size: 10, color: { argb: "FFDC2626" } };
        discRow.getCell(2).alignment = { horizontal: "right" };
        discRow.getCell(6).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFDC2626" } };
        discRow.getCell(6).numFmt = '-#,##0 "₽"';
      }

      if (calculation.vatAmount > 0 && data.vatType !== "none") {
        const vatLabel = data.vatType === "vat6" ? "НДС 6%:" : "НДС:";
        const vatRow = sheet1.addRow(["", vatLabel, "", "", "", calculation.vatAmount]);
        vatRow.getCell(2).font = { name: "Arial", size: 10, italic: true };
        vatRow.getCell(2).alignment = { horizontal: "right" };
        vatRow.getCell(6).font = { name: "Arial", size: 10, bold: true };
        vatRow.getCell(6).numFmt = '#,##0 "₽"';
      }
    }

    // Bold TOTAL Row
    const totalRow = sheet1.addRow(["", "ИТОГО К ОПЛАТЕ:", "", "", "", calculation.finalTotal]);
    totalRow.height = 32;

    sheet1.mergeCells(`B${totalRow.number}:E${totalRow.number}`);
    const totalLabelCell = totalRow.getCell(2);
    totalLabelCell.value = "ИТОГО К ОПЛАТЕ:";
    totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };
    totalLabelCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF1E3A8A" } };

    const totalValCell = totalRow.getCell(6);
    totalValCell.alignment = { horizontal: "right", vertical: "middle" };
    totalValCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
    totalValCell.numFmt = '#,##0 "₽"';

    totalRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF08A" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1E3A8A" } },
        bottom: { style: "double", color: { argb: "FF1E3A8A" } },
      };
    });

    // Footer note
    sheet1.addRow([]);
    const footerRowIdx = sheet1.rowCount + 1;
    sheet1.mergeCells(`A${footerRowIdx}:F${footerRowIdx}`);
    const footerCell = sheet1.getCell(`A${footerRowIdx}`);
    footerCell.value = `Гарантия на монтаж 12 месяцев | Исполнитель работ: Кокорин Антон Олегович +7(908)640-11-66 | ИП Сергеева М.В. | Сформировано: ${new Date().toLocaleString("ru-RU")}`;
    footerCell.font = { name: "Arial", size: 8, color: { argb: "FF64748B" }, italic: true };
    footerCell.alignment = { horizontal: "center", wrapText: true };

    // ==========================================
    // SHEET 2: Параметры - Fixed and professional
    // ==========================================
    const sheet2 = workbook.addWorksheet("Параметры", {
      views: [{ showGridLines: false }],
    });

    sheet2.columns = [{ width: 30 }, { width: 50 }];

    sheet2.mergeCells("A1:B1");
    const paramTitle = sheet2.getCell("A1");
    paramTitle.value = "ПАРАМЕТРЫ ЗАКАЗА И КЛИЕНТА - ДЕТАЛИЗАЦИЯ";
    paramTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    paramTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    paramTitle.alignment = { vertical: "middle", horizontal: "center" };
    sheet2.getRow(1).height = 28;

    sheet2.addRow([]);

    // Helper to ensure value is not empty
    const safeValue = (val: string | number | undefined, fallback: string = "Не указано") => {
      if (val === undefined || val === null || val === "" || (typeof val === "number" && val === 0 && fallback !== "0")) {
        return fallback;
      }
      return String(val);
    };

    const paramData = [
      ["ФИО Клиента", safeValue(data.clientName, "Частное лицо (не указано)")],
      ["Телефон клиента", safeValue(data.clientPhone, "Не указан")],
      ["Адрес монтажа", safeValue(data.clientAddress, "По согласованию с заказчиком")],
      ["Дата монтажа / составления", currentDate],
      ["", ""], // separator
      ["Модель кондиционера", safeValue(data.modelName, data.equipmentBrand ? `${data.equipmentBrand} Сплит-система` : "Не указана - введите вручную")],
      ["Бренд", safeValue(data.equipmentBrand, "Не указан")],
      ["Тип оборудования", safeValue(data.equipmentType, "Сплит-система")],
      ["Ссылка на оборудование", safeValue(data.equipmentUrl, "Не указана")],
      ["Цена оборудования", `${calculation.equipmentTotal.toLocaleString("ru-RU")} ₽`],
      ["", ""],
      ["Длина трассы (общая)", `${data.traceLength || 4} м`],
      ["  - в т.ч. в кабель-канале", `${calculation.cableChannelMeters || 0} м`],
      ["  - открытая трасса", `${Math.max(0, (data.traceLength || 4) - (calculation.cableChannelMeters || 0))} м`],
      ["Сложность монтажа", data.complexity === "complex" ? `Сложный (+${data.complexityHours || 0} час.)` : "Стандартный"],
      ["Кабель-канал", data.hasCableChannel ? `Да, ${calculation.cableChannelMeters} м → ${calculation.cableChannelPacks} упак. по 2 м = ${calculation.cableChannelPacks * 2} м, ${calculation.cableChannelCost.toLocaleString("ru-RU")} ₽` : "Нет (открытая трасса)"],
      ["Трасса свыше 5 м", calculation.extraTraceMeters > 0 ? `${calculation.extraTraceMeters} м × 2 100 ₽ = ${calculation.extraTraceCost.toLocaleString("ru-RU")} ₽` : "Нет, до 5 м включено"],
      ["Сложность доплата", calculation.complexityCost > 0 ? `${calculation.complexityCost.toLocaleString("ru-RU")} ₽` : "0 ₽"],
      ["", ""],
      ["Итого оборудование", `${calculation.equipmentTotal.toLocaleString("ru-RU")} ₽`],
      ["Итого монтажные работы", `${calculation.installationTotal.toLocaleString("ru-RU")} ₽`],
      ["СКИДКА", calculation.discountAmount > 0 ? `-${calculation.discountAmount.toLocaleString("ru-RU")} ₽` : "Нет"],
      ["НДС", calculation.vatAmount > 0 ? `+${calculation.vatAmount.toLocaleString("ru-RU")} ₽ (${data.vatType === "vat6" ? "6% УСН" : data.vatType})` : data.vatType === "none" ? "Без НДС" : "Нет"],
      ["ИТОГО К ОПЛАТЕ", `${calculation.finalTotal.toLocaleString("ru-RU")} ₽`],
      ["", ""],
      ["Исполнитель", "ИП Сергеева М.В., ИНН 381113658680, ОГРНИП 325385000065256"],
      ["Исполнитель работ", "Кокорин Антон Олегович, +7(908)640-11-66"],
      ["Банк", "ООО «Банк Точка», р/с 40802810720000687178, БИК 044525104"],
      ["Оплата на карту", "+7(999)420-11-19 Т-Банк (без налога)"],
      ["Примечания", safeValue(data.notes, "Стандартный монтаж, гарантия 12 месяцев")],
    ];

    paramData.forEach(([label, value], idx) => {
      if (label === "" && value === "") {
        const sepRow = sheet2.addRow(["", ""]);
        sepRow.height = 8;
        return;
      }
      const row = sheet2.addRow([label, value]);
      row.height = 22;
      
      const isHeader = !label.includes("  ") && label !== "" && !label.startsWith("Итого") && !label.startsWith("СКИДКА") && !label.startsWith("НДС") && !label.startsWith("ИТОГО") && label !== "Исполнитель" && label !== "Исполнитель работ" && label !== "Банк" && label !== "Оплата на карту";
      const isTotal = label.startsWith("ИТОГО К ОПЛАТЕ");
      
      row.getCell(1).font = { 
        name: "Arial", 
        size: isTotal ? 11 : 10, 
        bold: isTotal || label === "Исполнитель" || label === "Исполнитель работ" 
      };
      row.getCell(2).font = { 
        name: "Arial", 
        size: isTotal ? 11 : 10,
        bold: isTotal
      };
      
      if (isTotal) {
        row.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF08A" },
        };
        row.getCell(2).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF08A" },
        };
        row.getCell(1).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
        row.getCell(2).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
      }
      
      row.getCell(1).border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      row.getCell(2).border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
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
