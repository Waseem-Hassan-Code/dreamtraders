import {
  StockItem,
  StockMovement,
  LowStockAlert,
  IStockRepository,
} from '@/types';
import database from '../index';
import { generateUUID } from '@/utils/idGenerator';

export class StockRepository implements IStockRepository {
  async getAll(): Promise<StockItem[]> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE deleted_at IS NULL ORDER BY name',
    );
    console.log(
      '[StockRepo] getAll raw result:',
      JSON.stringify(result?.rows?._array?.length || 0),
      'items',
    );
    return this.mapRows(result.rows?._array || []);
  }

  async getById(id: string): Promise<StockItem | null> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getByCategoryId(categoryId: string): Promise<StockItem[]> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE category_id = ? AND deleted_at IS NULL ORDER BY name',
      [categoryId],
    );
    return this.mapRows(result.rows?._array || []);
  }

  async getByBarcode(barcode: string): Promise<StockItem | null> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE barcode = ?',
      [barcode],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getBySku(sku: string): Promise<StockItem | null> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE sku = ?',
      [sku],
    );
    const rows = result.rows?._array || [];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getLowStockItems(): Promise<LowStockAlert[]> {
    const result = await database.execute(
      'SELECT * FROM stock_items WHERE current_quantity <= min_stock_level AND deleted_at IS NULL ORDER BY current_quantity ASC',
    );
    const items = this.mapRows(result.rows?._array || []);

    return items.map(item => ({
      stockItem: item,
      currentQuantity: item.currentQuantity,
      minLevel: item.minStockLevel,
      deficit: item.minStockLevel - item.currentQuantity,
    }));
  }

  async getStockValue(): Promise<{ purchaseValue: number; saleValue: number }> {
    try {
      const result = await database.execute(
        `SELECT 
          SUM(current_quantity * purchase_price) as purchase_value,
          SUM(current_quantity * sale_price) as sale_value
         FROM stock_items WHERE deleted_at IS NULL`,
      );

      console.log('getStockValue result:', JSON.stringify(result));

      if (!result || !result.rows) {
        return { purchaseValue: 0, saleValue: 0 };
      }

      const row = result.rows._array?.[0];
      return {
        purchaseValue: row?.purchase_value || 0,
        saleValue: row?.sale_value || 0,
      };
    } catch (error) {
      console.error('Error in getStockValue:', error);
      return { purchaseValue: 0, saleValue: 0 };
    }
  }

  async getStockValueByCategory(): Promise<
    { categoryId: string; value: number }[]
  > {
    try {
      const result = await database.execute(
        `SELECT 
          category_id,
          SUM(current_quantity * sale_price) as value
         FROM stock_items 
         WHERE deleted_at IS NULL
         GROUP BY category_id`,
      );

      if (!result || !result.rows || !result.rows._array) {
        return [];
      }

      const rows = result.rows._array;
      return rows.map((row: any) => ({
        categoryId: row.category_id,
        value: row.value || 0,
      }));
    } catch (error) {
      console.error('Error in getStockValueByCategory:', error);
      return [];
    }
  }

  async create(
    data: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<StockItem> {
    const id = generateUUID();
    const now = Date.now();

    await database.execute(
      `INSERT INTO stock_items (
        id, category_id, name, sku, barcode, purchase_price, discountable_price,
        sale_price, current_quantity, min_stock_level, supplier_id, description,
        unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.categoryId,
        data.name,
        data.sku,
        data.barcode || null,
        data.purchasePrice,
        data.discountablePrice,
        data.salePrice,
        data.currentQuantity,
        data.minStockLevel,
        data.supplierId || null,
        data.description || null,
        data.unit,
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

  async update(id: string, data: Partial<StockItem>): Promise<StockItem> {
    const now = Date.now();
    const updates: string[] = [];
    const params: any[] = [];

    const fields: Array<keyof StockItem> = [
      'name',
      'sku',
      'barcode',
      'purchasePrice',
      'discountablePrice',
      'salePrice',
      'currentQuantity',
      'minStockLevel',
      'supplierId',
      'description',
      'unit',
    ];

    const columnMap: Record<string, string> = {
      categoryId: 'category_id',
      purchasePrice: 'purchase_price',
      discountablePrice: 'discountable_price',
      salePrice: 'sale_price',
      currentQuantity: 'current_quantity',
      minStockLevel: 'min_stock_level',
      supplierId: 'supplier_id',
    };

    fields.forEach(field => {
      if (data[field] !== undefined) {
        const column = columnMap[field] || field;
        updates.push(`${column} = ?`);
        params.push(data[field]);
      }
    });

    if (updates.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Stock item not found');
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await database.execute(
      `UPDATE stock_items SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Stock item not found after update');
    return updated;
  }

  async updateQuantity(
    id: string,
    quantity: number,
    movement: Omit<StockMovement, 'id' | 'createdAt'>,
  ): Promise<void> {
    await database.transaction(async () => {
      // Get current item
      const item = await this.getById(id);
      if (!item) throw new Error('Stock item not found');

      // Calculate new quantity
      let newQuantity = item.currentQuantity;
      if (movement.type === 'IN') {
        newQuantity += quantity;
      } else if (movement.type === 'OUT') {
        newQuantity -= quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient stock');
        }
      } else if (movement.type === 'ADJUSTMENT') {
        newQuantity = quantity;
      }

      // Update stock quantity
      await database.execute(
        'UPDATE stock_items SET current_quantity = ?, updated_at = ? WHERE id = ?',
        [newQuantity, Date.now(), id],
      );

      // Record movement
      const movementId = generateUUID();
      await database.execute(
        `INSERT INTO stock_movements (
          id, stock_item_id, type, quantity, reason, reference, performed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movementId,
          id,
          movement.type,
          quantity,
          movement.reason,
          movement.reference || null,
          movement.performedBy,
          Date.now(),
        ],
      );
    });
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete
    await database.execute(
      'UPDATE stock_items SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [Date.now(), Date.now(), id],
    );
    return true;
  }

  async getMovements(stockItemId: string): Promise<StockMovement[]> {
    const result = await database.execute(
      'SELECT * FROM stock_movements WHERE stock_item_id = ? ORDER BY created_at DESC',
      [stockItemId],
    );
    return (result.rows?._array || []).map((row: any) => ({
      id: row.id,
      stockItemId: row.stock_item_id,
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      reference: row.reference,
      performedBy: row.performed_by,
      createdAt: new Date(row.created_at),
    }));
  }

  private mapRow(row: any): StockItem {
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      purchasePrice: row.purchase_price,
      discountablePrice: row.discountable_price,
      salePrice: row.sale_price,
      currentQuantity: row.current_quantity,
      minStockLevel: row.min_stock_level,
      supplierId: row.supplier_id,
      description: row.description,
      unit: row.unit,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  private mapRows(rows: any[]): StockItem[] {
    return rows.map(row => this.mapRow(row));
  }
}
