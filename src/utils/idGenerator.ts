// Simple UUID v4 generator for React Native
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateId(prefix?: string): string {
  const uuid = generateUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV${year}${month}${day}${random}`;
}

export function generateSKU(categoryName: string, itemName: string): string {
  const catPrefix = categoryName.slice(0, 3).toUpperCase();
  const itemPrefix = itemName.slice(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `${catPrefix}${itemPrefix}${random}`;
}
