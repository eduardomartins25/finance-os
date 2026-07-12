import React, { useMemo, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Activity,
  Calendar,
  Target,
  Bell,
  Settings,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calculator
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenQuickAdd: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenQuickAdd }) => {
  const { accounts, cards, transactions, categories, loading, currentUser } = useStore();
  const [hideBalance, setHideBalance] = useState(false);

  const formatCurrency = (val: number) =>
    hideBalance ? '••••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatCurrencyReal = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const now = new Date();

  // ── STATS ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalBalance = accounts
      .filter(a => a.isActive)
      .reduce((sum, acc) => sum + acc.currentBalance, 0);

    let incomes = 0;
    let expenses = 0;
    let predictedIncomes = 0;
    let predictedExpenses = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const isCurrentMonth =
        txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';

      if (isCurrentMonth && !isCardPurchase) {
        if (tx.status === 'Efetivado') {
          if (tx.type === 'Receita') incomes += tx.value;
          if (tx.type === 'Despesa') expenses += tx.value;
        } else if (tx.status === 'Previsto') {
          if (tx.type === 'Receita') predictedIncomes += tx.value;
          if (tx.type === 'Despesa') predictedExpenses += tx.value;
        }
      }
    });

    const totalLimit = cards.filter(c => c.isActive).reduce((s, c) => s + c.limit, 0);
    const totalLimitAvailable = cards.filter(c => c.isActive).reduce((s, c) => s + c.limitAvailable, 0);
    const totalLimitUsed = totalLimit - totalLimitAvailable;

    return { 
      totalBalance, 
      monthIncomes: incomes, 
      monthExpenses: expenses, 
      predictedIncomes,
      predictedExpenses,
      totalLimit, 
      totalLimitAvailable, 
      totalLimitUsed 
    };
  }, [accounts, cards, transactions]);

  // ── MONTHLY CASHFLOW (last 6 months) ───────────────────────────────────
  const cashflowMonths = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      let inc = 0, exp = 0;
      transactions.forEach(tx => {
        const td = new Date(tx.date);
        const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';
        if (
          td.getMonth() === d.getMonth() &&
          td.getFullYear() === d.getFullYear() &&
          tx.status === 'Efetivado' &&
          !isCardPurchase
        ) {
          if (tx.type === 'Receita') inc += tx.value;
          if (tx.type === 'Despesa') exp += tx.value;
        }
      });
      months.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').charAt(0).toUpperCase() +
               d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').slice(1),
        inc,
        exp,
      });
    }
    const maxVal = Math.max(...months.map(m => Math.max(m.inc, m.exp)), 1);
    return months.map(m => ({ ...m, incPct: (m.inc / maxVal) * 100, expPct: (m.exp / maxVal) * 100 }));
  }, [transactions]);

  // ── CATEGORY DATA ───────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const catSum: Record<string, number> = {};
    const catMap = new Map(categories.map(c => [c.id, c]));
    let totalExpense = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const isCurrentMonth = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';
      if (isCurrentMonth && tx.status === 'Efetivado' && !isCardPurchase && tx.type === 'Despesa') {
        const catName = tx.categoryId ? catMap.get(tx.categoryId)?.name || 'Outros' : 'Sem Categoria';
        catSum[catName] = (catSum[catName] || 0) + tx.value;
        totalExpense += tx.value;
      }
    });

    const sorted = Object.entries(catSum)
      .map(([name, value]) => {
        const cat = categories.find(c => c.name === name);
        return { name, value, color: cat?.color || '#6b7280', percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0 };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { sorted, totalExpense };
  }, [transactions, categories]);

  // ── DONUT CHART ─────────────────────────────────────────────────────────
  let angle = 0;
  const conicStops = categoryData.sorted.map(cat => {
    const a = (cat.percent / 100) * 360;
    const stop = `${cat.color} ${angle}deg ${angle + a}deg`;
    angle += a;
    return stop;
  }).join(', ');
  const donutStyle = {
    background: categoryData.totalExpense > 0 ? `conic-gradient(${conicStops})` : 'conic-gradient(#e2e8f0 0deg 360deg)',
  };

  // ── UPCOMING TRANSACTIONS (next 30 days, Previsto) ───────────────────────
  const upcomingTxs = useMemo(() => {
    const today = new Date();
    const future30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return transactions
      .filter(tx => {
        const d = new Date(tx.date);
        const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';
        return tx.status === 'Previsto' && !isCardPurchase && d >= today && d <= future30;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [transactions]);



  // Merge and sort upcoming items
  const calendarItems = useMemo(() => {
    const txItems = upcomingTxs.map(tx => ({
      key: tx.id,
      name: tx.description,
      date: new Date(tx.date),
      value: tx.value,
      type: tx.type,
      color: tx.type === 'Receita' ? '#10b981' : '#ef4444',
    }));
    return txItems;
  }, [upcomingTxs]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 w-full pt-4">
        <div className="h-28 bg-card rounded-2xl"></div>
        <div className="grid grid-cols-4 gap-4"><div className="h-36 bg-card col-span-2 rounded-2xl"></div><div className="h-36 bg-card rounded-2xl"></div><div className="h-36 bg-card rounded-2xl"></div></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-12 animate-in fade-in duration-300">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">Bem-vindo de volta{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}! 👋</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Aqui está o resumo da sua vida financeira.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            + Lançar
          </button>
          <button className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Bell size={16} /></button>
          <button onClick={() => onNavigate('configuracoes')} className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Settings size={16} /></button>
        </div>
      </div>

      {/* ── ROW 1: KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        {/* Patrimônio */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-4 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
              <Wallet size={14} /> Patrimônio Atual
            </div>
            <button
              onClick={() => setHideBalance(h => !h)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded"
              title={hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}
            >
              {hideBalance ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">{formatCurrency(stats.totalBalance)}</h2>
          <p className="text-[10px] text-muted-foreground">{accounts.filter(a => a.isActive).length} conta(s) ativa(s)</p>
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20 pointer-events-none">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full stroke-primary fill-none" strokeWidth="2.5">
              <path d="M0,80 Q60,30 120,60 T240,25 T360,45 T400,30" />
            </svg>
          </div>
        </div>

        {/* Receitas */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-1.5 text-success font-medium text-xs mb-3">
            <div className="p-1 bg-success/10 rounded-md"><TrendingUp size={13} /></div> Receitas do Mês
          </div>
          <h3 className="text-lg lg:text-xl font-bold">{formatCurrency(stats.monthIncomes)}</h3>
          <div className="mt-auto pt-2">
            <p className="text-[10px] text-muted-foreground">Contas bancárias · efetivado</p>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-1.5 text-destructive font-medium text-xs mb-3">
            <div className="p-1 bg-destructive/10 rounded-md"><TrendingDown size={13} /></div> Despesas do Mês
          </div>
          <h3 className="text-lg lg:text-xl font-bold">{formatCurrency(stats.monthExpenses)}</h3>
          <div className="mt-auto pt-2">
            <p className="text-[10px] text-muted-foreground">Contas bancárias · efetivado</p>
          </div>
        </div>

        {/* Limite Disponível */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-1.5 text-blue-500 font-medium text-xs mb-3">
            <div className="p-1 bg-blue-500/10 rounded-md"><CreditCard size={13} /></div> Limite Disponível
          </div>
          <h3 className="text-lg lg:text-xl font-bold">{formatCurrencyReal(stats.totalLimitAvailable)}</h3>
          <div className="mt-auto pt-2">
            <div className="w-full bg-muted rounded-full h-1.5 mb-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${stats.totalLimit > 0 ? (stats.totalLimitAvailable / stats.totalLimit) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">de {formatCurrencyReal(stats.totalLimit)}</p>
          </div>
        </div>

      </div>

      {/* ── ROW 1.5: CONTAS E CARTÕES ── */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
          <Wallet size={14} /> Minhas Contas e Cartões
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.filter(a => a.isActive).map(account => (
            <div key={account.id} onClick={() => onNavigate('contas')} className="bg-card border border-border p-3.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all flex justify-between items-center group relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: account.color || '#2563eb' }} />
               <div className="pl-2">
                 <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[100px]">{account.name}</p>
                 <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{account.bank}</p>
               </div>
               <div className="text-right">
                 <p className={`font-bold text-sm ${account.currentBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                   {formatCurrency(account.currentBalance)}
                 </p>
                 <p className="text-[10px] text-muted-foreground">Saldo Atual</p>
               </div>
            </div>
          ))}
          {cards.filter(c => c.isActive).map(card => (
            <div key={card.id} onClick={() => onNavigate('cartoes')} className="bg-card border border-border p-3.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all flex justify-between items-center group relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: card.color || '#8b5cf6' }} />
               <div className="pl-2">
                 <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[100px]">{card.name}</p>
                 <p className="text-[10px] text-muted-foreground">Final {card.last4Digits}</p>
               </div>
               <div className="text-right">
                 <p className="font-bold text-sm text-blue-500">
                   {formatCurrencyReal(card.limitAvailable)}
                 </p>
                 <p className="text-[10px] text-muted-foreground">Disp. de {formatCurrencyReal(card.limit)}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 2: CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Fluxo de Caixa */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Activity size={15} className="text-primary" /> Fluxo de Caixa — Últimos 6 meses</h3>
            <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block"></span> Receitas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block"></span> Despesas</span>
            </div>
          </div>
          <div className="h-40 flex items-end justify-around gap-1 px-2">
            {cashflowMonths.map((m, i) => {
              const hasData = m.inc > 0 || m.exp > 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  {/* Side-by-side bars */}
                  <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '85%' }}>
                    <div
                      className="flex-1 max-w-[10px] rounded-t-sm bg-success/80"
                      style={{ height: hasData ? `${Math.max(m.incPct, m.inc > 0 ? 4 : 0)}%` : '3px', opacity: hasData ? 1 : 0.3 }}
                      title={`Receita: ${formatCurrencyReal(m.inc)}`}
                    />
                    <div
                      className="flex-1 max-w-[10px] rounded-t-sm bg-destructive/80"
                      style={{ height: hasData ? `${Math.max(m.expPct, m.exp > 0 ? 4 : 0)}%` : '3px', opacity: hasData ? 1 : 0.3 }}
                      title={`Despesa: ${formatCurrencyReal(m.exp)}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1.5">{m.label}</span>
                </div>
              );
            })}
          </div>
          {/* Value summary for current month */}
          {(() => { const cur = cashflowMonths[cashflowMonths.length - 1]; return cur && (cur.inc > 0 || cur.exp > 0) ? (
            <div className="flex justify-around mt-3 pt-3 border-t border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Receitas</p>
                <p className="text-xs font-bold text-success">{formatCurrencyReal(cur.inc)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Despesas</p>
                <p className="text-xs font-bold text-destructive">{formatCurrencyReal(cur.exp)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-xs font-bold ${cur.inc - cur.exp >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrencyReal(cur.inc - cur.exp)}</p>
              </div>
            </div>
          ) : null; })()}
        </div>

        {/* Gastos por Categoria */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Target size={15} className="text-primary" /> Gastos por Categoria</h3>
            <button onClick={() => onNavigate('lancamentos')} className="text-xs text-primary hover:underline cursor-pointer">Ver lançamentos</button>
          </div>
          {categoryData.totalExpense === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-center gap-2">
              <Target size={24} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Nenhuma despesa efetivada este mês.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {categoryData.sorted.map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="text-[11px] text-muted-foreground truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-[11px] font-semibold">{formatCurrencyReal(cat.value)}</span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(cat.percent)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── ROW 3: PROJEÇÃO DO MÊS ── */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-primary" />
          <h3 className="text-sm font-bold">Projeção de Fechamento do Mês</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* O que já aconteceu */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
              <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary" /> Já Efetivado</h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-semibold text-success">{formatCurrencyReal(stats.monthIncomes)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-semibold text-destructive">{formatCurrencyReal(stats.monthExpenses)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2.5 border-t border-border/50 mt-1">
                  <span className="font-semibold">Saldo Parcial</span>
                  <span className={`font-bold ${stats.monthIncomes - stats.monthExpenses >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrencyReal(stats.monthIncomes - stats.monthExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* O que falta acontecer */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
              <h4 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={13} className="text-primary" /> Próximos (Previsto)</h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">A Receber</span>
                  <span className="font-semibold text-success">{formatCurrencyReal(stats.predictedIncomes)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">A Pagar</span>
                  <span className="font-semibold text-destructive">{formatCurrencyReal(stats.predictedExpenses)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2.5 border-t border-border/50 mt-1">
                  <span className="font-semibold">Impacto Final</span>
                  <span className={`font-bold ${stats.predictedIncomes - stats.predictedExpenses >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrencyReal(stats.predictedIncomes - stats.predictedExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Saldo Final Projetado */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <Target size={64} className="absolute -right-4 -bottom-4 text-primary/10" />
            <h4 className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-2 relative z-10">Saldo Projetado p/ Fim do Mês</h4>
            <p className={`text-3xl font-black tracking-tighter relative z-10 ${stats.totalBalance + stats.predictedIncomes - stats.predictedExpenses >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(stats.totalBalance + stats.predictedIncomes - stats.predictedExpenses)}
            </p>
            <p className="text-[9px] text-muted-foreground mt-3 max-w-[200px] leading-relaxed relative z-10">
              O que você tem hoje somado com tudo o que falta receber e abater até o fim do mês.
            </p>
          </div>
          
        </div>
      </div>

    </div>
  );
};

export default DashboardView;
