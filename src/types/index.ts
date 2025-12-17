// ============================================
// STOCK MANAGEMENT TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategorySettings {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasWeight: boolean; // Whether this category requires weight/size fields
  customFields?: CategoryCustomField[];
  order: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[]; // For dropdown type
  required: boolean;
}

export interface StockItem {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode?: string;
  purchasePrice: number;
  discountablePrice: number;
  salePrice: number;
  currentQuantity: number;
  minStockLevel: number;
  supplierId?: string;
  description?: string;
  unit: string; // kg, pcs, box, etc.
  itemsInPack?: number; // Number of items in a pack/box for bulk purchases
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string; // invoice id, purchase order, etc.
  performedBy: string;
  createdAt: Date;
}

export interface LowStockAlert {
  stockItem: StockItem;
  currentQuantity: number;
  minLevel: number;
  deficit: number;
}

// ============================================
// CLIENT MANAGEMENT TYPES
// ============================================

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  dob?: Date;
  shopName: string;
  address?: string;
  area?: string;
  balance: number; // Current outstanding
  totalBusinessValue: number; // Lifetime value
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  date: Date;
  type: 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
  description: string;
  debit: number; // Money given (sales)
  credit: number; // Money received (payments)
  balance: number; // Running balance after this entry
  invoiceId?: string;
  items?: SaleItem[];
  notes?: string;
  createdAt: Date;
}

export interface SaleItem {
  stockItemId: string;
  stockItemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  // Pack-related fields
  isPack?: boolean; // Whether this is a pack/box purchase
  packsQuantity?: number; // Number of full packs
  looseQuantity?: number; // Number of loose items (from partial pack)
  itemsInPack?: number; // Items per pack (from stock item)
  availableQuantity?: number; // For validation
}

// ============================================
// INVOICE TYPES
// ============================================

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client: Client;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// EXPENSE MANAGEMENT TYPES
// ============================================

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Date;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notes?: string;
  createdAt: Date;
}

// ============================================
// FINANCIAL ANALYTICS TYPES
// ============================================

export interface RevenueData {
  totalSales: number;
  paymentsReceived: number;
  pendingReceivables: number;
  salesCount: number;
  averageSaleValue: number;
}

export interface ExpenditureData {
  stockPurchases: number;
  operationalExpenses: number;
  personalExpenses: number;
  wastage: number;
  totalExpenses: number;
}

export interface ProfitAnalysis {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  topProfitableItems: Array<{
    itemId: string;
    itemName: string;
    profit: number;
    quantity: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalBusiness: number;
    profit: number;
  }>;
}

export interface CapitalSummary {
  totalInvested: number;
  currentStockValue: number;
  cashInHand: number;
  receivables: number;
  payables: number;
  netWorth: number;
}

export interface FinancialReport {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: Date;
  endDate: Date;
  revenue: RevenueData;
  expenditure: ExpenditureData;
  profit: ProfitAnalysis;
  capital: CapitalSummary;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface AppSettings {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  gstNumber?: string;
  logo?: string;
  currency: string;
  dateFormat: string;
  darkMode: boolean;
  whatsappEnabled: boolean;
  backupEnabled: boolean;
  autoBackupFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  lastBackup?: Date;
  updatedAt: Date;
}

export interface CustomMenu {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  route?: string;
  order: number;
  enabled: boolean;
}

// ============================================
// DATABASE REPOSITORY INTERFACES
// ============================================

export interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface ICategoryRepository extends IRepository<Category> {
  getByParentId(parentId: string | null): Promise<Category[]>;
  getFullPath(categoryId: string): Promise<Category[]>;
  hasChildren(categoryId: string): Promise<boolean>;
}

export interface IStockRepository extends IRepository<StockItem> {
  getByCategoryId(categoryId: string): Promise<StockItem[]>;
  getByBarcode(barcode: string): Promise<StockItem | null>;
  getBySku(sku: string): Promise<StockItem | null>;
  getLowStockItems(): Promise<LowStockAlert[]>;
  updateQuantity(
    id: string,
    quantity: number,
    movement: Omit<StockMovement, 'id' | 'createdAt'>,
  ): Promise<void>;
  getStockValue(): Promise<{ purchaseValue: number; saleValue: number }>;
  getStockValueByCategory(): Promise<{ categoryId: string; value: number }[]>;
}

export interface IClientRepository extends IRepository<Client> {
  getByPhone(phone: string): Promise<Client | null>;
  updateBalance(id: string, amount: number): Promise<void>;
  getLedger(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LedgerEntry[]>;
  getTopClients(limit: number): Promise<Client[]>;
}

export interface IInvoiceRepository extends IRepository<Invoice> {
  getByClientId(clientId: string): Promise<Invoice[]>;
  getByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]>;
  getByStatus(status: Invoice['status']): Promise<Invoice[]>;
  generateInvoiceNumber(): Promise<string>;
}

export interface IExpenseRepository extends IRepository<Expense> {
  getByCategoryId(categoryId: string): Promise<Expense[]>;
  getByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  getTotalByPeriod(startDate: Date, endDate: Date): Promise<number>;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type RootStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  StockManagement: undefined;
  CategoryList: { parentId?: string };
  StockItemDetails: { itemId: string };
  AddStockItem: { categoryId: string };
  ClientList: undefined;
  ClientDetails: { clientId: string };
  AddClient: undefined;
  ClientLedger: { clientId: string };
  InvoiceList: undefined;
  CreateInvoice: { clientId?: string };
  InvoiceDetails: { invoiceId: string };
  ExpenseList: undefined;
  AddExpense: undefined;
  Reports: undefined;
  Settings: undefined;
  MonthlyEarnings: undefined;
};

// ============================================
// UTILITY TYPES
// ============================================

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type SortOrder = 'asc' | 'desc';

export type FilterOptions = {
  search?: string;
  dateRange?: DateRange;
  sortBy?: string;
  sortOrder?: SortOrder;
};
