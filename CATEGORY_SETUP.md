# DreamTraders - Dynamic Categories Setup

## Changes Made

### 1. **Category Management System**

- Added new `CategorySettings` type with customizable properties:
  - Name, icon, color
  - `hasWeight` flag to enable/disable weight/size fields
  - Custom fields support (extensible for future)
  - Order and enabled state

### 2. **Settings Screen**

- Complete category management interface
- Add/Edit/Delete categories
- Icon picker with 19 available icons
- Color picker with 10 predefined colors
- Toggle weight/size field requirement per category
- Enable/disable categories
- Dark mode toggle

### 3. **Dynamic Stock Management**

- Stock form now uses categories from settings
- Weight/size field only shown for categories with `hasWeight: true`
- Categories filtered to show only enabled ones
- Form adapts based on selected category configuration

### 4. **Category Store**

- State management using Zustand
- Persistent storage with AsyncStorage
- Default categories pre-loaded:
  - Detergents (with weight)
  - Groceries (with weight)
  - Beverages (with weight)
  - Snacks (with weight)
  - Personal Care (no weight)
  - Household (no weight)

## Icon Fix Instructions

The icons are configured but need to be linked. Run these commands:

### For Android:

```powershell
cd c:\Applications\dreamTrders_\dreamtraders
npx react-native-asset
cd android ; .\gradlew clean ; cd ..
npx react-native run-android
```

### For iOS:

```powershell
cd c:\Applications\dreamTrders_\dreamtraders
npx react-native-asset
cd ios ; pod install ; cd ..
npx react-native run-ios
```

### Alternative (if above doesn't work):

```powershell
# Install react-native-asset globally
npm install -g react-native-asset

# Link the fonts
react-native-asset

# Rebuild
cd android ; .\gradlew clean ; cd ..
npx react-native run-android
```

## How to Use

1. **Navigate to Settings** from the dashboard
2. **Manage Categories:**

   - Click "Add Category" to create new product types
   - Edit existing categories to change icons, colors, or weight settings
   - Toggle categories on/off
   - Delete categories you don't need

3. **Stock Management:**
   - When adding stock, select a category
   - If category has weight enabled, you'll see size/weight options
   - If category doesn't have weight, that field is hidden
   - Form dynamically adapts to your category configuration

## Features

✅ Fully dynamic category system
✅ Customizable icons and colors
✅ Optional weight/size fields per category
✅ Persistent storage
✅ Easy to extend with custom fields
✅ Clean, modern UI
✅ Dark mode support

## Future Enhancements

- Drag and drop to reorder categories
- Import/Export category configurations
- Category-specific custom fields
- Category groups/subcategories
