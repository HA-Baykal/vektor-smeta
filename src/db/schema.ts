import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  modelName: text("model_name").notNull(),
  equipmentPrice: integer("equipment_price").notNull().default(0),
  equipmentBrand: text("equipment_brand").default(""),
  equipmentType: text("equipment_type").default("Сплит-система"),
  equipmentUrl: text("equipment_url").default(""),
  traceLength: integer("trace_length").notNull().default(4),
  complexity: text("complexity").notNull().default("standard"), // 'standard' | 'complex'
  complexityHours: integer("complexity_hours").notNull().default(0),
  hasCableChannel: boolean("has_cable_channel").notNull().default(false),
  cableChannelMeters: integer("cable_channel_meters").notNull().default(0),
  cableChannelPacks: integer("cable_channel_packs").notNull().default(0),
  equipmentsJson: text("equipments_json").default("[]"),
  otherExpensesJson: text("other_expenses_json").default("[]"),
  maintenanceJson: text("maintenance_json").default("{}"),
  contractType: text("contract_type").default("sale_installation"),
  additionalItemsJson: text("additional_items_json").default("[]"),
  discountType: text("discount_type").default("none"), // 'none' | 'percent' | 'fixed'
  discountValue: integer("discount_value").default(0),
  vatType: text("vat_type").default("none"), // 'none' | 'vat6'
  clientName: text("client_name").default(""),
  clientPhone: text("client_phone").default(""),
  clientAddress: text("client_address").default(""),
  installationDate: text("installation_date").default(""),
  notes: text("notes").default(""),
  totalAmount: integer("total_amount").notNull().default(0),
  status: text("status").notNull().default("draft"), // 'draft' | 'sent' | 'approved' | 'completed'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  isUsed: boolean("is_used").notNull().default(false),
  deviceFingerprint: text("device_fingerprint"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdByTelegramId: text("created_by_telegram_id"),
  createdByTelegramUsername: text("created_by_telegram_username"),
  note: text("note").default(""),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityDataJson: text("entity_data_json"),
  performedBy: text("performed_by"),
  performedByTelegramId: text("performed_by_telegram_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  note: text("note").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Estimate = typeof estimates.$inferSelect;
export type NewEstimate = typeof estimates.$inferInsert;
export type AccessCode = typeof accessCodes.$inferSelect;
export type NewAccessCode = typeof accessCodes.$inferInsert;
