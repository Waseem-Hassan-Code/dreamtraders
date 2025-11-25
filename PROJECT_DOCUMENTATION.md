# Dream Traders - Complete Mobile ERP System

A production-ready React Native ERP mobile application for wholesale business management, built with TypeScript, SQLite, and modern architecture patterns.

## 🎯 Features Overview

### 1. **Stock Management System** ✅ (Database & Logic Ready)

- **Multi-level nested categories** (unlimited depth)
- Stock items with:
  - Purchase price, discountable price, sale price
  - Current quantity tracking
  - SKU & Barcode support
  - Supplier management
- **Stock movements** tracking (IN/OUT/ADJUSTMENT)
- **Low stock alerts**
- Stock value calculations (purchase & sale based)
- Stock history logs

### 2. **Client Management (Hisab Kitab)** ✅ (Database & Logic Ready)

- Complete customer profiles (name, phone, shop details)
- **Running balance system** (outstanding amounts)
- **Full ledger history**:
  - Items issued on credit
  - Payments received
  - Due amounts
  - Transaction history
- ERP-style ledger with:
  - Date, Description
  - Debit/Credit entries
  - Running balance
  - Item details per transaction

### 3. **Invoice System** ✅ (Database & Logic Ready)

- Invoice generation with unique numbers
- Multiple items per invoice
- Discount & tax support
- Payment tracking (PAID/PARTIAL/UNPAID)
- Invoice history
- _PDF generation & WhatsApp sharing (coming next)_

### 4. **Personal Expense Management** ✅ (Database & Logic Ready)

- Categorized expenses (Food, Petrol, Bills, Misc)
- Date-wise tracking
- Recurring expense support
- Notes and descriptions
- Integration with financial analytics

### 5. **Revenue & Profit Analysis** 🚧 (Repository Ready, Analytics Next)

- Business revenue tracking
- Expenditure monitoring
- Profit/loss calculations
- Per-item profit analysis
- Per-client business value
- Daily/Weekly/Monthly reports

### 6. **Settings & Configuration** 🚧 (Database Ready, UI Coming)

- Business profile management
- Custom menu configuration
- Backup/restore functionality
- Database switching (SQLite ↔ Firebase)

---

## 🏗 Architecture

### **Clean Architecture with Repository Pattern**

```
src/
├── database/               # Database layer
│   ├── index.ts           # SQLite connection & schema
│   ├── repositories/      # Repository pattern implementations
│   │   ├── CategoryRepository.ts
│   │   ├── StockRepository.ts
│   │   ├── ClientRepository.ts
│   │   ├── InvoiceRepository.ts
│   │   └── ExpenseRepository.ts
│   └── schemas/           # Database schemas (future migrations)
│
├── store/                 # State management (Zustand)
│   ├── stockStore.ts
│   ├── clientStore.ts
│   └── invoiceStore.ts
│
├── types/                 # TypeScript definitions
│   └── index.ts          # All types & interfaces
│
├── screens/              # UI screens
│   ├── DashboardScreen.tsx
│   ├── StockManagementScreen.tsx
│   ├── ClientListScreen.tsx
│   ├── InvoiceListScreen.tsx
│   └── ExpenseListScreen.tsx
│
├── components/           # Reusable UI components
│   └── common/
│
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
│
├── services/           # Business logic & external services
│   └── (PDF, WhatsApp, Analytics)
│
└── utils/             # Utility functions
    └── idGenerator.ts
```

---

## 🛢 Database Schema

### **Tables Implemented:**

1. **categories** - Nested category tree
2. **stock_items** - Product inventory
3. **stock_movements** - Stock transaction history
4. **clients** - Customer records
5. **ledger_entries** - Client transaction ledger
6. **ledger_items** - Detailed items per ledger entry
7. **invoices** - Invoice headers
8. **invoice_items** - Invoice line items
9. **expenses** - Personal/business expenses
10. **expense_categories** - Expense categorization
11. **settings** - App configuration
12. **custom_menus** - Dynamic menu system

