import firestore from '@react-native-firebase/firestore';
import { Database } from '@/database';

// Collection names in Firestore
const COLLECTIONS = {
  STOCK_ITEMS: 'stock_items',
  CLIENTS: 'clients',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  EXPENSES: 'expenses',
  LEDGER_ENTRIES: 'ledger_entries',
  LEDGER_ITEMS: 'ledger_items',
  CATEGORIES: 'categories',
  EXPENSE_CATEGORIES: 'expense_categories',
  SYNC_META: 'sync_meta',
};

// Device ID for identifying this device's data
let deviceId: string | null = null;

const getDeviceId = async (): Promise<string> => {
  if (deviceId) return deviceId;

  const db = Database.getInstance();
  try {
    const result = await db.execute('SELECT id FROM settings LIMIT 1');
    const rows = result.rows?._array || result.rows || [];
    if (rows.length > 0) {
      deviceId = rows[0].id || 'default';
    } else {
      deviceId = 'default';
    }
  } catch (e) {
    deviceId = 'default';
  }
  return deviceId!;
};

// Helper to convert SQLite row to Firestore document
const rowToDoc = (row: any) => {
  const doc: any = { ...row };
  // Convert integer booleans to actual booleans
  if (doc.is_synced !== undefined) doc.is_synced = doc.is_synced === 1;
  if (doc.is_recurring !== undefined) doc.is_recurring = doc.is_recurring === 1;
  if (doc.enabled !== undefined) doc.enabled = doc.enabled === 1;
  if (doc.dark_mode !== undefined) doc.dark_mode = doc.dark_mode === 1;
  return doc;
};

// Helper to convert Firestore document to SQLite row
const docToRow = (doc: any) => {
  const row: any = { ...doc };
  // Convert booleans to integers for SQLite
  if (row.is_synced !== undefined) row.is_synced = row.is_synced ? 1 : 0;
  if (row.is_recurring !== undefined)
    row.is_recurring = row.is_recurring ? 1 : 0;
  if (row.enabled !== undefined) row.enabled = row.enabled ? 1 : 0;
  if (row.dark_mode !== undefined) row.dark_mode = row.dark_mode ? 1 : 0;
  return row;
};

export interface SyncProgress {
  total: number;
  current: number;
  currentTable: string;
  status: 'uploading' | 'downloading' | 'idle' | 'error';
  message: string;
}

type ProgressCallback = (progress: SyncProgress) => void;

