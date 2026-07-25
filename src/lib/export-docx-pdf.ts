import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";
import jsPDF from "jspdf";
import { EstimateInputs, EstimateCalculationResult, formatRuble } from "./calculator";
import { formatRublesInWords } from "./numberToWords";

export async function exportEstimateToDocx(inputs: EstimateInputs, calculation: EstimateCalculationResult) {
  const currentDate = inputs.installationDate || new Date().toLocaleDateString("ru-RU");

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Наименование", bold: true })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Кол-во", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ед.", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Цена за ед.", bold: true })], alignment: AlignmentType.RIGHT })], width: { size: 17, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Сумма", bold: true })], alignment: AlignmentType.RIGHT })], width: { size: 18, type: WidthType.PERCENTAGE } }),
      ],
    }),
    ...calculation.items.map((item, idx) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.name })] }),
          new TableCell({ children: [new Paragraph({ text: String(item.quantity), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.unit, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: formatRuble(item.pricePerUnit), alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ text: formatRuble(item.total), alignment: AlignmentType.RIGHT })] }),
        ],
      })
    ),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "" })], columnSpan: 5 }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `ИТОГО: ${formatRuble(calculation.finalTotal)}`, bold: true })], alignment: AlignmentType.RIGHT })] }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `СМЕТА НА МОНТАЖ КОНДИЦИОНЕРА`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Оборудование: ${inputs.modelName || "Сплит-система"} | Дата: ${currentDate}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: `Длина трассы: ${inputs.traceLength || 4} м | ` }),
              new TextRun({ text: `Сложность: ${inputs.complexity === "complex" ? `Сложный (+${inputs.complexityHours}ч)` : "Стандартный"} | ` }),
              new TextRun({ text: `Кабель-канал: ${calculation.cableChannelMeters > 0 ? `${calculation.cableChannelMeters} м (${calculation.cableChannelPacks} упак.)` : "Нет"}` }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: `Итого к оплате: ${formatRuble(calculation.finalTotal)}`,
            heading: HeadingLevel.HEADING_2,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

export async function exportContractToDocx(
  inputs: EstimateInputs,
  calculation: EstimateCalculationResult,
  contractData: {
    contractNumber: string;
    contractDate: string;
    customerName: string;
    customerAddress: string;
    equipmentCost: number;
    consumablesCost: number;
    prepayment: number;
    finalPayment: number;
    total: number;
  }
) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `ДОГОВОР НА МОНТАЖНЫЕ РАБОТЫ №${contractData.contractNumber}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: contractData.contractDate,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Индивидуальный предприниматель Сергеева Мария Владимировна, именуемый в дальнейшем «Исполнитель», с одной стороны, и " }),
              new TextRun({ text: contractData.customerName || "________________________________________", bold: true }),
              new TextRun({ text: ", именуемый в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. ПРЕДМЕТ ДОГОВОРА",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `1.1. Исполнитель обязуется оказать услуги по поставке и монтажу ${inputs.modelName || "Сплит-система"} (далее «Услуги/Работы»), а Заказчик обязуется принять и оплатить.`,
          }),
          new Paragraph({
            text: `1.2. Место оказания Услуг: ${contractData.customerAddress || "г. Иркутск, ул. Советская, д. 176/187, кв________"}`,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `2.1. Общая стоимость Договора составляет ${formatRuble(contractData.total)} (${formatRublesInWords(contractData.total)}).`,
          }),
          new Paragraph({
            text: `2.2. Заказчик вносит предоплату 100% от стоимости кондиционера и расходных материалов в размере ${formatRuble(contractData.prepayment)} (${formatRublesInWords(contractData.prepayment)}) в течение 3 рабочих дней с момента заключения Договора путем перечисления денежных средств по номеру телефона Исполнителя +7-999-420-11-19, Т-Банк (в т.ч. кондиционер ${formatRuble(contractData.equipmentCost)} + расходники ${formatRuble(contractData.consumablesCost)}).`,
          }),
          new Paragraph({
            text: `2.3. Заказчик производит окончательный расчет в размере ${formatRuble(contractData.finalPayment)} (${formatRublesInWords(contractData.finalPayment)}) в течение 3 рабочих дней с момента приемки результата Работ и подписания Акта приемки выполненных работ.`,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "3. СРОКИ И УСЛОВИЯ ВЫПОЛНЕНИЯ РАБОТ",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "3.2. Исполнитель обязуется выполнить Услуги в течение 10 рабочих дней с момента поступления денег на счет Исполнителя. 3.3. Факт выполнения Работ оформляется Актом приемки.",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "10. КОНТАКТНЫЕ ЛИЦА",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "Исполнитель работ Кокорин Антон Олегович т. +7 9086401166",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "11. ЮРИДИЧЕСКИЕ АДРЕСА И РЕКВИЗИТЫ",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "Исполнитель: ИП Сергеева М.В, ИНН: 381113658680, ОГРН/ОГРНИП: 325385000065256, Банк ООО «Банк Точка», р/сч: 40802810720000687178, к/сч: 30101810745374525104, БИК: 044525104, ИНН банка: 9721194461, Юр. адрес: 109044, г. Москва, пер. 3-й Крутицкий, д.11, помещ. 7Н",
          }),
          new Paragraph({
            text: `Заказчик: ${contractData.customerName || "__________________"}, Адрес: ${contractData.customerAddress || "__________________"}`,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

export function exportEstimateToPdf(inputs: EstimateInputs, calculation: EstimateCalculationResult) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text("SMETA NA MONTAZH KONDITSIONERA", 105, 15, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Oborudovanie: ${inputs.modelName || "Split-sistema"} | Data: ${inputs.installationDate || new Date().toLocaleDateString("ru-RU")}`, 105, 22, { align: "center" });

  // Table header
  let y = 30;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("N", 10, y);
  doc.text("Naimenovanie", 20, y);
  doc.text("Kol-vo", 100, y);
  doc.text("Ed.", 120, y);
  doc.text("Tsena", 135, y);
  doc.text("Summa", 170, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  calculation.items.forEach((item, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(idx + 1), 10, y);
    // Truncate name if too long
    const name = item.name.length > 40 ? item.name.slice(0, 40) + "..." : item.name;
    doc.text(name, 20, y);
    doc.text(String(item.quantity), 100, y);
    doc.text(item.unit, 120, y);
    doc.text(String(item.pricePerUnit), 135, y);
    doc.text(String(item.total), 170, y);
    y += 6;
  });

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`ITOGO: ${formatRuble(calculation.finalTotal)}`, 170, y, { align: "right" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Trassa: ${inputs.traceLength}m | Slozhnost: ${inputs.complexity} | Kabel-kanal: ${calculation.cableChannelMeters}m`, 10, y);

  return doc;
}

export function exportContractToPdf(contractData: any, inputs: EstimateInputs, calculation: EstimateCalculationResult) {
  const doc = new jsPDF();
  
  doc.setFontSize(14);
  doc.text(`DOGOVOR NA MONTAZHNYE RABOTY N${contractData.contractNumber}`, 105, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(contractData.contractDate, 180, 22, { align: "right" });

  let y = 30;
  doc.setFontSize(9);
  
  const text = `IP Sergeeva M.V., imenuemiy Ispolnitel, i ${contractData.customerName || "________________"}, imenuemiy Zakazchik, zaklyuchili dogovor.

1. PREDMET DOGOVORA
1.1. Ispolnitel obyazuetsya okazat uslugi po postavke i montazhu ${inputs.modelName || "Split-sistema"}.
1.2. Mesto okazaniya uslug: ${contractData.customerAddress || "g. Irkutsk"}.

2. STOIMOST I PORYADOK RASCHETOV
2.1. Obshaya stoimost: ${formatRuble(contractData.total)} (${formatRublesInWords(contractData.total)}).
2.2. Predoplata 100% konditsionera i rashodnikov: ${formatRuble(contractData.prepayment)} (${formatRublesInWords(contractData.prepayment)}) v techenie 3 dney po telefonu +7-999-420-11-19, T-Bank.
2.3. Okonchatelny raschet: ${formatRuble(contractData.finalPayment)} (${formatRublesInWords(contractData.finalPayment)}) v techenie 3 dney posle priemki rabot.

10. KONTAKTNYE LITSA
Ispolnitel rabot Kokorin Anton Olegovich t. +7 9086401166

11. REKVIZITY
Ispolnitel: IP Sergeeva M.V., INN 381113658680, OGRNIP 325385000065256, Bank Tochka r/s 40802810720000687178`;

  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 15, y);

  return doc;
}
