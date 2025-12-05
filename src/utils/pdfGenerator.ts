import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Invoice, Client, LedgerEntry } from '@/types';

interface PDFOptions {
  invoice: Invoice;
  client: Client;
  ledgerEntries?: LedgerEntry[];
  includeLedger?: boolean;
}

export const generateInvoicePDF = async (
  options: PDFOptions,
): Promise<string | null> => {
  const {
    invoice,
    client,
    ledgerEntries = [],
    includeLedger = false,
  } = options;

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  // Generate items table rows
  const itemsRows = invoice.items
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${
        index + 1
      }</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${item.stockItemName}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
        item.unitPrice,
      )}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${formatCurrency(
        item.total,
      )}</strong></td>
    </tr>
  `,
    )
    .join('');

  // Generate ledger rows if included
  let ledgerSection = '';
  if (includeLedger && ledgerEntries.length > 0) {
    const ledgerRows = ledgerEntries
      .map(
        entry => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDate(
          entry.date,
        )}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${
          entry.type
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${
          entry.description
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #dc2626;">${
          entry.debit > 0 ? formatCurrency(entry.debit) : '-'
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a;">${
          entry.credit > 0 ? formatCurrency(entry.credit) : '-'
        }</td>
      </tr>
    `,
      )
      .join('');

    ledgerSection = `
      <div style="page-break-before: always; margin-top: 30px;">
        <h2 style="color: #1e293b; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #0ea5e9;">
          Client Ledger History
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Date</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Type</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Debit</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows}
          </tbody>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: ${
          client.balance > 0 ? '#fef2f2' : '#f0fdf4'
        }; border-radius: 8px; text-align: right;">
          <strong style="color: ${client.balance > 0 ? '#dc2626' : '#16a34a'};">
            Current Balance: ${formatCurrency(Math.abs(client.balance))} ${
      client.balance > 0 ? '(Due)' : client.balance < 0 ? '(Credit)' : ''
    }
          </strong>
        </div>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-name { font-size: 28px; font-weight: bold; color: #0ea5e9; }
        .invoice-title { font-size: 36px; color: #94a3b8; text-align: right; }
        .invoice-number { font-size: 18px; color: #475569; text-align: right; margin-top: 8px; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-box { flex: 1; }
        .info-box h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 1px; }
        .info-box p { font-size: 14px; color: #334155; margin: 4px 0; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-paid { background: #dcfce7; color: #16a34a; }
        .status-partial { background: #fef3c7; color: #d97706; }
        .status-unpaid { background: #fee2e2; color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .summary-section { margin-top: 30px; display: flex; justify-content: flex-end; }
        .summary-box { width: 300px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .summary-row.total { border-top: 2px solid #1e293b; border-bottom: none; padding-top: 12px; font-weight: bold; font-size: 18px; }
        .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; }
        .thank-you { font-size: 16px; color: #64748b; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">Dream Traders</div>
          <p style="color: #64748b; margin-top: 8px;">Your Trusted Business Partner</p>
        </div>
        <div style="text-align: right;">
          <div class="invoice-title">INVOICE</div>
          <div class="invoice-number">#${invoice.invoiceNumber}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <h3>Bill To</h3>
          <p><strong>${client.name}</strong></p>
          <p>${client.shopName}</p>
          ${client.address ? `<p>${client.address}</p>` : ''}
          ${client.area ? `<p>${client.area}</p>` : ''}
          ${client.phone ? `<p>Phone: ${client.phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align: right;">
          <h3>Invoice Details</h3>
          <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
          <p style="margin-top: 12px;">
            <span class="status-badge status-${invoice.status.toLowerCase()}">${
    invoice.status
  }</span>
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          ${
            invoice.discount > 0
              ? `
            <div class="summary-row">
              <span>Discount</span>
              <span style="color: #dc2626;">-${formatCurrency(
                invoice.discount,
              )}</span>
            </div>
          `
              : ''
          }
          ${
            invoice.tax > 0
              ? `
            <div class="summary-row">
              <span>Tax</span>
              <span>${formatCurrency(invoice.tax)}</span>
            </div>
          `
              : ''
          }
          <div class="summary-row total">
            <span>Total</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
          ${
            invoice.amountPaid > 0
              ? `
            <div class="summary-row">
              <span>Amount Paid</span>
              <span style="color: #16a34a;">${formatCurrency(
                invoice.amountPaid,
              )}</span>
            </div>
            <div class="summary-row" style="font-weight: bold; color: ${
              invoice.amountDue > 0 ? '#dc2626' : '#16a34a'
            };">
              <span>Balance Due</span>
              <span>${formatCurrency(invoice.amountDue)}</span>
            </div>
          `
              : ''
          }
        </div>
      </div>

      ${ledgerSection}

      <div class="footer">
        <p class="thank-you">Thank you for your business!</p>
        <p>This is a computer-generated invoice.</p>
        <p>Generated on ${formatDate(new Date())}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const pdf = await generatePDF({
      html: htmlContent,
      fileName: `Invoice_${invoice.invoiceNumber}`,
      directory: 'Documents',
    });

    return pdf.filePath || null;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

export const sharePDF = async (filePath: string, invoiceNumber: string) => {
  try {
    await Share.open({
      url: `file://${filePath}`,
      type: 'application/pdf',
      title: `Invoice ${invoiceNumber}`,
      subject: `Invoice ${invoiceNumber}`,
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      throw error;
    }
  }
};

export const generateAndShareInvoicePDF = async (options: PDFOptions) => {
  const filePath = await generateInvoicePDF(options);
  if (filePath) {
    await sharePDF(filePath, options.invoice.invoiceNumber);
    return filePath;
  }
  throw new Error('Failed to generate PDF');
};
