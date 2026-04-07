import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { driverTable } from '../schema/driver.js';
import type { DriverRow, NewDriverRow } from '../schema/driver.js';

export class DriverRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<DriverRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(driverTable));
  }

  async getById({ id }: { id: string }): Promise<DriverRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(driverTable).where(eq(driverTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewDriverRow }): Promise<DriverRow[]> {
    return this.db.ormQuery((tx) => tx.insert(driverTable).values(data).returning());
  }

  async update({ id, data }: { id: string; data: Partial<NewDriverRow> }): Promise<DriverRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(driverTable).set(data).where(eq(driverTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(driverTable).where(eq(driverTable.id, id)));
  }
}
