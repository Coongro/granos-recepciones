import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { receiptTable } from '../schema/receipt.js';
import type { ReceiptRow, NewReceiptRow } from '../schema/receipt.js';

export class ReceiptRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<ReceiptRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(receiptTable));
  }

  async getById({ id }: { id: string }): Promise<ReceiptRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(receiptTable).where(eq(receiptTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewReceiptRow }): Promise<ReceiptRow[]> {
    return this.db.ormQuery((tx) => tx.insert(receiptTable).values(data).returning());
  }

  async update({ id, data }: { id: string; data: Partial<NewReceiptRow> }): Promise<ReceiptRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(receiptTable).set(data).where(eq(receiptTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(receiptTable).where(eq(receiptTable.id, id)));
  }
}
