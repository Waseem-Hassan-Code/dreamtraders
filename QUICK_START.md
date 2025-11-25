# 🚀 Quick Start Guide - Dream Traders ERP

## Prerequisites Check ✅

Before running the app, ensure you have:

- ✅ Node.js 20+ installed
- ✅ Android Studio installed
- ✅ Android SDK configured
- ✅ Android Emulator running OR Physical device connected
- ✅ Java JDK 17+ installed

---

## 🎯 Running the App (First Time)

### Step 1: Open Terminal in Project Directory

```powershell
cd C:\Applications\dreamTrders_\dreamtraders
```

### Step 2: Start Metro Bundler

```powershell
npm start
```

**Wait for:** "Welcome to Metro!" message

### Step 3: Open New Terminal & Run Android

```powershell
npm run android
```

**This will:**

1. Build the Android app (first time takes 2-5 minutes)
2. Install APK on emulator/device
3. Launch the app automatically

---

## 📱 Expected Result

You should see:

1. ✅ "Loading Dream Traders ERP..." splash
2. ✅ Database initialization message in console
3. ✅ Dashboard screen with navigation tabs
4. ✅ Dark theme UI

---

## 🔧 If You Encounter Issues

### Issue 1: "Command not found: npm"

**Solution:** Install Node.js from https://nodejs.org

### Issue 2: Metro bundler won't start

**Solution:**

```powershell
npm start -- --reset-cache
```

### Issue 3: Android build fails

**Solution:**

```powershell
cd android
./gradlew clean
cd ..
npm run android
```

### Issue 4: "Unable to resolve module"

**Solution:**

```powershell
npm install
npm start -- --reset-cache
```

### Issue 5: Database initialization error

**Solution:** Check console logs. The app will show error details on screen.

---

## 🎨 What You'll See

### Dashboard Screen

- **Header:** "Dream Traders - ERP Dashboard"
- **Stats Cards:**
  - Total Clients: 0
  - Outstanding: ₹0.00
  - Low Stock Items: 0
- **Quick Actions:**
  - - Add Stock
  - - New Invoice
  - - Add Client

### Bottom Navigation (5 Tabs)

1. **Dashboard** - Home screen
2. **Stock** - Stock management (placeholder)
3. **Clients** - Client list (placeholder)
4. **Invoices** - Invoice list (placeholder)
5. **Expenses** - Expense tracking (placeholder)

---

## 🧪 Testing the Database

### Check Console Logs

You should see:

```
Database connected successfully
Database tables initialized
```

### Verify Tables Created

The following 12 tables are auto-created:

- categories
- stock_items
- stock_movements
- clients
- ledger_entries
- ledger_items
- invoices
- invoice_items
- expenses
- expense_categories
- settings
- custom_menus

---

## 🔄 Reloading the App

### Hot Reload (for minor changes)

Just save your file - changes appear automatically

### Full Reload

In the Metro terminal, press: **R** (twice)

### Deep Reload (if needed)

1. Close the app
2. In Metro terminal: Press **R** (twice)
3. Or shake device → Reload

---

## 🐛 Debugging

### View Logs

Metro terminal shows all console.logs

### Enable Chrome DevTools

1. Shake device (or Ctrl+M in emulator)
2. Select "Debug"
3. Chrome opens with DevTools

### React Native Debugger

Install: https://github.com/jhen0409/react-native-debugger
Better than Chrome DevTools

---

## 📂 Project Structure Quick Reference

```
dreamtraders/
├── src/
│   ├── database/           # SQLite + Repositories
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript types
│   ├── screens/            # UI screens
│   ├── components/         # Reusable components
│   ├── navigation/         # Navigation config
│   ├── services/           # Business services
│   └── utils/              # Utility functions
├── android/                # Android native code
├── ios/                    # iOS native code (future)
├── App.tsx                 # Main app entry
└── package.json            # Dependencies
```

---

## 🎯 Next Development Steps

### 1. Build Stock Management UI

File: `src/screens/StockManagementScreen.tsx`

- Replace placeholder with category tree
- Add stock item list
- Implement add/edit forms

### 2. Build Client Management UI

File: `src/screens/ClientListScreen.tsx`

- Show client list with balances
- Add client details screen
- Implement ledger view

### 3. Build Invoice System UI

File: `src/screens/InvoiceListScreen.tsx`

- List all invoices
- Create invoice form
- Invoice preview with PDF

---

## 📖 Documentation Files

1. **PROJECT_DOCUMENTATION.md** - Complete system overview
2. **DEVELOPMENT_GUIDE.md** - Step-by-step development
3. **IMPLEMENTATION_SUMMARY.md** - What's been built
4. **QUICK_START.md** - This file

---

## 💻 Useful Commands

```powershell
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (when added)
npm run ios

# Clear cache
npm start -- --reset-cache

# Install new package
npm install <package-name>

# Check TypeScript errors
npx tsc --noEmit

# Format code
npm run lint
```

---

## 🎓 Learning the Codebase

### Start Here:

1. Read `src/types/index.ts` - Understand all types
2. Check `src/database/index.ts` - See database schema
3. Look at `src/database/repositories/` - Data access layer
4. Study `src/store/stockStore.ts` - State management example
5. Examine `src/screens/DashboardScreen.tsx` - UI example

### Then Build:

Follow DEVELOPMENT_GUIDE.md to add new features

---

## ✅ Checklist for First Run

- [ ] Android emulator is running
- [ ] Terminal is in project directory
- [ ] Metro bundler started (`npm start`)
- [ ] Android build command executed (`npm run android`)
- [ ] App launches successfully
- [ ] Dashboard appears with dark theme
- [ ] Bottom navigation works
- [ ] Console shows "Database connected successfully"

---

## 🎉 Success!

If you see the dashboard, **congratulations!** 🎊

You now have a fully functional ERP foundation ready for development.

---

## 📞 Need Help?

### Check These First:

1. Console logs in Metro terminal
2. Red screen errors in app
3. TypeScript errors in IDE

### Common Solutions:

- Clear cache: `npm start -- --reset-cache`
- Reinstall: `rm -rf node_modules && npm install`
- Clean build: `cd android && ./gradlew clean`

---

**Ready to code? Start with DEVELOPMENT_GUIDE.md!** 🚀
