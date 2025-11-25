import { Expense, ExpenseCategory, IExpenseRepository } from '@/types';
import database from '../index';
import { generateUUID } from '@/utils/idGenerator';

export class ExpenseRepository implements IExpenseRepository {
  async getAll(): Promise<Expense[]> {
    const result = await database.execute(
      'SELECT * FROM expenses ORDER BY date DESC',
    );
    return await this.mapRowsWithCategory(result.rows?._array || []);
  }

  async getById(id: string): Promise<Expense | null> {
    const result = await database.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [id],
    );
    const rows = result.rows?._array || [];
    if (rows.length === 0) return null;
    const expenses = await this.mapRowsWithCategory([rows[0]]);
    return expenses[0] || null;
  }

  async getByCategoryId(categoryId: string): Promise<Expense[]> {
    const result = await database.execute(
      'SELECT * FROM expenses WHERE category_id = ? ORDER BY date DESC',
      [categoryId],
    );
    return await this.mapRowsWithCategory(result.rows?._array || []);
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const result = await database.execute(
      'SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [startDate.getTime(), endDate.getTime()],
    );
    return await this.mapRowsWithCategory(result.rows?._array || []);
  }

  async getTotalByPeriod(startDate: Date, endDate: Date): Promise<number> {
    const result = await database.execute(
      'SELECT SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ?',
      [startDate.getTime(), endDate.getTime()],
    );
    return result.rows?._array[0]?.total || 0;
  }

  async create(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const id = generateUUID();
    const now = Date.now();

    await database.execute(
      `INSERT INTO expenses (
        id, category_id, amount, description, date, is_recurring,
        recurring_frequency, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.category.id,
        data.amount,
        data.description,
        data.date.getTime(),
        data.isRecurring ? 1 : 0,
        data.recurringFrequency || null,
        data.notes || null,
        now,
      ],
    );

    const created = await this.getById(id);
    if (!created) throw new Error('Expense not found after creation');
    return created;
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.amount !== undefined) {
      updates.push('amount = ?');
      params.push(data.amount);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date.getTime());
    }
    if (data.isRecurring !== undefined) {
      updates.push('is_recurring = ?');
      params.push(data.isRecurring ? 1 : 0);
    }
    if (data.recurringFrequency !== undefined) {
      updates.push('recurring_frequency = ?');
      params.push(data.recurringFrequency);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    if (updates.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Expense not found');
      return existing;
    }

    params.push(id);

    await database.execute(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Expense not found after update');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await database.execute('DELETE FROM expenses WHERE id = ?', [id]);
    return true;
  }

  async getCategories(): Promise<ExpenseCategory[]> {
    const result = await database.execute(
      'SELECT * FROM expense_categories ORDER BY name',
    );
    return (result.rows?._array || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
    }));
  }

  private async getCategory(categoryId: string): Promise<ExpenseCategory> {
    const result = await database.execute(
      'SELECT * FROM expense_categories WHERE id = ?',
      [categoryId],
    );
    const row = result.rows?._array[0];
    if (!row) throw new Error('Category not found');
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
    };
  }

  private async mapRowsWithCategory(rows: any[]): Promise<Expense[]> {
    return await Promise.all(
      rows.map(async (row: any) => {
        const category = await this.getCategory(row.category_id);
        return {
          id: row.id,
          categoryId: row.category_id,
          category,
          amount: row.amount,
          description: row.description,
          date: new Date(row.date),
          isRecurring: row.is_recurring === 1,
          recurringFrequency: row.recurring_frequency,
          notes: row.notes,
          createdAt: new Date(row.created_at),
        };
      }),
    );
  }
}
