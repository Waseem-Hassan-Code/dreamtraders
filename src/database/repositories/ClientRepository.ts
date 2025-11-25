import { Client, LedgerEntry, IClientRepository } from '@/types';
import database from '../index';
import { generateUUID } from '@/utils/idGenerator';

export class ClientRepository implements IClientRepository {
  async getAll(): Promise<Client[]> {
    const result = await database.execute(
      'SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY name',
    );
    return this.mapRows(result.rows?._array || []);
  }

  async getById(id: string): Promise<Client | null> {
    const result = await database.execute(
      'SELECT * FROM clients WHERE id = ?',
      [id],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getByPhone(phone: string): Promise<Client | null> {
    const result = await database.execute(
      'SELECT * FROM clients WHERE phone = ?',
      [phone],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getTopClients(limit: number): Promise<Client[]> {
    const result = await database.execute(
      'SELECT * FROM clients ORDER BY total_business_value DESC LIMIT ?',
      [limit],
    );
    return this.mapRows(result.rows?._array || []);
  }

  async create(
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Client> {
    const id = generateUUID();
    const now = Date.now();

    await database.execute(
      `INSERT INTO clients (
        id, name, phone, whatsapp, email, dob, shop_name, address, area, 
        balance, total_business_value, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.phone,
        data.whatsapp || null,
        data.email || null,
        data.dob ? data.dob.getTime() : null,
        data.shopName,
        data.address || null,
        data.area || null,
        data.balance,
        data.totalBusinessValue,
        now,
        now,
      ],
    );

    return {
      id,
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const now = Date.now();
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      whatsapp: 'whatsapp',
      email: 'email',
      dob: 'dob',
      shopName: 'shop_name',
      address: 'address',
      area: 'area',
      balance: 'balance',
      totalBusinessValue: 'total_business_value',
    };

    Object.entries(fieldMap).forEach(([key, column]) => {
      if (data[key as keyof Client] !== undefined) {
        updates.push(`${column} = ?`);
        let value = data[key as keyof Client];
        // Handle Date conversion for dob
        if (key === 'dob' && value instanceof Date) {
          value = value.getTime() as any;
        }
        params.push(value);
      }
    });

    if (updates.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Client not found');
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await database.execute(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Client not found after update');
    return updated;
  }

  async updateBalance(id: string, amount: number): Promise<void> {
    await database.execute(
      'UPDATE clients SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [amount, Date.now(), id],
    );
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete
    await database.execute(
      'UPDATE clients SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [Date.now(), Date.now(), id],
    );
    return true;
  }

  async getLedger(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LedgerEntry[]> {
    let sql = 'SELECT * FROM ledger_entries WHERE client_id = ?';
    const params: any[] = [clientId];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate.getTime());
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate.getTime());
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    const result = await database.execute(sql, params);
    const entries = result.rows?._array || [];

    // Load items for each entry
    return await Promise.all(
      entries.map(async (row: any) => {
        const items = await this.getLedgerItems(row.id);
        return {
          id: row.id,
          clientId: row.client_id,
          date: new Date(row.date),
          type: row.type,
          description: row.description,
          debit: row.debit,
          credit: row.credit,
          balance: row.balance,
          invoiceId: row.invoice_id,
          items,
          notes: row.notes,
          createdAt: new Date(row.created_at),
        };
      }),
    );
  }

  private async getLedgerItems(ledgerEntryId: string): Promise<any[]> {
    const result = await database.execute(
      'SELECT * FROM ledger_items WHERE ledger_entry_id = ?',
      [ledgerEntryId],
    );
    return (result.rows?._array || []).map((row: any) => ({
      stockItemId: row.stock_item_id,
      stockItemName: row.stock_item_name,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      total: row.total,
    }));
  }

  async addLedgerEntry(
    clientId: string,
    entry: Omit<LedgerEntry, 'id' | 'clientId' | 'balance' | 'createdAt'>,
  ): Promise<LedgerEntry> {
    const id = generateUUID();
    const now = Date.now();

    await database.transaction(async () => {
      // Get current balance
      const client = await this.getById(clientId);
      if (!client) throw new Error('Client not found');

      // Calculate new balance
      const newBalance = client.balance + entry.debit - entry.credit;

      // Insert ledger entry
      await database.execute(
        `INSERT INTO ledger_entries (
          id, client_id, date, type, description, debit, credit, balance,
          invoice_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientId,
          entry.date.getTime(),
          entry.type,
          entry.description,
          entry.debit,
          entry.credit,
          newBalance,
          entry.invoiceId || null,
          entry.notes || null,
          now,
        ],
      );

      // Insert ledger items if any
      if (entry.items && entry.items.length > 0) {
        for (const item of entry.items) {
          await database.execute(
            `INSERT INTO ledger_items (
              id, ledger_entry_id, stock_item_id, stock_item_name,
              quantity, unit_price, total
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              generateUUID(),
              id,
              item.stockItemId,
              item.stockItemName,
              item.quantity,
              item.unitPrice,
              item.total,
            ],
          );
        }
      }

      // Update client balance
      await database.execute(
        'UPDATE clients SET balance = ?, updated_at = ? WHERE id = ?',
        [newBalance, now, clientId],
      );

      // Update total business value if it's a sale
      if (entry.type === 'SALE') {
        await database.execute(
          'UPDATE clients SET total_business_value = total_business_value + ? WHERE id = ?',
          [entry.debit, clientId],
        );
      }
    });

    const created = await this.getLedger(clientId);
    return created[0];
  }

  private mapRow(row: any): Client {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      dob: row.dob ? new Date(row.dob) : undefined,
      shopName: row.shop_name,
      address: row.address,
      area: row.area,
      balance: row.balance,
      totalBusinessValue: row.total_business_value,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  private mapRows(rows: any[]): Client[] {
    return rows.map(row => this.mapRow(row));
  }
}
