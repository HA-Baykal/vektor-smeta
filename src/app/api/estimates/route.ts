import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, data: [] });
    }
    const { db } = await import("@/db");
    const { estimates } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const list = await db.select().from(estimates).orderBy(desc(estimates.createdAt));
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, message: "DATABASE_URL не настроен" },
        { status: 500 }
      );
    }
    const { db } = await import("@/db");
    const { estimates } = await import("@/db/schema");
    const { calculateEstimate } = await import("@/lib/calculator");

    const body = await req.json();

    const calc = calculateEstimate(body);
    const totalAmount = calc.finalTotal;

    const inserted = await db
      .insert(estimates)
      .values({
        title: body.title || `Смета: ${body.modelName || "Монтаж кондиционера"}`,
        modelName: body.modelName || "Кондиционер",
        equipmentPrice: Number(body.equipmentPrice) || 0,
        equipmentBrand: body.equipmentBrand || "",
        equipmentType: body.equipmentType || "Сплит-система",
        equipmentUrl: body.equipmentUrl || "",
        traceLength: Number(body.traceLength) || 4,
        complexity: body.complexity === "complex" ? "complex" : "standard",
        complexityHours: Number(body.complexityHours) || 0,
        hasCableChannel: Boolean(body.hasCableChannel),
        cableChannelMeters: Number(body.cableChannelMeters) || calc.cableChannelMeters || 0,
        cableChannelPacks: calc.cableChannelPacks,
        equipmentsJson: JSON.stringify(body.equipments || []),
        additionalItemsJson: JSON.stringify(body.additionalItems || []),
        discountType: body.discountType || "none",
        discountValue: Number(body.discountValue) || 0,
        vatType: body.vatType || "none",
        clientName: body.clientName || "",
        clientPhone: body.clientPhone || "",
        clientAddress: body.clientAddress || "",
        installationDate: body.installationDate || "",
        notes: body.notes || "",
        totalAmount,
        status: body.status || "draft",
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
