# Dream Traders ERP - Quick Development Guide

## 🎯 What's Been Built (Phase 1 - Foundation)

### ✅ Complete Backend Infrastructure

- **SQLite Database** with 12 tables (fully normalized)
- **Repository Pattern** for all data access
- **Zustand Stores** for state management
- **TypeScript Types** for complete type safety
- **Clean Architecture** with separation of concerns

### ✅ Navigation Structure

- Bottom tab navigation (5 tabs)
- Stack navigation for detail screens
- Proper screen transitions

### ✅ Basic UI

- Dashboard with live stats
- Dark theme implementation
- Responsive layout structure

---

## 🚀 Next Steps - Building the UI

### **Priority 1: Stock Management UI**

#### 1.1 Category Tree View

Create: `src/screens/stock/CategoryTreeScreen.tsx`

- Display nested categories
- Breadcrumb navigation
- Add/Edit/Delete category
- Navigate into subcategories
- Show item count per category

#### 1.2 Stock Item List

Create: `src/screens/stock/StockItemListScreen.tsx`

- List all items in a category
- Search & filter
- Quick view stock levels
- Color-code low stock items
- Add new item button

#### 1.3 Stock Item Details

Create: `src/screens/stock/StockItemDetailScreen.tsx`

- View all item details
- Stock movement history
- Edit item details
- Adjust quantity
- View analytics (fast/slow moving)

#### 1.4 Add/Edit Stock Item Form

Create: `src/screens/stock/StockItemFormScreen.tsx`

- Form fields for all item properties
- Category selector
- Auto-generate SKU option
- Barcode scanner integration
- Image upload (future)

---

### **Priority 2: Client Management UI**

#### 2.1 Client List

Create: `src/screens/clients/ClientListScreen.tsx`

- Scrollable client list
- Show outstanding balance
- Color-code (red for high dues)
- Search by name/phone
- Quick call/WhatsApp buttons

#### 2.2 Client Details & Ledger

Create: `src/screens/clients/ClientDetailScreen.tsx`

- Client info card
- Current balance (prominent)
- Total business value
- Recent transactions
- Full ledger button

#### 2.3 Ledger View

Create: `src/screens/clients/ClientLedgerScreen.tsx`

- Chronological ledger entries
- Debit (red) / Credit (green)
- Running balance column
- Expandable item details
- Date range filter
- Export option

#### 2.4 Add Payment

Create: `src/screens/clients/AddPaymentScreen.tsx`

- Amount input
- Date picker
- Notes field
- Payment method
- Update balance instantly

---

### **Priority 3: Invoice System UI**

#### 3.1 Invoice List

Create: `src/screens/invoices/InvoiceListScreen.tsx`

- List all invoices
- Status badges (PAID/PARTIAL/UNPAID)
- Search by invoice number
- Filter by date/client/status
- Quick share button

#### 3.2 Create Invoice

Create: `src/screens/invoices/CreateInvoiceScreen.tsx`

- Select client
- Add items (cart-style)
- Calculate totals automatically
- Apply discount
- Record payment
- Generate & share immediately

#### 3.3 Invoice Detail/Preview

Create: `src/screens/invoices/InvoiceDetailScreen.tsx`

- Professional invoice layout
- Client details
- Item list with totals
- Payment status
- Share/Download buttons
- Mark as paid option

---

### **Priority 4: Expense Tracking UI**

#### 4.1 Expense List

Create: `src/screens/expenses/ExpenseListScreen.tsx`

- Monthly view
- Category-wise grouping
- Total per month
- Quick add button
- Search & filter

#### 4.2 Add Expense

Create: `src/screens/expenses/AddExpenseScreen.tsx`

- Category selector
- Amount input
- Description
- Date picker
- Recurring expense toggle
- Photo attachment (future)

---

### **Priority 5: Analytics Dashboard**

#### 5.1 Business Dashboard

Enhance: `src/screens/DashboardScreen.tsx`

- Revenue cards
- Profit/Loss summary
- Top clients widget
- Fast-moving items
- Low stock alerts
- Charts (line, bar, pie)

#### 5.2 Reports Screen

Create: `src/screens/reports/ReportsScreen.tsx`

- Date range selector
- Revenue report
- Expense report
- Profit analysis
- Client-wise report
- Item-wise report
- Export to PDF/Excel

---

## 🎨 UI Components to Create

### **Reusable Components**

1. **Card** - `src/components/common/Card.tsx`

   - Wrapper for content blocks
   - Dark theme styling
   - Touchable variant

2. **Button** - `src/components/common/Button.tsx`

   - Primary, Secondary, Danger variants
   - Loading state
   - Icon support

3. **Input** - `src/components/common/Input.tsx`

   - Text, Number, Phone types
   - Validation support
   - Error display
   - Dark theme

4. **SearchBar** - `src/components/common/SearchBar.tsx`

   - Debounced search
   - Clear button
   - Loading indicator

5. **EmptyState** - `src/components/common/EmptyState.tsx`

   - No data illustration
   - Call-to-action

6. **LoadingSpinner** - `src/components/common/LoadingSpinner.tsx`

   - Full screen or inline
   - Custom message

