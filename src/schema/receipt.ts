import { sql } from 'drizzle-orm';
import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const receiptTable = pgTable('module_granos_recepciones_receipts', {
  id: uuid('id').primaryKey().notNull(),
  receiptNumber: text('receipt_number').notNull(),
  ctgNumber: text('ctg_number'),
  producerId: text('producer_id').notNull(),
  driverId: text('driver_id'),
  transportCompany: text('transport_company'),
  receptionDate: timestamp('reception_date', { mode: 'string' }).notNull(),
  grainType: text('grain_type').notNull(),
  harvest: text('harvest'),
  pricePerTon: numeric('price_per_ton'),
  status: text('status').notNull(),
  grossKg: numeric('gross_kg').notNull(),
  taraKg: numeric('tara_kg').notNull(),
  netWithoutCleaningKg: numeric('net_without_cleaning_kg'),
  precleaningKg: numeric('precleaning_kg'),
  netKg: numeric('net_kg'),
  shrinkageKg: numeric('shrinkage_kg'),
  finalNetKg: numeric('final_net_kg'),
  humidityPercent: numeric('humidity_percent'),
  // Gramos de muestra (entrada del usuario)
  foreignMatterGr: numeric('foreign_matter_gr'),
  dirtGr: numeric('dirt_gr'),
  shellGr: numeric('shell_gr'),
  damagedGrainGr: numeric('damaged_grain_gr'),
  looseGrainGr: numeric('loose_grain_gr'),
  aptGrainGr: numeric('apt_grain_gr'),
  sampleTotalGr: numeric('sample_total_gr'),
  // Porcentajes calculados desde gramos
  dirtPercent: numeric('dirt_percent'),
  stickPercent: numeric('stick_percent'),
  boxPercent: numeric('box_percent'),
  aptPercent: numeric('apt_percent'),
  loosePercent: numeric('loose_percent'),
  boxGrainPercent: numeric('box_grain_percent'),
  // Kilos calculados
  industryKg: numeric('industry_kg'),
  confectioneryKg: numeric('confectionery_kg'),
  zarandaSize: numeric('zaranda_size'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type ReceiptRow = typeof receiptTable.$inferSelect;
export type NewReceiptRow = typeof receiptTable.$inferInsert;
