import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { 
  Account, 
  Card, 
  Transaction, 
  Category, 
  Budget, 
  Installment,
  Purchase,
  Goal,
  Safe,
  MovementCofre,
  User,
  Loan
} from '../types';
import { uuidv7 } from '../utils/uuid';

export const getCurrentUserId = (): string => {
  if (auth.currentUser) return auth.currentUser.uid;
  if (typeof localStorage === 'undefined') return 'default-user';
  return localStorage.getItem('finance-current-user-id') || 'default-user';
};


// Helper to remove undefined values for Firestore
const cleanData = (obj: any) => {
  if (!obj) return obj;
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

// Helper to convert Firestore Timestamps back to JS Dates
export const convertDates = (data: any) => {
  if (!data) return data;
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] && typeof out[key].toDate === 'function') {
      out[key] = out[key].toDate();
    }
  }
  return out;
};

// We keep UserRepository empty because Firebase Auth handles this now,
// but we leave dummy methods so other components don't crash if they import it.
export const UserRepository = {
  async getById(id: string): Promise<User | undefined> { return undefined; },
  async getAll(): Promise<User[]> { return []; },
  async create(): Promise<string> { return ''; },
  async update(): Promise<void> {},
  async authenticate(): Promise<boolean> { return false; }
};

export const AccountRepository = {
  async getById(id: string): Promise<Account | undefined> {
    const d = await getDoc(doc(db, 'accounts', id));
    if (!d.exists()) return undefined;
    const acc = convertDates(d.data()) as Account;
    return !acc.deletedAt && acc.userId === getCurrentUserId() ? acc : undefined;
  },

  async getAllActive(): Promise<Account[]> {
    const q = query(collection(db, 'accounts'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Account).filter(a => !a.deletedAt && a.isActive);
  },

  async getAll(): Promise<Account[]> {
    const q = query(collection(db, 'accounts'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Account).filter(a => !a.deletedAt);
  },

  async create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const acc = { ...account, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Account;
    await setDoc(doc(db, 'accounts', id), cleanData(acc));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'accounts', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'accounts', id), cleanData({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }));
    return 1;
  },

  async adjustBalance(id: string, amount: number): Promise<void> {
    const docRef = doc(db, 'accounts', id);
    await runTransaction(db, async (t) => {
      const d = await t.get(docRef);
      if (!d.exists() || d.data().userId !== getCurrentUserId()) throw new Error('Account not found');
      t.update(docRef, cleanData({ currentBalance: Number((d.data().currentBalance + amount).toFixed(2)), updatedAt: new Date() }));
    });
  }
};

