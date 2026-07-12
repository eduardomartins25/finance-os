import React, { useState, useEffect } from 'react';
import './App.css';
import { useStore } from './hooks/useStore';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './modules/dashboard/DashboardView';
import { ContasView } from './modules/contas/ContasView';
import { CartoesView } from './modules/cartoes/CartoesView';
import { LancamentosView } from './modules/lancamentos/LancamentosView';
import { ConfiguracoesView } from './modules/configuracoes/ConfiguracoesView';
import { ComprasView } from './modules/compras/ComprasView';
import { MetasView } from './modules/metas/MetasView';
import { EmprestimosView } from './modules/emprestimos/EmprestimosView';
import { LoginView } from './modules/auth/LoginView';
import { CurrencyInput } from './components/ui/CurrencyInput';
import { PlusCircle, X, Wallet, CreditCard, ArrowLeftRight } from 'lucide-react';
import { TransactionService } from './services/TransactionService';

type Tab = 'dashboard' | 'contas' | 'cartoes' | 'lancamentos' | 'compras' | 'metas' | 'emprestimos' | 'configuracoes';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';

function App() {
  const { setCurrentUser, initializeTheme, accounts, cards, categories, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'Receita' | 'Despesa'>('Despesa');
  const [quickValue, setQuickValue] = useState('');
  const [quickNumericValue, setQuickNumericValue] = useState(0);
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState('');

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const now = new Date();
        setCurrentUser({ id: user.uid, name: user.displayName || 'Usuário', email: user.email || '', createdAt: now, updatedAt: now });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize theme
  useEffect(() => {
    initializeTheme();
  }, []);

  // Fetch all data when active user changes
  useEffect(() => {
    if (currentUser) {
      const unsub = useStore.getState().subscribeToAllData();
      return () => unsub();
    }
  }, [currentUser?.id]);

  // Keyboard shortcut: press 'N' to open quick add
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'n' || e.key === 'N') {
        setIsQuickAddOpen(true);
      }
      if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickValue || !quickAccountId) return;

    const valNum = quickNumericValue;
    await TransactionService.create({
      type: quickAddType,
      accountId: quickAccountId,
      value: valNum,
      description: quickDesc || (quickAddType === 'Despesa' ? 'Despesa Rápida' : 'Receita Rápida'),
      categoryId: quickCategoryId || undefined,
      date: new Date(),
      status: 'Efetivado',
      origin: 'Manual'
    });

    // Reset & reload
    setQuickValue('');
    setQuickNumericValue(0);
    setQuickDesc('');
    setQuickCategoryId('');
    setIsQuickAddOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab as Tab)} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />;
      case 'contas':
        return <ContasView />;
      case 'cartoes':
        return <CartoesView />;
      case 'lancamentos':
        return <LancamentosView />;
      case 'compras':
        return <ComprasView />;
      case 'metas':
        return <MetasView />;
      case 'emprestimos':
        return <EmprestimosView />;
      case 'configuracoes':
        return <ConfiguracoesView />;
      default:
        return null;
    }
  };

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} onNavigate={(tab) => setActiveTab(tab as Tab)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {renderContent()}
      </main>

      {/* Floating Quick Add Button (visible on all pages) */}
      <button
        onClick={() => setIsQuickAddOpen(true)}
        id="quick-add-fab"
        title="Lançamento Rápido (N)"
        className="fixed right-6 bottom-6 z-40 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform md:hidden"
      >
        <PlusCircle size={26} />
      </button>

      {/* Quick Add Modal (5-second flow) */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card border border-border w-full md:max-w-sm rounded-t-3xl md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in md:zoom-in-95">
            {/* Modal Top Drag Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <span className="w-10 h-1 bg-border rounded-full"></span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-border">
              <h2 className="font-bold text-base">Lançamento Rápido</h2>
              <div className="flex items-center gap-3">
                <span className="hidden md:block text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">ESC</span>
                <button onClick={() => setIsQuickAddOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Toggle */}
            <div className="px-5 pt-4">
              <div className="flex gap-2 p-1 bg-muted rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setQuickAddType('Despesa')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${quickAddType === 'Despesa' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAddType('Receita')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${quickAddType === 'Receita' ? 'bg-card text-success shadow-sm' : 'text-muted-foreground'}`}
                >
                  Receita
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickAdd} className="px-5 pb-6 space-y-3">
              {/* Value — autofocus for speed */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">R$</span>
                <CurrencyInput
                  value={quickValue}
                  onChange={(raw, num) => { setQuickValue(raw); setQuickNumericValue(num); }}
                  autoFocus
                  className="w-full bg-input border border-border pl-9 pr-4 py-3 rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  required
                />
              </div>

              {/* Description (optional but fast) */}
              <input
                type="text"
                value={quickDesc}
                onChange={e => setQuickDesc(e.target.value)}
                placeholder="Descrição (opcional)"
                className="w-full bg-input border border-border px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              />

              {/* Account + Category row */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={quickAccountId}
                  onChange={e => setQuickAccountId(e.target.value)}
                  className="bg-input border border-border px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                  required
                >
                  <option value="">Conta *</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={quickCategoryId}
                  onChange={e => setQuickCategoryId(e.target.value)}
                  className="bg-input border border-border px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                >
                  <option value="">Categoria</option>
                  {categories
                    .filter(c => c.type === quickAddType || c.type === 'Ambos')
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer text-white ${quickAddType === 'Despesa' ? 'bg-destructive' : 'bg-success'}`}
              >
                Confirmar {quickAddType}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
