import { Category, ICategoryRepository } from '@/types';
import database from '../index';
import { generateUUID } from '@/utils/idGenerator';

export class CategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    const result = await database.execute(
      'SELECT * FROM categories ORDER BY level, name',
    );
    return this.mapRows(result.rows?._array || []);
  }

  async getById(id: string): Promise<Category | null> {
    const result = await database.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getByParentId(parentId: string | null): Promise<Category[]> {
    const sql = parentId
      ? 'SELECT * FROM categories WHERE parent_id = ? ORDER BY name'
      : 'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name';
    const params = parentId ? [parentId] : [];
    const result = await database.execute(sql, params);
    return this.mapRows(result.rows?._array || []);
  }

  async getFullPath(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.getById(currentId);
      if (!category) break;
      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  async hasChildren(categoryId: string): Promise<boolean> {
    const result = await database.execute(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [categoryId],
    );
    const count = result.rows?._array[0]?.count || 0;
    return count > 0;
  }

  async create(
    data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category> {
    const id = generateUUID();
    const now = Date.now();

    await database.execute(
      `INSERT INTO categories (id, name, parent_id, level, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.parentId, data.level, now, now],
    );

    return {
      id,
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const now = Date.now();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(data.parentId);
    }
    if (data.level !== undefined) {
      updates.push('level = ?');
      params.push(data.level);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await database.execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Category not found after update');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    // Check if has children
    const hasChildren = await this.hasChildren(id);
    if (hasChildren) {
      throw new Error('Cannot delete category with subcategories');
    }

    // Check if has stock items
    const stockCheck = await database.execute(
      'SELECT COUNT(*) as count FROM stock_items WHERE category_id = ?',
      [id],
    );
    const stockCount = stockCheck.rows?._array[0]?.count || 0;
    if (stockCount > 0) {
      throw new Error('Cannot delete category with stock items');
    }

    await database.execute('DELETE FROM categories WHERE id = ?', [id]);
    return true;
  }

  private mapRow(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      level: row.level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRows(rows: any[]): Category[] {
    return rows.map(row => this.mapRow(row));
  }
}
