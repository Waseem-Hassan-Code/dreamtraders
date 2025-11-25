# Dream Traders ERP - Architecture Overview

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Dashboard │  Stock   │  Clients │ Invoices │ Expenses │  │
│  │  Screen  │  Screen  │  Screen  │  Screen  │  Screen  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION LAYER                          │
│         React Navigation (Bottom Tabs + Stack)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  STATE MANAGEMENT (Zustand)                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Stock   │  Client  │ Invoice  │ Expense  │ Settings │  │
│  │  Store   │  Store   │  Store   │  Store   │  Store   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC (Services Layer)                 │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   PDF    │Analytics │  Backup  │  Export  │WhatsApp  │  │
│  │ Service  │ Service  │ Service  │ Service  │ Service  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          DATA ACCESS LAYER (Repository Pattern)              │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Category  │  Stock   │  Client  │ Invoice  │ Expense  │  │
│  │   Repo   │   Repo   │   Repo   │   Repo   │   Repo   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE ABSTRACTION                        │
│                   Database Singleton                         │
│            (Supports SQLite ↔ Firebase switch)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE                          │
│              SQLite (@op-engineering/op-sqlite)              │
│                    dreamtraders.db                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Example: Creating a Sale

```
1. USER ACTION
   └─> User taps "Create Invoice" button

2. NAVIGATION
   └─> Navigate to CreateInvoiceScreen

3. UI INTERACTION
   └─> User selects client, adds items, enters payment
   └─> Taps "Save Invoice"

4. STATE MANAGEMENT
   └─> useInvoiceStore.createInvoice() called
   └─> useClientStore.addLedgerEntry() called
   └─> useStockStore.updateStockQuantity() called (for each item)

5. REPOSITORY LAYER
   └─> InvoiceRepository.create()
       ├─> Validate data
       ├─> Generate invoice number
       └─> Start transaction

   └─> ClientRepository.addLedgerEntry()
       ├─> Insert ledger entry
       ├─> Update client balance
       └─> Update total business value

   └─> StockRepository.updateQuantity()
       ├─> Reduce stock quantity
       ├─> Record stock movement
       └─> Check low stock alert

6. DATABASE LAYER
   └─> Execute SQL transactions
   └─> Commit all changes atomically
   └─> Return success/error

7. STATE UPDATE
   └─> Zustand updates UI state
   └─> React re-renders affected components

8. USER FEEDBACK
   └─> Show success message
   └─> Navigate to invoice detail
   └─> Offer to share via WhatsApp
```

---

## 🔄 Repository Pattern Benefits

### Without Repository Pattern (Bad):

```typescript
// Direct database access from UI - TIGHT COUPLING ❌
const createInvoice = async () => {
  const db = open({ name: 'app.db' });
  const result = await db.execute(
    'INSERT INTO invoices VALUES (?, ?, ?)',
    [id, data, ...]
  );
  // If we switch to Firebase, we need to change ALL screens
};
```

### With Repository Pattern (Good):

```typescript
// Abstract interface - LOOSE COUPLING ✅
interface IInvoiceRepository {
  create(data: Invoice): Promise<Invoice>;
}

// SQLite implementation
class SQLiteInvoiceRepository implements IInvoiceRepository {
  async create(data: Invoice): Promise<Invoice> {
    // SQLite-specific code
  }
}

// Firebase implementation (future)
class FirebaseInvoiceRepository implements IInvoiceRepository {
  async create(data: Invoice): Promise<Invoice> {
    // Firebase-specific code
  }
}

// UI doesn't care about implementation
const { createInvoice } = useInvoiceStore();
// Works with both SQLite and Firebase!
```

---

## 🎯 Key Design Patterns

### 1. **Repository Pattern**

- **What:** Abstracts data access
- **Why:** Easy to switch databases
- **Where:** `src/database/repositories/`

### 2. **Singleton Pattern**

- **What:** Single database instance
- **Why:** Prevents connection leaks
- **Where:** `src/database/index.ts`

### 3. **Factory Pattern**

- **What:** Creates repository instances
- **Why:** Centralized dependency management
- **Where:** `src/database/repositories/index.ts`

### 4. **Observer Pattern**

- **What:** Zustand store subscriptions
- **Why:** Reactive UI updates
- **Where:** `src/store/*.ts`

---

## 🗄 Database Schema Relationships

```
categories (1) ──────< (∞) categories (self-referencing)
    │
    │ (1)
    │
    ↓ (∞)
stock_items (1) ──────< (∞) stock_movements
    │
    │ (∞)
    │
    ↓ (∞)
invoice_items ──────> (1) invoices ──────> (1) clients (1)
                                                    │
                                                    │ (1)
                                                    │
                                                    ↓ (∞)
                                            ledger_entries (1)
                                                    │
                                                    │ (1)
                                                    │
                                                    ↓ (∞)
                                            ledger_items

expenses ──────> (1) expense_categories
```

