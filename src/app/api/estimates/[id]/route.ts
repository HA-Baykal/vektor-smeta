import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateEstimate } from "@/lib/calculator";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, message: "Неверный ID" }, { status: 400 });
    }

    const item = await db.select().from(estimates).where(eq(estimates.id, numId)).limit(1);
    if (!item.length) {
      return NextResponse.json({ success: false, message: "Смета не найдена" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numId = parseInt(id, 10);
    const body = await req.json();

    const calc = calculateEstimate(body);
    const totalAmount = calc.finalTotal;

    const updated = await db
      .update(estimates)
      .set({
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
        cableChannelPacks: calc.cableChannelPacks,
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
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, numId))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numId = parseInt(id, 10);
    await db.delete(estimates).where(eq(estimates.id, numId));
    return NextResponse.json({ success: true, message: "Смета удалена" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
