import { CategoryRepository } from './CategoryRepository';
import { StockRepository } from './StockRepository';
import { ClientRepository } from './ClientRepository';
import { InvoiceRepository } from './InvoiceRepository';
import { ExpenseRepository } from './ExpenseRepository';

export class RepositoryFactory {
  private static categoryRepo: CategoryRepository;
  private static stockRepo: StockRepository;
  private static clientRepo: ClientRepository;
  private static invoiceRepo: InvoiceRepository;
  private static expenseRepo: ExpenseRepository;

  static getCategoryRepository(): CategoryRepository {
    if (!this.categoryRepo) {
      this.categoryRepo = new CategoryRepository();
    }
    return this.categoryRepo;
  }

  static getStockRepository(): StockRepository {
    if (!this.stockRepo) {
      this.stockRepo = new StockRepository();
    }
    return this.stockRepo;
  }

  static getClientRepository(): ClientRepository {
    if (!this.clientRepo) {
      this.clientRepo = new ClientRepository();
    }
    return this.clientRepo;
  }

  static getInvoiceRepository(): InvoiceRepository {
    if (!this.invoiceRepo) {
      this.invoiceRepo = new InvoiceRepository();
    }
    return this.invoiceRepo;
  }

  static getExpenseRepository(): ExpenseRepository {
    if (!this.expenseRepo) {
      this.expenseRepo = new ExpenseRepository();
    }
    return this.expenseRepo;
  }
}

export const categoryRepository = RepositoryFactory.getCategoryRepository();
export const stockRepository = RepositoryFactory.getStockRepository();
export const clientRepository = RepositoryFactory.getClientRepository();
export const invoiceRepository = RepositoryFactory.getInvoiceRepository();
export const expenseRepository = RepositoryFactory.getExpenseRepository();
