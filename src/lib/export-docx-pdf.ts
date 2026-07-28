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
          new Paragraph({ text: "3.2. Исполнитель обязуется выполнить Услуги, предусмотренные в п. 1.2. договора в следующие сроки: 10 рабочих дней с момента поступления денег на счет Исполнителя" }),
          new Paragraph({ text: "3.3. Факт выполнения Работ в полном объеме оформляется двусторонним Актом приемки выполненных работ." }),
          new Paragraph({ text: "3.4. В случае отсутствия письменного обоснованного отказа Заказчика от приемки Работ по Актам Исполнителя в течение 5 (Пяти) календарных дней с момента предоставления каждого акта, Работы считаются принятыми Заказчиком в полном объеме, в установленные сроки, с надлежащим качеством и Стороны претензий друг к другу не имеют." }),
          new Paragraph({ text: "3.5. Договор считается выполненным со стороны Исполнителя после оформления последней накладной на Оборудование и подписания Актов в соответствии с п. 3.3. или наступления условий, указанных в п. 3.4." }),
          new Paragraph({ text: "3.6. В случае возникновения необходимости, приобретение дополнительного Оборудования и выполнение Работ, не предусмотренных п.п.1.1 и 1.2., согласовываются и осуществляются Сторонами после подписания двухстороннего письменного соглашения." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "4. ПРАВА И ОБЯЗАННОСТИ СТОРОН", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "4.1. Заказчик обязуется: 4.1.1. Предоставить Исполнителю необходимую информацию. 4.1.2. Обеспечить свободный доступ. 4.1.3. Принять Работы по Акту. 4.1.4. До принятия Работ не использовать Оборудование для других целей. 4.1.5. Производить оплату. 4.1.6. Оплатить дополнительные Работы по доп. соглашению." }),
          new Paragraph({ text: "4.2. Заказчик имеет право: получать информацию, контролировать выполнение, требовать исправления недостатков." }),
          new Paragraph({ text: "4.3. Исполнитель обязуется: добросовестно оказывать Услуги, предоставлять информацию, информировать о неблагоприятных последствиях, требовать соблюдения правил ТБ, исправить недостатки за свой счет." }),
          new Paragraph({ text: "4.4. Исполнитель имеет право: запрашивать информацию, получать информацию от третьих лиц, приостановить Работы при нарушении, отказаться от Работ, требовать доплату за дополнительное Оборудование." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "5.1 Исполнитель гарантирует качество Работ. 5.2 Гарантия на кондиционер по гарантии завода-изготовителя. 5.3 Гарантия на Работы 12 месяцев. 5.4 Исполнитель не несет гарантийных обязательств при ненадлежащем использовании, механических повреждениях, модернизации Заказчиком. 5.5 Условие гарантии - техобслуживание персоналом Исполнителя за доп. плату." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "6. ОТВЕТСТВЕННОСТЬ СТОРОН", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "6.1 При нарушении сроков Заказчик вправе потребовать пени 0,1% за каждый день просрочки. 6.2 За нарушение сроков платежей Исполнитель вправе потребовать пени 0,1% и приостановить Работы. 6.3 Споры решаются в Арбитражном суде Иркутской области. 6.4 Стороны освобождаются от ответственности при обстоятельствах непреодолимой силы. 6.5-6.8 Уведомление о форс-мажоре в течение 10 дней, расторжение при продолжении более 30 дней, взаиморасчеты в течение 10 банковских дней." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "7. СРОК ДЕЙСТВИЯ ДОГОВОРА", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "7.1 Договор вступает в силу с момента подписания и действует до полного исполнения. 7.2 Односторонний отказ Заказчика не допускается. 7.3 Расторжение с уведомлением за 30 дней. 7.4 Сроки могут быть продлены по соглашению." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "8. ПРОЧИЕ УСЛОВИЯ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "8.1 Исполнитель вправе привлечь третьих лиц. 8.2 Вправе размещать информацию на объекте. 8.3 Заказчик обязан передать Оборудование после требования. 8.4 Конфиденциальность 5 лет. 8.5 Во всем остальном - законодательство РФ." }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "9. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "9.1 Договор в 2 экземплярах. 9.2 Предыдущие переговоры теряют силу. 9.3 Уведомление о смене реквизитов в 3 дня. 9.4 Юр. сила документов по факсу/email с оригиналами. 9.5 Приложения - неотъемлемая часть. 9.6 Изменения - в виде Доп. Соглашений." }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "10. КОНТАКТНЫЕ ЛИЦА",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "Исполнитель работ Чебанов Дмитрий Юрьевич т. +7(914) 914-66-06",
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

export async function exportElementToPdf(elementId: string, fileName: string = "document") {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Element not found");
  }

  const { default: html2canvas } = await import("html2canvas");
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export function exportEstimateToPdf(inputs: EstimateInputs, calculation: EstimateCalculationResult) {
  // For server-side fallback - now with Russian support via simple text (will be replaced by canvas method on client)
  const doc = new jsPDF();
  doc.setFontSize(12);
  
  // Try to use UTF-8 - jsPDF default doesn't support Cyrillic, so we use transliteration fallback for server
  // Client will use html2canvas method which supports Cyrillic via image
  doc.text("Smeta - rendered via canvas for Cyrillic support", 10, 10);
  doc.text(`Model: ${inputs.modelName || "Split-system"}`, 10, 20);
  doc.text(`Total: ${formatRuble(calculation.finalTotal)}`, 10, 30);
  
  return doc;
}

export function exportContractToPdf(contractData: any, inputs: EstimateInputs, calculation: EstimateCalculationResult) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text("Dogovor - rendered via canvas for Cyrillic support", 10, 10);
  doc.text(`N${contractData.contractNumber} ${contractData.contractDate}`, 10, 20);
  return doc;
}
