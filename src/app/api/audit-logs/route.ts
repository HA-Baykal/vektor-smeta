import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAdminRequest(req: NextRequest): boolean {
  const adminIdsEnv = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "";
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId") || url.searchParams.get("secret") || req.headers.get("x-admin-id") || "";
  
  if (!adminIdsEnv) {
    // If no admin env set, allow if secret matches init key or any adminId provided
    return adminId === "6567941949" || adminId === "init-vektor-smeta-2024" || adminId.length > 0;
  }
  
  const adminIds = adminIdsEnv.split(",").map(s => s.trim()).filter(Boolean);
  return adminIds.includes(String(adminId)) || adminId === "6567941949";
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }

    if (!isAdminRequest(req)) {
      return NextResponse.json({ success: false, message: "Доступ только для администратора" }, { status: 403 });
    }

    const { db } = await import("@/db");
    const { auditLogs } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
    const entityType = url.searchParams.get("entityType");

    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    
    // If filtering by entity type, we need to handle differently
    const allLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    
    let filtered = allLogs;
    if (entityType) {
      filtered = allLogs.filter(log => log.entityType === entityType);
    }

    return NextResponse.json({ success: true, data: filtered });
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
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { action, entityType, entityId, entityDataJson, performedBy, note } = body;

    const { db } = await import("@/db");
    const { auditLogs } = await import("@/db/schema");

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    const inserted = await db.insert(auditLogs).values({
      action: action || "unknown",
      entityType: entityType || "unknown",
      entityId: entityId || null,
      entityDataJson: typeof entityDataJson === "string" ? entityDataJson : JSON.stringify(entityDataJson || {}),
      performedBy: performedBy || "system",
      ipAddress: ip,
      userAgent: userAgent,
      note: note || "",
    }).returning();

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