**All tables include:**

- Proper indices for performance
- Foreign key constraints
- Cascade/restrict rules
- Timestamps

---

## 📦 Tech Stack

### **Core**

- **React Native 0.82** (CLI)
- **TypeScript** (strict mode)
- **@op-engineering/op-sqlite** - High-performance SQLite
- **Zustand** - Lightweight state management

### **Navigation**

- **@react-navigation/native**
- **@react-navigation/native-stack**
- **@react-navigation/bottom-tabs**

### **UI & Styling**

- **NativeWind** - Tailwind CSS for React Native
- **react-native-reanimated** - Smooth animations
- **react-native-gesture-handler** - Touch interactions
- **react-native-svg** - Vector graphics

### **Business Features** (Installed, Integration Next)

- **react-native-fs** - File system operations
- **react-native-share** - Share invoices
- **react-native-html-to-pdf** - PDF generation
- **react-native-chart-kit** - Data visualization
- **date-fns** - Date utilities
- **zod** - Runtime validation

---

## 🚀 Current Status

### ✅ **Completed (Phase 1)**

1. ✅ Project setup with React Native CLI
2. ✅ TypeScript configuration with path aliases
3. ✅ Complete database schema with SQLite
4. ✅ Repository pattern implementation for all entities
5. ✅ Zustand stores for state management
6. ✅ Navigation structure (Bottom tabs + Stack)
7. ✅ Basic dashboard with live data
8. ✅ Type-safe architecture
9. ✅ All dependencies installed

### 🚧 **In Progress (Phase 2)**

- Stock management UI (category tree, item CRUD)
- Client management UI (ledger view, payment entry)
- Invoice creation & management UI
- Expense tracking UI

### 📋 **Next Steps (Phase 3)**

- PDF invoice generation
- WhatsApp integration
- Analytics dashboard with charts
- Backup/restore system
- Search & filter functionality
- Reports generation

---

## 🔧 Installation & Setup

### **Prerequisites**

- Node.js >= 20
- Android Studio with SDK
- Java JDK 17+

### **Getting Started**

1. **Navigate to project:**

   ```powershell
   cd C:\Applications\dreamTrders_\dreamtraders
   ```

2. **Install dependencies:**

   ```powershell
   npm install
   ```

3. **Start Metro bundler:**

   ```powershell
   npm start
   ```

4. **Run on Android:**
   ```powershell
   npm run android
   ```

---

## 📱 Key Features Demonstration

### **Stock Management**

```typescript
// Add a category
await stockStore.createCategory({
  name: 'Electronics',
  parentId: null,
  level: 0,
});

// Add stock item
await stockStore.createStockItem({
  categoryId: 'category-id',
  name: 'Samsung TV 55"',
  sku: 'ELE-SAM-12345',
  purchasePrice: 35000,
  discountablePrice: 40000,
  salePrice: 45000,
  currentQuantity: 10,
  minStockLevel: 2,
  unit: 'pcs',
});

// Update stock
await stockStore.updateStockQuantity('item-id', 5, 'OUT', 'Sold to ABC Store');
```

### **Client Management**

```typescript
// Add client
const client = await clientStore.createClient({
  name: 'Raja Shopkeeper',
  phone: '9876543210',
  shopName: 'Raja General Store',
  area: 'Market Area',
  balance: 0,
  totalBusinessValue: 0,
});

// Add ledger entry (sale on credit)
await clientStore.addLedgerEntry(client.id, {
  date: new Date(),
  type: 'SALE',
  description: 'Invoice #INV001',
  debit: 5000, // Amount given
  credit: 0,
  items: [
    {
      stockItemId: 'item-id',
      stockItemName: 'Samsung TV',
      quantity: 1,
      unitPrice: 5000,
      total: 5000,
    },
  ],
});

// Record payment
await clientStore.addLedgerEntry(client.id, {
  date: new Date(),
  type: 'PAYMENT',
  description: 'Cash received',
  debit: 0,
  credit: 2000, // Amount received
});
```