### Relationship Types:

- **1:∞** (One to Many) - One category has many items
- **∞:1** (Many to One) - Many items belong to one category
- **1:1** (One to One) - One invoice has one client

---

## 🔐 Data Integrity Measures

### 1. **Foreign Key Constraints**

```sql
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
```

- Prevents deleting category with items
- Maintains referential integrity

### 2. **Transactions**

```typescript
await database.transaction(async () => {
  await insertInvoice();
  await updateStock();
  await addLedgerEntry();
  // All or nothing - prevents partial updates
});
```

### 3. **Check Constraints**

```sql
CHECK(type IN ('IN', 'OUT', 'ADJUSTMENT'))
```

- Validates data at database level

### 4. **Unique Constraints**

```sql
sku TEXT UNIQUE NOT NULL
```

- Prevents duplicate SKUs

### 5. **Balance Validation**

```typescript
if (newQuantity < 0) {
  throw new Error('Insufficient stock');
}
```

- Business logic validation

---

## 🚀 Performance Optimizations

### 1. **Database Indices**

```sql
CREATE INDEX idx_stock_category ON stock_items(category_id)
```

- Fast category-based queries

### 2. **Zustand Selectors**

```typescript
const lowStockCount = useStockStore(state => state.lowStockItems.length);
```

- Only re-renders when this specific value changes

### 3. **Batch Operations**

```typescript
await Promise.all(items.map(item => updateStock(item)));
```

- Parallel execution

### 4. **Lazy Loading**

```typescript
// Load data only when needed
useEffect(() => {
  if (categoryId) {
    loadStockItems(categoryId);
  }
}, [categoryId]);
```

---

## 📱 Mobile-Specific Considerations

### 1. **Offline-First**

- All data stored locally in SQLite
- No internet required
- Sync to cloud when available (future)

### 2. **Touch-Optimized**

- Large tap targets (44x44 minimum)
- Swipe gestures for actions
- Pull-to-refresh

### 3. **Memory Efficient**

- Virtual lists for large datasets
- Image optimization
- Lazy component loading

### 4. **Battery Conscious**

- Minimal background operations
- Efficient database queries
- Optimized animations

---

## 🔧 Extensibility Examples

### Adding a New Entity (e.g., "Suppliers")

#### Step 1: Define Type

```typescript
// src/types/index.ts
export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Step 2: Add Database Table

```typescript
// src/database/index.ts
`CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;
```

#### Step 3: Create Repository

```typescript
// src/database/repositories/SupplierRepository.ts
export class SupplierRepository implements IRepository<Supplier> {
  async getAll(): Promise<Supplier[]> {
    /* ... */
  }
  async getById(id: string): Promise<Supplier | null> {
    /* ... */
  }
  async create(
    data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Supplier> {
    /* ... */
  }
  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    /* ... */
  }
  async delete(id: string): Promise<boolean> {
    /* ... */
  }
}
```

#### Step 4: Create Store

```typescript
// src/store/supplierStore.ts
export const useSupplierStore = create<SupplierState>(set => ({
  suppliers: [],
  loadSuppliers: async () => {
    /* ... */
  },
  createSupplier: async data => {
    /* ... */
  },
  // ...
}));
```

#### Step 5: Build UI

```typescript
// src/screens/SupplierListScreen.tsx
export default function SupplierListScreen() {
  const { suppliers, loadSuppliers } = useSupplierStore();
  // ... UI code
}
```

**That's it!** The pattern is consistent for all entities.

---

## 🎓 Learning Path for New Developers

1. **Week 1:** Understand types and database schema
2. **Week 2:** Study one repository (e.g., StockRepository)
3. **Week 3:** Learn Zustand by examining stockStore
4. **Week 4:** Build first UI screen using existing patterns
5. **Week 5+:** Add new features independently

---

## 🌟 Why This Architecture Rocks

### ✅ **Scalable**

- Add features without breaking existing code
- Clear structure for team collaboration

### ✅ **Maintainable**

- Each layer has single responsibility
- Easy to locate and fix bugs

### ✅ **Testable**

- Mock repositories for unit tests
- Test UI separately from business logic

### ✅ **Flexible**

- Switch databases without UI changes
- Replace state management library easily

### ✅ **Professional**

- Industry-standard patterns
- Production-ready quality

---

**This is not a toy project - it's enterprise-grade architecture! 🚀**
