import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accessCodes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(100);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    if (id) {
      await db.delete(accessCodes).where(eq(accessCodes.id, parseInt(id, 10)));
    } else if (code) {
      await db.delete(accessCodes).where(eq(accessCodes.code, code));
    } else {
      return NextResponse.json({ success: false, message: "id или code обязательны" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Код удалён" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