export const TransactionRepository = {
  async getById(id: string): Promise<Transaction | undefined> {
    const d = await getDoc(doc(db, 'transactions', id));
    if (!d.exists()) return undefined;
    const tx = convertDates(d.data()) as Transaction;
    return !tx.deletedAt && tx.userId === getCurrentUserId() ? tx : undefined;
  },

  async getAllActive(): Promise<Transaction[]> {
    const q = query(collection(db, 'transactions'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => convertDates(d.data()) as Transaction)
      .filter(t => !t.deletedAt)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  async create(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const transaction = { ...tx, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Transaction;
    await setDoc(doc(db, 'transactions', id), cleanData(transaction));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'transactions', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'transactions', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  },


  async getByAccount(accountId: string): Promise<Transaction[]> {
    const q = query(collection(db, 'transactions'), where('userId', '==', getCurrentUserId()), where('accountId', '==', accountId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => convertDates(d.data()) as Transaction)
      .filter(t => !t.deletedAt)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  async getByCard(cardId: string): Promise<Transaction[]> {
    const q = query(collection(db, 'transactions'), where('userId', '==', getCurrentUserId()), where('cardId', '==', cardId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => convertDates(d.data()) as Transaction)
      .filter(t => !t.deletedAt)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
};

export const CardRepository = {
  async getById(id: string): Promise<Card | undefined> {
    const d = await getDoc(doc(db, 'cards', id));
    if (!d.exists()) return undefined;
    const c = convertDates(d.data()) as Card;
    return !c.deletedAt && c.userId === getCurrentUserId() ? c : undefined;
  },

  async getAllActive(): Promise<Card[]> {
    const q = query(collection(db, 'cards'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Card).filter(c => !c.deletedAt && c.isActive);
  },

  async create(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const c = { ...card, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Card;
    await setDoc(doc(db, 'cards', id), cleanData(c));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'cards', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'cards', id), cleanData({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }));
    return 1;
  },

  async adjustLimitAvailable(id: string, amount: number): Promise<void> {
    const docRef = doc(db, 'cards', id);
    await runTransaction(db, async (t) => {
      const d = await t.get(docRef);
      if (!d.exists() || d.data().userId !== getCurrentUserId()) throw new Error('Card not found');
      t.update(docRef, cleanData({ limitAvailable: Number((d.data().limitAvailable + amount).toFixed(2)), updatedAt: new Date() }));
    });
  }
};

export const CategoryRepository = {
  async getById(id: string): Promise<Category | undefined> {
    const d = await getDoc(doc(db, 'categories', id));
    if (!d.exists()) return undefined;
    const c = convertDates(d.data()) as Category;
    return !c.deletedAt && c.userId === getCurrentUserId() ? c : undefined;
  },

  async getAllActive(): Promise<Category[]> {
    const q = query(collection(db, 'categories'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Category).filter(c => !c.deletedAt);
  },

  async create(cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const c = { ...cat, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Category;
    await setDoc(doc(db, 'categories', id), cleanData(c));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'categories', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'categories', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  }
};

export const BudgetRepository = {
  async getById(id: string): Promise<Budget | undefined> {
    const d = await getDoc(doc(db, 'budgets', id));
    if (!d.exists()) return undefined;
    const b = convertDates(d.data()) as Budget;
    return !b.deletedAt && b.userId === getCurrentUserId() ? b : undefined;
  },

  async getAll(): Promise<Budget[]> {
    const q = query(collection(db, 'budgets'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Budget).filter(b => !b.deletedAt);
  },

  async getByMonth(monthYear: string): Promise<Budget[]> {
    const q = query(collection(db, 'budgets'), where('userId', '==', getCurrentUserId()), where('monthYear', '==', monthYear));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Budget).filter(b => !b.deletedAt);
  },

  async create(b: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const budget = { ...b, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Budget;
    await setDoc(doc(db, 'budgets', id), cleanData(budget));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'budgets', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'budgets', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  }
};

export const InstallmentRepository = {
  // We assume installments don't have explicit userId but are linked to cards/transactions which do
  async getByCard(cardId: string): Promise<Installment[]> {
    const q = query(collection(db, 'installments'), where('cardId', '==', cardId));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Installment).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },

  async getByTransaction(transactionId: string): Promise<Installment[]> {
    const q = query(collection(db, 'installments'), where('transactionId', '==', transactionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Installment).sort((a, b) => a.number - b.number);
  },

  async create(inst: Installment): Promise<string> {
    const id = inst.id || uuidv7();
    const data = { ...inst, id };
    await setDoc(doc(db, 'installments', id), cleanData(data));
    return id;
  },

  async updateStatus(id: string, status: Installment['status']): Promise<number> {
    await updateDoc(doc(db, 'installments', id), cleanData({ status }));
    return 1;
  }
};

export const PurchaseRepository = {
  async getById(id: string): Promise<Purchase | undefined> {
    const d = await getDoc(doc(db, 'purchases', id));
    if (!d.exists()) return undefined;
    const p = convertDates(d.data()) as Purchase;
    return !p.deletedAt && p.userId === getCurrentUserId() ? p : undefined;
  },

  async getAll(): Promise<Purchase[]> {
    const q = query(collection(db, 'purchases'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Purchase).filter(p => !p.deletedAt);
  },

  async create(p: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const purchase = { ...p, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Purchase;
    await setDoc(doc(db, 'purchases', id), cleanData(purchase));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'purchases', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'purchases', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  }
};

export const GoalRepository = {
  async getById(id: string): Promise<Goal | undefined> {
    const d = await getDoc(doc(db, 'goals', id));
    if (!d.exists()) return undefined;
    const g = convertDates(d.data()) as Goal;
    return !g.deletedAt && g.userId === getCurrentUserId() ? g : undefined;
  },

  async getAll(): Promise<Goal[]> {
    const q = query(collection(db, 'goals'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Goal).filter(g => !g.deletedAt);
  },

  async create(g: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const goal = { ...g, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Goal;
    await setDoc(doc(db, 'goals', id), cleanData(goal));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'goals', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async adjustProgress(id: string, amount: number): Promise<void> {
    const docRef = doc(db, 'goals', id);
    await runTransaction(db, async (t) => {
      const d = await t.get(docRef);
      if (!d.exists() || d.data().userId !== getCurrentUserId()) throw new Error('Goal not found');
      const g = d.data();
      const newVal = Number((g.valorAtual + amount).toFixed(2));
      const status = newVal >= g.valorMeta ? 'Concluída' : g.status;
      t.update(docRef, cleanData({ valorAtual: newVal, status, updatedAt: new Date() }));
    });
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'goals', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  }
};

export const SafeRepository = {
  async getById(id: string): Promise<Safe | undefined> {
    const d = await getDoc(doc(db, 'safes', id));
    if (!d.exists()) return undefined;
    const s = convertDates(d.data()) as Safe;
    return !s.deletedAt && s.userId === getCurrentUserId() ? s : undefined;
  },

  async getAll(): Promise<Safe[]> {
    const q = query(collection(db, 'safes'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Safe).filter(s => !s.deletedAt);
  },

  async create(s: Omit<Safe, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const safe = { ...s, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Safe;
    await setDoc(doc(db, 'safes', id), cleanData(safe));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Safe, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'safes', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async adjustBalance(id: string, amount: number): Promise<void> {
    const docRef = doc(db, 'safes', id);
    await runTransaction(db, async (t) => {
      const d = await t.get(docRef);
      if (!d.exists() || d.data().userId !== getCurrentUserId()) throw new Error('Safe not found');
      t.update(docRef, cleanData({ saldoAtual: Number((d.data().saldoAtual + amount).toFixed(2)), updatedAt: new Date() }));
    });
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'safes', id), cleanData({ deletedAt: new Date(), updatedAt: new Date() }));
    return 1;
  }
};

export const MovementCofreRepository = {
  async getAll(): Promise<MovementCofre[]> {
    const q = query(collection(db, 'movementsCofre'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as MovementCofre);
  },

  async getByCofre(cofreId: string): Promise<MovementCofre[]> {
    const q = query(collection(db, 'movementsCofre'), where('userId', '==', getCurrentUserId()), where('cofreId', '==', cofreId));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => convertDates(d.data()) as MovementCofre)
      .sort((a, b) => b.data.getTime() - a.data.getTime());
  },

  async create(m: Omit<MovementCofre, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const mov = { ...m, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as MovementCofre;
    await setDoc(doc(db, 'movementsCofre', id), cleanData(mov));
    return id;
  }
};

export const LoanRepository = {
  async getById(id: string): Promise<Loan | undefined> {
    const d = await getDoc(doc(db, 'loans', id));
    if (!d.exists()) return undefined;
    const l = convertDates(d.data()) as Loan;
    return !l.deletedAt && l.userId === getCurrentUserId() ? l : undefined;
  },

  async getAll(): Promise<Loan[]> {
    const q = query(collection(db, 'loans'), where('userId', '==', getCurrentUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertDates(d.data()) as Loan).filter(l => !l.deletedAt);
  },

  async create(loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    const id = uuidv7();
    const l = { ...loan, id, userId: getCurrentUserId(), createdAt: new Date(), updatedAt: new Date() } as Loan;
    await setDoc(doc(db, 'loans', id), cleanData(l));
    return id;
  },

  async update(id: string, mods: Partial<Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>): Promise<number> {
    await updateDoc(doc(db, 'loans', id), cleanData({ ...mods, updatedAt: new Date() }));
    return 1;
  },

  async softDelete(id: string): Promise<number> {
    await updateDoc(doc(db, 'loans', id), cleanData({ deletedAt: new Date(), status: 'Concluído', updatedAt: new Date() }));
    return 1;
  }
};