### **Invoice Generation**

```typescript
const invoiceNumber = await invoiceStore.generateInvoiceNumber();
const invoice = await invoiceStore.createInvoice({
  invoiceNumber,
  client: selectedClient,
  items: cartItems,
  subtotal: 5000,
  discount: 200,
  tax: 0,
  total: 4800,
  amountPaid: 2000,
  amountDue: 2800,
  status: 'PARTIAL',
});
```

---

## 🎨 UI Design Philosophy

- **Dark Mode First** - Professional dark theme
- **Minimalistic** - Clean, distraction-free interface
- **Touch-Optimized** - Large tap targets, smooth gestures
- **Offline-First** - All operations work offline
- **Fast & Responsive** - Instant feedback, optimized queries

---

## 🔐 Data Integrity

- **Transactions** for multi-table operations
- **Foreign key constraints** prevent orphaned records
- **Cascade deletes** where appropriate
- **Balance calculations** validated in ledger
- **Stock quantity** validated before deduction
- **Audit trails** for all critical operations

---

## 🌟 Why This Architecture?

1. **Repository Pattern** - Easily switch from SQLite to Firebase/Firestore
2. **Type Safety** - TypeScript catches errors at compile time
3. **State Management** - Zustand is simple, fast, and scalable
4. **Clean Separation** - Database, business logic, and UI are independent
5. **Testable** - Each layer can be unit tested independently
6. **Maintainable** - Clear structure makes changes easy

---

## 📈 Performance Optimizations

- **Indexed queries** on frequently searched columns
- **Batch operations** for multiple inserts
- **Lazy loading** for large lists
- **Memoization** in React components
- **Optimized re-renders** with Zustand selectors
- **Virtual lists** for long scrollable content (coming)

---

## 🚦 Next Development Priorities

### **Immediate (Week 1)**

1. Complete Stock Management UI
2. Client List & Ledger View
3. Invoice Creation Form

### **Short Term (Week 2-3)**

1. PDF Generation
2. WhatsApp Sharing
3. Search & Filters
4. Analytics Dashboard

### **Medium Term (Week 4+)**

1. Advanced Reports
2. Backup/Restore
3. Multi-user Support
4. Firebase Integration
5. Cloud Sync

---

## 🐛 Known Issues & Limitations

- PDF generation not yet implemented
- WhatsApp integration pending
- Analytics/charts UI pending
- No user authentication yet
- Single-user system (multi-user planned)

---

## 📝 Notes for Developer

### **Adding New Features**

1. Create types in `src/types/index.ts`
2. Add database tables in `src/database/index.ts`
3. Create repository in `src/database/repositories/`
4. Create Zustand store in `src/store/`
5. Build UI in `src/screens/`

### **Database Migrations**

Currently using schema creation on first run. Future versions will use proper migrations in `src/database/migrations/`.

### **Testing**

Testing infrastructure will be added in next phase using Jest and React Native Testing Library.

---

## 📞 Support & Contribution

This is a custom ERP solution for Dream Traders. The codebase is designed to be:

- **Extensible** - Easy to add new features
- **Maintainable** - Clean code with clear patterns
- **Scalable** - Can handle growing business needs
- **Flexible** - Switch databases, add new modules

---

## 🎯 Project Goals

Build a **complete, production-ready mobile ERP** that:

- ✅ Works offline-first
- ✅ Handles all wholesale business operations
- ✅ Provides real-time analytics
- ✅ Generates professional invoices
- ✅ Maintains complete audit trails
- ✅ Scales with business growth

---

**Version:** 1.0.0-alpha  
**Last Updated:** November 18, 2025  
**Platform:** Android (iOS support planned)
