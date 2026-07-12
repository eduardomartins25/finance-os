import { create } from 'zustand';
import type { Account, Card, Transaction, Category, Budget, Purchase, Safe, Goal, MovementCofre, User, Loan } from '../types';

import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  getCurrentUserId, 
  convertDates,
  CategoryRepository
} from '../database/repositories';

interface FinanceState {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  purchases: Purchase[];
  safes: Safe[];
  goals: Goal[];
  movementsCofre: MovementCofre[];
  loans: Loan[];
  subscriptions: any[];
  currentUser: User | null;
  usersList: User[];
  theme: string;
  accountingLockDate: string | null;
  loading: boolean;
  
  // Actions
  loadAllData: () => Promise<void>;
  subscribeToAllData: () => (() => void);
  setCurrentUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setTheme: (theme: string) => void;
  initializeTheme: () => void;
  setAccountingLockDate: (date: string | null) => void;
}

export const useStore = create<FinanceState>((set, get) => ({
  accounts: [],
  cards: [],
  transactions: [],
  categories: [],
  budgets: [],
  purchases: [],
  safes: [],
  goals: [],
  movementsCofre: [],
  loans: [],
  subscriptions: [],
  currentUser: null,
  usersList: [],
  theme: 'futuristic',
  accountingLockDate: localStorage.getItem('finance-accounting-lock-date') || null,
  loading: false,

  loadAllData: async () => {
    // Deprecated for direct use, use subscribeToAllData instead.
  },

  subscribeToAllData: () => {
    set({ loading: true });
    const uid = getCurrentUserId();
    const unsubs: (() => void)[] = [];

    const createListener = (colName: string, setterKey: string, filterFn: (d: any) => boolean = (d) => !d.deletedAt) => {
      const q = query(collection(db, colName), where('userId', '==', uid));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => convertDates(d.data())).filter(filterFn);
        if (setterKey === 'transactions') {
          data.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
        }
        if (colName === 'movementsCofre') {
          data.sort((a: any, b: any) => b.data.getTime() - a.data.getTime());
        }
        set({ [setterKey]: data } as any);
        set({ loading: false });
      });
      unsubs.push(unsub);
    };

    createListener('accounts', 'accounts', a => !a.deletedAt && a.isActive);
    createListener('cards', 'cards', c => !c.deletedAt && c.isActive);
    createListener('transactions', 'transactions', t => !t.deletedAt);
    createListener('categories', 'categories', c => !c.deletedAt);
    createListener('budgets', 'budgets', b => !b.deletedAt);
    createListener('purchases', 'purchases', p => !p.deletedAt);
    createListener('safes', 'safes', s => !s.deletedAt);
    createListener('goals', 'goals', g => !g.deletedAt);
    createListener('movementsCofre', 'movementsCofre', () => true);
    createListener('loans', 'loans', l => !l.deletedAt);

    // Initial default categories check
    setTimeout(async () => {
      const { categories } = get();
      if (categories.length === 0) {
        const defaultCategories = [
          { name: 'Alimentação', type: 'Despesa' as const, color: '#ef4444', icon: 'Utensils' },
          { name: 'Salário', type: 'Receita' as const, color: '#10b981', icon: 'Briefcase' },
          { name: 'Moradia', type: 'Despesa' as const, color: '#3b82f6', icon: 'Home' },
          { name: 'Transporte', type: 'Despesa' as const, color: '#f59e0b', icon: 'Car' },
          { name: 'Lazer', type: 'Despesa' as const, color: '#ec4899', icon: 'Sparkles' },
          { name: 'Outros', type: 'Ambos' as const, color: '#6b7280', icon: 'DollarSign' }
        ];
        for (const cat of defaultCategories) {
          await CategoryRepository.create(cat);
        }
      }
    }, 2000);

    return () => {
      unsubs.forEach(u => u());
    };
  },

  setTheme: (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('finance-theme', theme);
    set({ theme });
  },

  initializeTheme: () => {
    const savedTheme = localStorage.getItem('finance-theme') || 'futuristic';
    document.documentElement.setAttribute('data-theme', savedTheme);
    set({ theme: savedTheme });
  },

  setAccountingLockDate: (date: string | null) => {
    if (date) {
      localStorage.setItem('finance-accounting-lock-date', date);
    } else {
      localStorage.removeItem('finance-accounting-lock-date');
    }
    set({ accountingLockDate: date });
  },

  setCurrentUser: (user: User | null) => set({ currentUser: user }),

  logout: async () => {
    try {
      const { auth } = await import('../lib/firebase');
      await auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('finance-current-user-id');
    set({ currentUser: null, accounts: [], cards: [], transactions: [], categories: [], budgets: [], purchases: [], safes: [], goals: [], movementsCofre: [], loans: [], subscriptions: [] });
  }
}));
