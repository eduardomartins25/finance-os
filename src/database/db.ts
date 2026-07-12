import { 
  AccountRepository, 
  TransactionRepository, 
  CardRepository, 
  CategoryRepository, 
  BudgetRepository, 
  PurchaseRepository, 
  SafeRepository, 
  GoalRepository, 
  MovementCofreRepository, 
  InstallmentRepository, 
  LoanRepository 
} from './repositories';

class MockTable<T> {
  repo: any;
  constructor(repo: any) { this.repo = repo; }
  async get(id: string) { 
    if (this.repo.getById) return await this.repo.getById(id); 
    return undefined;
  }
  async toArray() { 
    if (this.repo.getAll) return await this.repo.getAll();
    if (this.repo.getAllActive) return await this.repo.getAllActive();
    return [];
  }
  async add(item: any) { 
    if (this.repo.create) return await this.repo.create(item); 
    return '';
  }
  async update(id: string, mods: any) { 
    if (this.repo.update) return await this.repo.update(id, mods);
    return 1;
  }
  async clear() {}
}

export const db = {
  transaction: async (mode: string, tables: any[], callback: () => Promise<any>) => {
    return await callback();
  },
  accounts: new MockTable(AccountRepository),
  transactions: new MockTable(TransactionRepository),
  cards: new MockTable(CardRepository),
  categories: new MockTable(CategoryRepository),
  budgets: new MockTable(BudgetRepository),
  purchases: new MockTable(PurchaseRepository),
  safes: new MockTable(SafeRepository),
  goals: new MockTable(GoalRepository),
  movementsCofre: new MockTable(MovementCofreRepository),
  installments: new MockTable(InstallmentRepository),
  loans: new MockTable(LoanRepository),
  users: {
    async get(id: string) { return undefined; },
    async toArray() { return []; },
    async add() { return ''; },
    async update() { return 1; },
    async clear() {}
  },
  auditLogs: {
    async get() { return undefined; },
    async toArray() { return []; },
    async add() { return ''; },
    async update() { return 1; },
    async clear() {}
  },
  subscriptions: {
    async get() { return undefined; },
    async toArray() { return []; },
    async add() { return ''; },
    async update() { return 1; },
    async clear() {}
  }
};
