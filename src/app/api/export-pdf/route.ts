import { NextRequest, NextResponse } from "next/server";
import { calculateEstimate, EstimateInputs } from "@/lib/calculator";
import { exportEstimateToPdf, exportContractToPdf } from "@/lib/export-docx-pdf";

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

      const doc = exportContractToPdf(finalContractData, data, calculation);
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

      const doc = exportEstimateToPdf(data, calculation);
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
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
