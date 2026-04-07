import { sql } from 'drizzle-orm';
import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const deliveryTable = pgTable('module_granos_recepciones_deliveries', {
  id: uuid('id').primaryKey().notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'string' }).notNull(),
  producerId: text('producer_id'),
  driverId: text('driver_id'),
  estimatedKg: numeric('estimated_kg'),
  notes: text('notes'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type DeliveryRow = typeof deliveryTable.$inferSelect;
export type NewDeliveryRow = typeof deliveryTable.$inferInsert;
