import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }
    const { db } = await import("@/db");
    const { estimates } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

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
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }
    const { db } = await import("@/db");
    const { estimates } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { calculateEstimate } = await import("@/lib/calculator");

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
        cableChannelMeters: Number(body.cableChannelMeters) || calc.cableChannelMeters || 0,
        cableChannelPacks: calc.cableChannelPacks,
        equipmentsJson: JSON.stringify(body.equipments || []),
        otherExpensesJson: JSON.stringify(body.otherExpenses || []),
        maintenanceJson: JSON.stringify(body.maintenance || {}),
        contractType: body.contractType || "sale_installation",
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
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }
    const { db } = await import("@/db");
    const { estimates, auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const { id } = await context.params;
    const numId = parseInt(id, 10);

    // Get entity data before deleting for audit log
    const existing = await db.select().from(estimates).where(eq(estimates.id, numId)).limit(1);
    const entityData = existing.length > 0 ? existing[0] : null;

    await db.delete(estimates).where(eq(estimates.id, numId));

    // Log deletion to audit_logs
    try {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
      const userAgent = req.headers.get("user-agent") || "";
      const url = new URL(req.url);
      const performedBy = url.searchParams.get("adminId") || url.searchParams.get("performedBy") || "";

      await db.insert(auditLogs).values({
        action: "delete",
        entityType: "estimate",
        entityId: numId,
        entityDataJson: entityData ? JSON.stringify(entityData) : null,
        performedBy: performedBy || "unknown",
        ipAddress: ip,
        userAgent: userAgent,
        note: `Удалена смета #${numId}: ${entityData?.title || entityData?.modelName || ""}`,
      });
    } catch (logError) {
      console.error("Failed to log audit:", logError);
      // Don't fail main operation if logging fails
    }

    return NextResponse.json({ success: true, message: "Смета удалена" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
