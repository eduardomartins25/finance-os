import {
  AccountRepository,
  TransactionRepository,
  CardRepository,
  CategoryRepository,
  BudgetRepository,
  PurchaseRepository,
  GoalRepository,
  SafeRepository,
  MovementCofreRepository,
  LoanRepository
} from '../database/repositories';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export const BackupService = {
  async exportBackup(): Promise<string> {
    const backup = {
      version: 3,
      exportedAt: new Date().toISOString(),
      accounts: await AccountRepository.getAll(),
      cards: await CardRepository.getAllActive(),
      transactions: await TransactionRepository.getAllActive(),
      categories: await CategoryRepository.getAllActive(),
      budgets: await BudgetRepository.getAll(),
      purchases: await PurchaseRepository.getAll(),
      goals: await GoalRepository.getAll(),
      safes: await SafeRepository.getAll(),
      movementsCofre: await MovementCofreRepository.getAll(),
      loans: await LoanRepository.getAll()
    };
    return JSON.stringify(backup, null, 2);
  },

  async importBackup(jsonString: string): Promise<void> {
    alert('A importação de backup via JSON não é suportada na nuvem. Seus dados já estão seguros no Google Cloud!');
  },

  downloadBackupFile(jsonString: string) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async resetTransactionsAndBalances(): Promise<void> {
    // Apaga transações, compras e movimentos
    const txs = await TransactionRepository.getAllActive();
    for (const t of txs) await deleteDoc(doc(db, 'transactions', t.id));

    const pchs = await PurchaseRepository.getAll();
    for (const p of pchs) await deleteDoc(doc(db, 'purchases', p.id));

    const mvcs = await MovementCofreRepository.getAll();
    for (const m of mvcs) await deleteDoc(doc(db, 'movementsCofre', m.id));

    // Zera contas
    const accs = await AccountRepository.getAll();
    for (const a of accs) await AccountRepository.update(a.id, { initialBalance: 0, currentBalance: 0 });

    // Zera cartões
    const cds = await CardRepository.getAllActive();
    for (const c of cds) await CardRepository.update(c.id, { limitAvailable: c.limit });

    // Zera metas e cofres
    const gls = await GoalRepository.getAll();
    for (const g of gls) await GoalRepository.update(g.id, { valorAtual: 0 });

    const sfs = await SafeRepository.getAll();
    for (const s of sfs) await SafeRepository.update(s.id, { saldoAtual: 0 });

    // Zera orçamentos
    const bgs = await BudgetRepository.getAll();
    for (const b of bgs) await BudgetRepository.update(b.id, { spentAmount: 0 });
  },

  async wipeDatabase(): Promise<void> {
    const collections = [
      { repo: AccountRepository, name: 'accounts' },
      { repo: TransactionRepository, name: 'transactions' },
      { repo: CardRepository, name: 'cards' },
      { repo: CategoryRepository, name: 'categories' },
      { repo: BudgetRepository, name: 'budgets' },
      { repo: PurchaseRepository, name: 'purchases' },
      { repo: GoalRepository, name: 'goals' },
      { repo: SafeRepository, name: 'safes' },
      { repo: MovementCofreRepository, name: 'movementsCofre' },
      { repo: LoanRepository, name: 'loans' }
    ];

    for (const { repo, name } of collections) {
      const items = await ((repo as any).getAllActive ? (repo as any).getAllActive() : (repo as any).getAll());
      for (const item of items) {
        await deleteDoc(doc(db, name, item.id));
      }
    }
  }
};