7. **ConfirmDialog** - `src/components/common/ConfirmDialog.tsx`

   - Yes/No confirmation
   - Custom message

8. **DatePicker** - `src/components/common/DatePicker.tsx`
   - Wrapper around @react-native-community/datetimepicker
   - Styled for dark theme

---

## 📦 Services to Implement

### 1. PDF Service

File: `src/services/pdfService.ts`

```typescript
export async function generateInvoicePDF(invoice: Invoice): Promise<string>;
export async function shareInvoicePDF(invoice: Invoice): Promise<void>;
```

### 2. Analytics Service

File: `src/services/analyticsService.ts`

```typescript
export async function getRevenueData(
  startDate: Date,
  endDate: Date,
): Promise<RevenueData>;
export async function getProfitAnalysis(
  period: string,
): Promise<ProfitAnalysis>;
export async function getTopClients(limit: number): Promise<Client[]>;
```

### 3. Backup Service

File: `src/services/backupService.ts`

```typescript
export async function createBackup(): Promise<string>;
export async function restoreBackup(filePath: string): Promise<void>;
export async function uploadToCloud(): Promise<void>;
```

### 4. Export Service

File: `src/services/exportService.ts`

```typescript
export async function exportToCSV(data: any[]): Promise<string>;
export async function exportToExcel(data: any[]): Promise<string>;
```

---

## 🔧 Utilities to Add

### 1. Date Formatter

File: `src/utils/dateFormatter.ts`

```typescript
export function formatDate(date: Date, format?: string): string;
export function getDateRange(period: 'today' | 'week' | 'month'): DateRange;
```

### 2. Currency Formatter

File: `src/utils/currencyFormatter.ts`

```typescript
export function formatCurrency(amount: number, symbol?: string): string;
export function parseCurrency(formatted: string): number;
```

### 3. Validation

File: `src/utils/validation.ts`

```typescript
export function validatePhone(phone: string): boolean;
export function validateEmail(email: string): boolean;
export function validateGST(gst: string): boolean;
```

### 4. Search Helper

File: `src/utils/searchHelper.ts`

```typescript
export function fuzzySearch<T>(items: T[], query: string, keys: string[]): T[];
```

---

## 🎯 Development Workflow

### Step-by-Step Process

1. **Pick a screen** from priorities above
2. **Create the component** in appropriate folder
3. **Connect to Zustand store**
4. **Style with dark theme** (use existing colors)
5. **Test on device/emulator**
6. **Add to navigation** if needed

### Example: Adding Stock Item Form

```typescript
// src/screens/stock/StockItemFormScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useStockStore } from '@/store/stockStore';

export default function StockItemFormScreen({ route, navigation }) {
  const { categoryId } = route.params;
  const { createStockItem } = useStockStore();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    purchasePrice: '',
    salePrice: '',
    quantity: '',
  });

  const handleSubmit = async () => {
    await createStockItem({
      categoryId,
      name: form.name,
      sku: form.sku,
      purchasePrice: parseFloat(form.purchasePrice),
      discountablePrice: parseFloat(form.salePrice),
      salePrice: parseFloat(form.salePrice),
      currentQuantity: parseFloat(form.quantity),
      minStockLevel: 0,
      unit: 'pcs',
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Item Name"
        value={form.name}
        onChangeText={text => setForm({ ...form, name: text })}
        style={styles.input}
      />
      {/* More inputs... */}
      <TouchableOpacity onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Save Item</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🎨 Design System

### Colors

```typescript
const colors = {
  background: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#fff',
  textMuted: '#94a3b8',
};
```

### Typography

```typescript
const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16 },
  small: { fontSize: 14 },
};
```

### Spacing

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

---

## 📱 Testing on Device

### Run Commands

```powershell
# Start Metro
npm start

# Run on Android
npm run android

# Clear cache if needed
npm start -- --reset-cache

# Reload app
Press R R in Metro terminal
```

### Debugging

- Shake device → Enable Remote Debugging
- Chrome DevTools for console logs
- React Native Debugger for Redux-like debugging

---

## 🚨 Common Issues & Solutions

### Issue: Path aliases not working

**Solution:** Clear Metro cache and rebuild

```powershell
npm start -- --reset-cache
```

### Issue: Database not initializing

**Solution:** Check logs in `database/index.ts` initialization

### Issue: Navigation not working

**Solution:** Ensure all screens are properly exported and imported

---

## 📚 Resources

- **React Native Docs:** https://reactnative.dev
- **React Navigation:** https://reactnavigation.org
- **Zustand:** https://github.com/pmndrs/zustand
- **SQLite:** https://github.com/op-engineering/op-sqlite

---

## 🎓 Learning Path

If you're new to this codebase:

1. **Understand the types** (`src/types/index.ts`)
2. **Check database schema** (`src/database/index.ts`)
3. **See how repositories work** (`src/database/repositories/`)
4. **Understand stores** (`src/store/`)
5. **Build your first screen** using existing dashboard as reference

---

**Happy Coding! 🚀**

Next steps: Start with Stock Management UI, then Clients, then Invoices!