// Upload unsynced data to Firestore
export const uploadToFirestore = async (
  onProgress?: ProgressCallback,
): Promise<{ success: boolean; message: string; uploadedCount: number }> => {
  const db = Database.getInstance();
  const userId = await getDeviceId();
  let uploadedCount = 0;

  try {
    const tables = [
      { name: 'categories', collection: COLLECTIONS.CATEGORIES },
      {
        name: 'expense_categories',
        collection: COLLECTIONS.EXPENSE_CATEGORIES,
      },
      { name: 'stock_items', collection: COLLECTIONS.STOCK_ITEMS },
      { name: 'clients', collection: COLLECTIONS.CLIENTS },
      { name: 'invoices', collection: COLLECTIONS.INVOICES },
      { name: 'invoice_items', collection: COLLECTIONS.INVOICE_ITEMS },
      { name: 'expenses', collection: COLLECTIONS.EXPENSES },
      { name: 'ledger_entries', collection: COLLECTIONS.LEDGER_ENTRIES },
      { name: 'ledger_items', collection: COLLECTIONS.LEDGER_ITEMS },
    ];

    // Count total unsynced records
    let totalUnsynced = 0;
    for (const table of tables) {
      try {
        const countResult = await db.execute(
          `SELECT COUNT(*) as count FROM ${table.name} WHERE is_synced = 0 OR is_synced IS NULL`,
        );
        const rows = countResult.rows?._array || countResult.rows || [];
        totalUnsynced += rows[0]?.count || 0;
      } catch (e) {
        // Table might not have is_synced column
      }
    }

    onProgress?.({
      total: totalUnsynced,
      current: 0,
      currentTable: '',
      status: 'uploading',
      message: `Found ${totalUnsynced} records to sync`,
    });

    for (const table of tables) {
      onProgress?.({
        total: totalUnsynced,
        current: uploadedCount,
        currentTable: table.name,
        status: 'uploading',
        message: `Syncing ${table.name}...`,
      });

      try {
        // Get unsynced records
        const result = await db.execute(
          `SELECT * FROM ${table.name} WHERE is_synced = 0 OR is_synced IS NULL`,
        );
        const rows = result.rows?._array || result.rows || [];

        // Upload each record
        const batch = firestore().batch();
        let batchCount = 0;

        for (const row of rows) {
          const docRef = firestore()
            .collection('users')
            .doc(userId)
            .collection(table.collection)
            .doc(row.id);

          const docData = rowToDoc(row);
          docData.is_synced = true;
          docData.synced_at = firestore.FieldValue.serverTimestamp();

          batch.set(docRef, docData, { merge: true });
          batchCount++;

          // Commit batch every 500 records (Firestore limit)
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // Commit remaining records
        if (batchCount > 0) {
          await batch.commit();
        }

        // Mark records as synced in local DB
        if (rows.length > 0) {
          await db.execute(
            `UPDATE ${table.name} SET is_synced = 1 WHERE is_synced = 0 OR is_synced IS NULL`,
          );
          uploadedCount += rows.length;
        }
      } catch (e) {
        console.log(`Error syncing ${table.name}:`, e);
        // Continue with other tables
      }
    }

    // Update sync metadata
    await firestore()
      .collection('users')
      .doc(userId)
      .collection(COLLECTIONS.SYNC_META)
      .doc('last_sync')
      .set(
        {
          lastUpload: firestore.FieldValue.serverTimestamp(),
          uploadedCount,
        },
        { merge: true },
      );

    onProgress?.({
      total: totalUnsynced,
      current: uploadedCount,
      currentTable: '',
      status: 'idle',
      message: `Successfully synced ${uploadedCount} records`,
    });

    return {
      success: true,
      message: `Successfully uploaded ${uploadedCount} records to cloud`,
      uploadedCount,
    };
  } catch (error: any) {
    onProgress?.({
      total: 0,
      current: 0,
      currentTable: '',
      status: 'error',
      message: error.message || 'Upload failed',
    });
    return {
      success: false,
      message: error.message || 'Failed to upload data',
      uploadedCount,
    };
  }
};

// Download data from Firestore to local SQLite
export const downloadFromFirestore = async (
  onProgress?: ProgressCallback,
): Promise<{ success: boolean; message: string; downloadedCount: number }> => {
  const db = Database.getInstance();
  const userId = await getDeviceId();
  let downloadedCount = 0;

  try {
    const tables = [
      {
        name: 'categories',
        collection: COLLECTIONS.CATEGORIES,
        columns: [
          'id',
          'name',
          'parent_id',
          'level',
          'created_at',
          'updated_at',
        ],
      },
      {
        name: 'expense_categories',
        collection: COLLECTIONS.EXPENSE_CATEGORIES,
        columns: ['id', 'name', 'icon', 'color'],
      },
      {
        name: 'stock_items',
        collection: COLLECTIONS.STOCK_ITEMS,
        columns: [
          'id',
          'category_id',
          'name',
          'sku',
          'barcode',
          'purchase_price',
          'discountable_price',
          'sale_price',
          'current_quantity',
          'min_stock_level',
          'supplier_id',
          'description',
          'unit',
          'items_in_pack',
          'created_at',
          'updated_at',
          'deleted_at',
          'is_synced',
        ],
      },
      {
        name: 'clients',
        collection: COLLECTIONS.CLIENTS,
        columns: [
          'id',
          'name',
          'phone',
          'whatsapp',
          'email',
          'dob',
          'shop_name',
          'address',
          'area',
          'balance',
          'total_business_value',
          'created_at',
          'updated_at',
          'deleted_at',
          'is_synced',
        ],
      },
      {
        name: 'invoices',
        collection: COLLECTIONS.INVOICES,
        columns: [
          'id',
          'invoice_number',
          'client_id',
          'subtotal',
          'discount',
          'tax',
          'total',
          'amount_paid',
          'amount_due',
          'status',
          'notes',
          'created_at',
          'updated_at',
          'is_synced',
        ],
      },
      {
        name: 'invoice_items',
        collection: COLLECTIONS.INVOICE_ITEMS,
        columns: [
          'id',
          'invoice_id',
          'stock_item_id',
          'stock_item_name',
          'quantity',
          'unit_price',
          'total',
        ],
      },
      {
        name: 'expenses',
        collection: COLLECTIONS.EXPENSES,
        columns: [
          'id',
          'category_id',
          'amount',
          'description',
          'date',
          'is_recurring',
          'recurring_frequency',
          'notes',
          'created_at',
          'is_synced',
        ],
      },
      {
        name: 'ledger_entries',
        collection: COLLECTIONS.LEDGER_ENTRIES,
        columns: [
          'id',
          'client_id',
          'date',
          'type',
          'description',
          'debit',
          'credit',
          'balance',
          'invoice_id',
          'notes',
          'created_at',
          'is_synced',
        ],
      },
      {
        name: 'ledger_items',
        collection: COLLECTIONS.LEDGER_ITEMS,
        columns: [
          'id',
          'ledger_entry_id',
          'stock_item_id',
          'stock_item_name',
          'quantity',
          'unit_price',
          'total',
        ],
      },
    ];

    onProgress?.({
      total: tables.length,
      current: 0,
      currentTable: '',
      status: 'downloading',
      message: 'Starting download...',
    });

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];

      onProgress?.({
        total: tables.length,
        current: i,
        currentTable: table.name,
        status: 'downloading',
        message: `Downloading ${table.name}...`,
      });

      try {
        // Get all documents from Firestore
        const snapshot = await firestore()
          .collection('users')
          .doc(userId)
          .collection(table.collection)
          .get();

        for (const doc of snapshot.docs) {
          const data = docToRow(doc.data());

          // Build upsert query
          const columns = table.columns.filter(col => data[col] !== undefined);
          const values = columns.map(col => data[col]);
          const placeholders = columns.map(() => '?').join(', ');
          const updateSet = columns
            .map(col => `${col} = excluded.${col}`)
            .join(', ');

          await db.execute(
            `INSERT INTO ${table.name} (${columns.join(', ')}) 
             VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
            values,
          );
          downloadedCount++;
        }
      } catch (e) {
        console.log(`Error downloading ${table.name}:`, e);
        // Continue with other tables
      }
    }

    // Update sync metadata
    await firestore()
      .collection('users')
      .doc(userId)
      .collection(COLLECTIONS.SYNC_META)
      .doc('last_sync')
      .set(
        {
          lastDownload: firestore.FieldValue.serverTimestamp(),
          downloadedCount,
        },
        { merge: true },
      );

    onProgress?.({
      total: tables.length,
      current: tables.length,
      currentTable: '',
      status: 'idle',
      message: `Successfully downloaded ${downloadedCount} records`,
    });

    return {
      success: true,
      message: `Successfully downloaded ${downloadedCount} records from cloud`,
      downloadedCount,
    };
  } catch (error: any) {
    onProgress?.({
      total: 0,
      current: 0,
      currentTable: '',
      status: 'error',
      message: error.message || 'Download failed',
    });
    return {
      success: false,
      message: error.message || 'Failed to download data',
      downloadedCount,
    };
  }
};

// Full sync - upload then download
export const fullSync = async (
  onProgress?: ProgressCallback,
): Promise<{ success: boolean; message: string }> => {
  try {
    // First upload local changes
    const uploadResult = await uploadToFirestore(progress => {
      onProgress?.({
        ...progress,
        message: `Upload: ${progress.message}`,
      });
    });

    if (!uploadResult.success) {
      return { success: false, message: uploadResult.message };
    }

    // Then download remote changes
    const downloadResult = await downloadFromFirestore(progress => {
      onProgress?.({
        ...progress,
        message: `Download: ${progress.message}`,
      });
    });

    if (!downloadResult.success) {
      return { success: false, message: downloadResult.message };
    }

    return {
      success: true,
      message: `Sync complete! Uploaded ${uploadResult.uploadedCount}, Downloaded ${downloadResult.downloadedCount} records`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Sync failed',
    };
  }
};

// Get sync status
export const getSyncStatus = async (): Promise<{
  unsyncedCount: number;
  lastSyncTime: Date | null;
}> => {
  const db = Database.getInstance();
  const userId = await getDeviceId();

  try {
    // Count unsynced records
    let unsyncedCount = 0;
    const tables = [
      'stock_items',
      'clients',
      'invoices',
      'expenses',
      'ledger_entries',
    ];

    for (const table of tables) {
      try {
        const result = await db.execute(
          `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0 OR is_synced IS NULL`,
        );
        const rows = result.rows?._array || result.rows || [];
        unsyncedCount += rows[0]?.count || 0;
      } catch (e) {
        // Table might not have is_synced column
      }
    }

    // Get last sync time from Firestore
    let lastSyncTime: Date | null = null;
    try {
      const syncDoc = await firestore()
        .collection('users')
        .doc(userId)
        .collection(COLLECTIONS.SYNC_META)
        .doc('last_sync')
        .get();

      const data = syncDoc.data();
      if (data) {
        const timestamp = data.lastUpload || data.lastDownload;
        if (timestamp) {
          lastSyncTime = timestamp.toDate();
        }
      }
    } catch (e) {
      // Firestore might not be accessible
    }

    return { unsyncedCount, lastSyncTime };
  } catch (error) {
    return { unsyncedCount: 0, lastSyncTime: null };
  }
};

// Clear all cloud data (for testing/reset)
export const clearCloudData = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const userId = await getDeviceId();

  try {
    const collections = Object.values(COLLECTIONS);

    for (const collection of collections) {
      const snapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection(collection)
        .get();

      const batch = firestore().batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return { success: true, message: 'Cloud data cleared successfully' };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to clear cloud data',
    };
  }
};
