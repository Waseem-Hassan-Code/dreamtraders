import { Invoice, IInvoiceRepository, Client, SaleItem } from '@/types';
import database from '../index';
import { generateUUID, generateInvoiceNumber } from '@/utils/idGenerator';
import { clientRepository } from './ClientRepository';
import { stockRepository } from './StockRepository';

export class InvoiceRepository implements IInvoiceRepository {
  async getAll(): Promise<Invoice[]> {
    const result = await database.execute(
      'SELECT * FROM invoices ORDER BY created_at DESC',
    );
    return await this.mapRowsWithDetails(result.rows?._array || []);
  }

  async getById(id: string): Promise<Invoice | null> {
    const result = await database.execute(
      'SELECT * FROM invoices WHERE id = ?',
      [id],
    );
    const rows = result.rows?._array || [];
    if (rows.length === 0) return null;
    const invoices = await this.mapRowsWithDetails([rows[0]]);
    return invoices[0] || null;
  }

  async getByClientId(clientId: string): Promise<Invoice[]> {
    const result = await database.execute(
      'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
      [clientId],
    );
    return await this.mapRowsWithDetails(result.rows?._array || []);
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    const result = await database.execute(
      'SELECT * FROM invoices WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
      [startDate.getTime(), endDate.getTime()],
    );
    return await this.mapRowsWithDetails(result.rows?._array || []);
  }

  async getByStatus(status: Invoice['status']): Promise<Invoice[]> {
    const result = await database.execute(
      'SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC',
      [status],
    );
    return await this.mapRowsWithDetails(result.rows?._array || []);
  }

  async getUnpaidByClientId(clientId: string): Promise<Invoice[]> {
    const result = await database.execute(
      `SELECT * FROM invoices 
       WHERE client_id = ? AND status IN ('UNPAID', 'PARTIAL') 
       ORDER BY created_at ASC`,
      [clientId],
    );
    return await this.mapRowsWithDetails(result.rows?._array || []);
  }

  async generateInvoiceNumber(): Promise<string> {
    return generateInvoiceNumber();
  }

  async create(
    data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Invoice> {
    const id = generateUUID();
    const now = Date.now();

    await database.transaction(async () => {
      // Insert invoice
      await database.execute(
        `INSERT INTO invoices (
          id, invoice_number, client_id, subtotal, discount, tax, total,
          amount_paid, amount_due, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.invoiceNumber,
          data.client.id,
          data.subtotal,
          data.discount,
          data.tax,
          data.total,
          data.amountPaid,
          data.amountDue,
          data.status,
          data.notes || null,
          now,
          now,
        ],
      );

      // Insert invoice items and deduct stock
      for (const item of data.items) {
        await database.execute(
          `INSERT INTO invoice_items (
            id, invoice_id, stock_item_id, stock_item_name,
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

        // Deduct stock quantity
        await stockRepository.updateQuantity(item.stockItemId, -item.quantity, {
          type: 'OUT',
          reason: `Sold via Invoice #${data.invoiceNumber}`,
          referenceId: id,
        });
      }

      // Update client balance (debit = amount due from this invoice)
      if (data.amountDue > 0) {
        await clientRepository.updateBalance(data.client.id, data.amountDue);

        // Add ledger entry for the sale
        await database.execute(
          `INSERT INTO client_ledger (
            id, client_id, date, type, description, debit, credit, balance, invoice_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            data.client.id,
            now,
            'SALE',
            `Invoice #${data.invoiceNumber}`,
            data.total,
            data.amountPaid,
            0, // Will be recalculated when fetched
            id,
            now,
          ],
        );
      }
    });

    const created = await this.getById(id);
    if (!created) throw new Error('Invoice not found after creation');
    return created;
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const now = Date.now();
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      subtotal: 'subtotal',
      discount: 'discount',
      tax: 'tax',
      total: 'total',
      amountPaid: 'amount_paid',
      amountDue: 'amount_due',
      status: 'status',
      notes: 'notes',
    };

    Object.entries(fieldMap).forEach(([key, column]) => {
      if (data[key as keyof Invoice] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(data[key as keyof Invoice]);
      }
    });

    if (updates.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Invoice not found');
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await database.execute(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Invoice not found after update');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await database.execute('DELETE FROM invoices WHERE id = ?', [id]);
    return true;
  }

  private async getInvoiceItems(invoiceId: string): Promise<SaleItem[]> {
    const result = await database.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId],
    );
    return (result.rows?._array || []).map((row: any) => ({
      stockItemId: row.stock_item_id,
      stockItemName: row.stock_item_name,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      total: row.total,
    }));
  }

  private async getClient(clientId: string): Promise<Client> {
    const result = await database.execute(
      'SELECT * FROM clients WHERE id = ?',
      [clientId],
    );
    const row = result.rows?._array[0];
    if (!row) throw new Error('Client not found');
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      shopName: row.shop_name,
      address: row.address,
      area: row.area,
      balance: row.balance,
      totalBusinessValue: row.total_business_value,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private async mapRowsWithDetails(rows: any[]): Promise<Invoice[]> {
    return await Promise.all(
      rows.map(async (row: any) => {
        const items = await this.getInvoiceItems(row.id);
        const client = await this.getClient(row.client_id);
        return {
          id: row.id,
          invoiceNumber: row.invoice_number,
          clientId: row.client_id,
          client,
          items,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          total: row.total,
          amountPaid: row.amount_paid,
          amountDue: row.amount_due,
          status: row.status,
          notes: row.notes,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      }),
    );
  }
}
