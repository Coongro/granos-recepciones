import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const driverTable = pgTable('module_granos_recepciones_drivers', {
  id: uuid('id').primaryKey().notNull(),
  name: text('name').notNull(),
  documentNumber: text('document_number'),
  phone: text('phone'),
  type: text('type').notNull(),
  companyName: text('company_name'),
  truckPlate: text('truck_plate'),
  trailerPlate: text('trailer_plate'),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type DriverRow = typeof driverTable.$inferSelect;
export type NewDriverRow = typeof driverTable.$inferInsert;
