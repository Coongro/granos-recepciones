import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { deliveryTable } from '../schema/delivery.js';
import type { DeliveryRow, NewDeliveryRow } from '../schema/delivery.js';

export class DeliveryRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<DeliveryRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(deliveryTable));
  }

  async getById({ id }: { id: string }): Promise<DeliveryRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(deliveryTable).where(eq(deliveryTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewDeliveryRow }): Promise<DeliveryRow[]> {
    return this.db.ormQuery((tx) => tx.insert(deliveryTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewDeliveryRow>;
  }): Promise<DeliveryRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(deliveryTable).set(data).where(eq(deliveryTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(deliveryTable).where(eq(deliveryTable.id, id)));
  }
}
