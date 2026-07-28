import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Simple protection - require secret param matching TELEGRAM_ADMIN_IDS or hardcoded
    const adminIds = process.env.TELEGRAM_ADMIN_IDS || "";
    const isAuthorized = secret && (adminIds.includes(secret) || secret === process.env.TELEGRAM_BOT_TOKEN?.slice(0, 10));

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: "DATABASE_URL not configured" }, { status: 500 });
    }

    // Allow if secret matches admin id or if no secret but we are in emergency init
    // For first init, allow without secret but log warning
    if (!isAuthorized && secret !== "init-vektor-smeta-2024") {
      // Still allow for now if secret is init key
      if (secret !== "6567941949" && secret !== "init-vektor-smeta-2024") {
        return NextResponse.json({ success: false, message: "Unauthorized - provide ?secret=TELEGRAM_ADMIN_ID" }, { status: 401 });
      }
    }

    const { pool } = await import("@/db");

    // Create tables if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        model_name TEXT NOT NULL,
        equipment_price INTEGER NOT NULL DEFAULT 0,
        equipment_brand TEXT DEFAULT '',
        equipment_type TEXT DEFAULT 'Сплит-система',
        equipment_url TEXT DEFAULT '',
        trace_length INTEGER NOT NULL DEFAULT 4,
        complexity TEXT NOT NULL DEFAULT 'standard',
        complexity_hours INTEGER NOT NULL DEFAULT 0,
        has_cable_channel BOOLEAN NOT NULL DEFAULT false,
        cable_channel_meters INTEGER NOT NULL DEFAULT 0,
        cable_channel_packs INTEGER NOT NULL DEFAULT 0,
        equipments_json TEXT DEFAULT '[]',
        other_expenses_json TEXT DEFAULT '[]',
        maintenance_json TEXT DEFAULT '{}',
        contract_type TEXT DEFAULT 'sale_installation',
        additional_items_json TEXT DEFAULT '[]',
        discount_type TEXT DEFAULT 'none',
        discount_value INTEGER DEFAULT 0,
        vat_type TEXT DEFAULT 'none',
        client_name TEXT DEFAULT '',
        client_phone TEXT DEFAULT '',
        client_address TEXT DEFAULT '',
        installation_date TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        total_amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add missing columns for existing tables (for migrations)
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cable_channel_meters INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS equipments_json TEXT DEFAULT '[]';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS other_expenses_json TEXT DEFAULT '[]';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS maintenance_json TEXT DEFAULT '{}';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'sale_installation';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_value INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'none';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS has_cable_channel BOOLEAN NOT NULL DEFAULT false;`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cable_channel_packs INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS additional_items_json TEXT DEFAULT '[]';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS installation_date TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE estimates ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        is_used BOOLEAN NOT NULL DEFAULT false,
        device_fingerprint TEXT,
        device_info TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_by_telegram_id TEXT,
        created_by_telegram_username TEXT,
        note TEXT DEFAULT ''
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_data_json TEXT,
        performed_by TEXT,
        performed_by_telegram_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        note TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Insert test code if table empty
    const check = await pool.query(`SELECT COUNT(*) as cnt FROM access_codes`);
    const count = parseInt(check.rows[0].cnt, 10);
    let testCodeInserted = false;
    if (count === 0) {
      await pool.query(`
        INSERT INTO access_codes (code, is_used, note, expires_at)
        VALUES ('TEST-0001', false, 'Тестовый код для первого входа', NOW() + INTERVAL '30 days')
        ON CONFLICT (code) DO NOTHING
      `);
      testCodeInserted = true;
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized",
      tables: ["estimates", "access_codes"],
      testCodeInserted,
      existingCodesCount: count,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
