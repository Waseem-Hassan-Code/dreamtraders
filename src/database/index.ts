import { open } from '@op-engineering/op-sqlite';

export class Database {
  private static instance: Database;
  private db: any;
  private dbName = 'dreamtraders.db';
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    // Prevent multiple connections
    if (this.isConnected) {
      return;
    }

    try {
      this.db = open({ name: this.dbName });
      this.isConnected = true;
      await this.initializeTables();
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    const tables = [
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        level INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      )`,

      // Stock items table
      `CREATE TABLE IF NOT EXISTS stock_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        purchase_price REAL NOT NULL,
        discountable_price REAL NOT NULL,
        sale_price REAL NOT NULL,
        current_quantity REAL NOT NULL DEFAULT 0,
        min_stock_level REAL NOT NULL DEFAULT 0,
        supplier_id TEXT,
        description TEXT,
        unit TEXT NOT NULL DEFAULT 'pcs',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      )`,

      // Stock movements table
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        stock_item_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('IN', 'OUT', 'ADJUSTMENT')),
        quantity REAL NOT NULL,
        reason TEXT NOT NULL,
        reference TEXT,
        performed_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE
      )`,

      // Clients table
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        whatsapp TEXT,
        email TEXT,
        dob INTEGER,
        shop_name TEXT NOT NULL,
        address TEXT,
        area TEXT,
        balance REAL NOT NULL DEFAULT 0,
        total_business_value REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,

      // Ledger entries table
      `CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('SALE', 'PAYMENT', 'ADJUSTMENT', 'RETURN')),
        description TEXT NOT NULL,
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL,
        invoice_id TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )`,

      // Ledger items (for sale details)
      `CREATE TABLE IF NOT EXISTS ledger_items (
        id TEXT PRIMARY KEY,
        ledger_entry_id TEXT NOT NULL,
        stock_item_id TEXT NOT NULL,
        stock_item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (ledger_entry_id) REFERENCES ledger_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE RESTRICT
      )`,

      // Invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        client_id TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        tax REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        amount_paid REAL NOT NULL DEFAULT 0,
        amount_due REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PAID', 'PARTIAL', 'UNPAID')),
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
      )`,

      // Invoice items table
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        stock_item_id TEXT NOT NULL,
        stock_item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE RESTRICT
      )`,

      // Expense categories table
      `CREATE TABLE IF NOT EXISTS expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT
      )`,

      // Expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        date INTEGER NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurring_frequency TEXT CHECK(recurring_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
        notes TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT
      )`,

      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        gst_number TEXT,
        logo TEXT,
        currency TEXT NOT NULL DEFAULT 'INR',
        date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
        dark_mode INTEGER NOT NULL DEFAULT 0,
        whatsapp_enabled INTEGER NOT NULL DEFAULT 1,
        backup_enabled INTEGER NOT NULL DEFAULT 1,
        auto_backup_frequency TEXT,
        last_backup INTEGER,
        updated_at INTEGER NOT NULL
      )`,

      // Custom menus table
      `CREATE TABLE IF NOT EXISTS custom_menus (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        parent_id TEXT,
        route TEXT,
        menu_order INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (parent_id) REFERENCES custom_menus(id) ON DELETE CASCADE
      )`,
    ];

    // Create indices for better performance
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_category ON stock_items(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock_items(sku)',
      'CREATE INDEX IF NOT EXISTS idx_stock_barcode ON stock_items(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_movements_stock ON stock_movements(stock_item_id)',
      'CREATE INDEX IF NOT EXISTS idx_ledger_client ON ledger_entries(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
    ];

    try {
      for (const table of tables) {
        await this.execute(table);
      }
      for (const index of indices) {
        await this.execute(index);
      }
      await this.seedDefaultData();

      // Run migrations after tables are created
      await this.runMigrations();
    } catch (error) {
      console.error('Failed to initialize tables:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      // Check if migrations table exists
      await this.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at INTEGER NOT NULL
        )
      `);

      // Migration 1: Add deleted_at to stock_items (if not exists)
      // This migration is now part of the initial schema, so we skip it for new installs
      // and only keep the logic if we strictly need to support very old versions.
      // Since we are fixing a crash, we'll comment it out or remove it to prevent duplicates.

      /* 
      const migration1 = 'add_deleted_at_to_stock_items';
      // ... migration logic removed ...
      */

      // Migration 2: Add is_synced column to all main tables for Firebase sync
      const migration2 = 'add_is_synced_columns';
      const migration2Exists = await this.execute(
        'SELECT * FROM migrations WHERE name = ?',
        [migration2],
      );
      const hasMigration2 =
        migration2Exists.rows?.length > 0 ||
        migration2Exists.rows?._array?.length > 0;

      if (!hasMigration2) {
        // Add is_synced to stock_items
        try {
          await this.execute(
            'ALTER TABLE stock_items ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0',
          );
        } catch (e) {
          // Column might already exist
        }

        // Add is_synced to clients
        try {
          await this.execute(
            'ALTER TABLE clients ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0',
          );
        } catch (e) {
          // Column might already exist
        }

        // Add is_synced to invoices
        try {
          await this.execute(
            'ALTER TABLE invoices ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0',
          );
        } catch (e) {
          // Column might already exist
        }

        // Add is_synced to expenses
        try {
          await this.execute(
            'ALTER TABLE expenses ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0',
          );
        } catch (e) {
          // Column might already exist
        }

        // Add is_synced to ledger_entries
        try {
          await this.execute(
            'ALTER TABLE ledger_entries ADD COLUMN is_synced INTEGER NOT NULL DEFAULT 0',
          );
        } catch (e) {
          // Column might already exist
        }

        // Add items_in_pack to stock_items for pack-based inventory
        try {
          await this.execute(
            'ALTER TABLE stock_items ADD COLUMN items_in_pack INTEGER DEFAULT NULL',
          );
        } catch (e) {
          // Column might already exist
        }

        // Record the migration
        await this.execute(
          'INSERT INTO migrations (name, executed_at) VALUES (?, ?)',
          [migration2, Date.now()],
        );
      }
    } catch (error) {
      throw error;
    }
  }

  private async seedDefaultData(): Promise<void> {
    try {
      // Check if settings exist
      const settings = await this.execute('SELECT * FROM settings LIMIT 1');
      const hasSettings =
        settings.rows?.length > 0 || settings.rows?._array?.length > 0;

      if (!hasSettings) {
        // Insert default settings with OR IGNORE to prevent duplicates
        await this.execute(
          `INSERT OR IGNORE INTO settings (id, business_name, owner_name, phone, currency, date_format, 
           dark_mode, whatsapp_enabled, backup_enabled, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'default',
            'Dream Traders',
            'Owner',
            '',
            'INR',
            'DD/MM/YYYY',
            0,
            1,
            1,
            Date.now(),
          ],
        );
      }

      // Seed default expense categories
      const expenseCategories = [
        { id: 'food', name: 'Food & Dining', icon: 'food', color: '#FF6B6B' },
        {
          id: 'petrol',
          name: 'Petrol & Transport',
          icon: 'car',
          color: '#4ECDC4',
        },
        {
          id: 'bills',
          name: 'Bills & Utilities',
          icon: 'receipt',
          color: '#45B7D1',
        },
        {
          id: 'misc',
          name: 'Miscellaneous',
          icon: 'dots-horizontal',
          color: '#96CEB4',
        },
      ];

      for (const category of expenseCategories) {
        await this.execute(
          `INSERT OR IGNORE INTO expense_categories (id, name, icon, color) VALUES (?, ?, ?, ?)`,
          [category.id, category.name, category.icon, category.color],
        );
      }
    } catch (error) {
      console.error('Failed to seed default data:', error);
    }
  }

  public async execute(sql: string, params?: any[]): Promise<any> {
    try {
      // Wait for database to be connected
      if (!this.isConnected || !this.db) {
        console.warn('Database not yet connected, waiting...');
        // Wait a bit for connection to complete
        let attempts = 0;
        while (!this.isConnected && attempts < 50) {
          await new Promise(resolve =>
            setTimeout(() => resolve(undefined), 100),
          );
          attempts++;
        }

        if (!this.db) {
          throw new Error('Database not connected after waiting');
        }
      }

      // op-sqlite execute - handle both sync and async modes
      let result = this.db.execute(sql, params);

      // If result is a Promise, await it
      if (result && typeof result.then === 'function') {
        result = await result;
      }
      const rowsArray = Array.isArray(result?.rows)
        ? result.rows
        : result?.rows?._array || [];

      const standardResult = {
        rows: {
          _array: rowsArray,
          length: rowsArray.length,
          item: (index: number) => rowsArray[index],
        },
        insertId: result?.insertId,
        rowsAffected: result?.rowsAffected,
      };

      return standardResult;
    } catch (error) {
      console.error('SQL execution error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  public async transaction(
    callback: (tx: any) => Promise<void>,
  ): Promise<void> {
    try {
      await this.execute('BEGIN TRANSACTION');
      await callback(this);
      await this.execute('COMMIT');
    } catch (error) {
      console.error(
        '[DB Transaction] Error during transaction, rolling back:',
        error,
      );
      await this.execute('ROLLBACK');
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.isConnected = false;
    }
  }

  public async resetDatabase(): Promise<void> {
    try {
      // Drop all tables
      const tables = [
        'custom_menus',
        'expenses',
        'expense_categories',
        'invoice_items',
        'invoices',
        'ledger_items',
        'ledger_entries',
        'clients',
        'stock_movements',
        'stock_items',
        'categories',
        'settings',
        'migrations',
      ];

      for (const table of tables) {
        await this.execute(`DROP TABLE IF EXISTS ${table}`);
      }

      await this.initializeTables();
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }
}

export default Database.getInstance();
