import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { TransactionService } from '../../services/TransactionService';
import { db } from '../../database/db';
import { CardRepository } from '../../database/repositories';
import { Plus, Search, Trash2, Check, CreditCard, DollarSign, Pencil, TrendingUp, TrendingDown, X, Filter } from 'lucide-react';
import type { TransactionType, TransactionStatus, Transaction, Installment } from '../../types';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { CurrencyInput } from '../../components/ui/CurrencyInput';


export const LancamentosView: React.FC = () => {
  const { transactions, accounts, cards, categories, loading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);

  React.useEffect(() => {
    db.installments.toArray().then(setInstallments);
  }, [transactions]);

  // Form State
  const [entryFormType, setEntryFormType] = useState<'normal' | 'card'>('normal');
  const [type, setType] = useState<TransactionType>('Despesa');
  const [value, setValue] = useState('');
  const [numericValue, setNumericValue] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TransactionStatus>('Efetivado');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNumericValue, setEditNumericValue] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<TransactionStatus>('Efetivado');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !description) return;

    const valNum = numericValue;
    const dateObj = new Date(date + 'T12:00:00'); // Prevent UTC timezone shifting

    try {
      if (entryFormType === 'normal') {
        if (!accountId) return;
        await TransactionService.create({
          type,
          accountId,
          value: valNum,
          description,
          categoryId: categoryId || undefined,
          date: dateObj,
          status,
          origin: 'Manual'
        }, installmentsCount);
      } else if (entryFormType === 'card') {
        if (!cardId) return;
        await TransactionService.createCardPurchase(
          {
            cardId,
            value: valNum,
            description,
            categoryId,
            date: dateObj
          },
          installmentsCount
        );
        alert('Compra registrada na fatura! Acesse a aba "Cartões" para visualizar os detalhes e as parcelas desta compra.');
      }

      // Reset form
      setValue('');
      setDescription('');
      setCategoryId('');
      setAccountId('');
      setCardId('');
      setInstallmentsCount(1);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('Efetivado');
      setIsModalOpen(false);

    } catch (err: any) {
      alert(`Erro ao criar lançamento: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento? O saldo das contas/cartões vinculados será recalculado automaticamente.')) {
      await TransactionService.delete(id);
    }
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    const formatted = tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    setEditValue(formatted);
    setEditNumericValue(tx.value);
    setEditDescription(tx.description);
    setEditCategoryId(tx.categoryId || '');
    setEditAccountId(tx.accountId);
    setEditDate(new Date(tx.date).toISOString().split('T')[0]);
    setEditStatus(tx.status);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      if (editingTx.id.toString().startsWith('virtual-fat-')) {
        // Update the card's associated account
        if (editingTx.cardId && editAccountId) {
          await CardRepository.update(editingTx.cardId, { associatedAccountId: editAccountId });
        }

      } else {
        await TransactionService.update(editingTx.id, {
          description: editDescription,
          categoryId: editCategoryId || undefined,
          value: editNumericValue,
          date: new Date(editDate + 'T12:00:00'),
          status: editStatus,
          accountId: editAccountId
        });
      }
      setEditingTx(null);
    } catch (err: any) {
      alert(`Erro ao editar: ${err.message}`);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    try {
      const virtualFaturas: Transaction[] = [];
      if (filterMonth) {
        const [yearStr, monthStr] = filterMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;

        const pendingInstallments = installments.filter(inst => {
           const d = new Date(inst.dueDate);
           return inst.status === 'Prevista' && d.getFullYear() === year && d.getMonth() === month;
        });

        const groupedByCard = pendingInstallments.reduce((acc, inst) => {
           if (!acc[inst.cardId]) acc[inst.cardId] = { total: 0, dueDate: inst.dueDate };
           acc[inst.cardId].total += inst.value;
           return acc;
        }, {} as Record<string, { total: number, dueDate: Date }>);

        for (const [cardId, data] of Object.entries(groupedByCard)) {
           const card = cards.find(c => c.id === cardId);
           virtualFaturas.push({
             id: `virtual-fat-${cardId}-${filterMonth}`,
             type: 'Despesa',
             value: data.total,
             description: `Fatura Prevista - ${card?.name || 'Cartão'}`,
             date: data.dueDate,
             status: 'Previsto',
             categoryId: '',
             accountId: card?.associatedAccountId || '',
             userId: '',
             createdAt: new Date(),
             updatedAt: new Date(),
             origin: 'Fatura',
             cardId: cardId,
           } as any);
        }
      }

      const allTxs = [...transactions, ...virtualFaturas];

      return allTxs.filter(tx => {
        // Hide individual credit card purchases from the list (only the Fatura should be visible)
        const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';
        if (isCardPurchase) return false;

        const txDesc = tx.description || '';
        const matchesSearch = txDesc.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' ? true : tx.type === filterType;
        const matchesAccount = filterAccountId === 'all' ? true : tx.accountId === filterAccountId;
        
        let matchesDate = true;
        if (filterMonth) {
          const [year, month] = filterMonth.split('-');
          const txDate = new Date(tx.date);
          matchesDate = txDate.getFullYear() === parseInt(year) && (txDate.getMonth() + 1) === parseInt(month);
        }
        
        return matchesSearch && matchesType && matchesAccount && matchesDate;
      });
    } catch (err) {
      console.error("Error in filteredTransactions:", err);
      return [];
    }
  }, [transactions, installments, cards, searchQuery, filterType, filterAccountId, filterMonth]);

  const filteredTotals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    filteredTransactions.forEach(tx => {
      // Don't sum credit card purchases in cashflow (the invoice payment will be summed instead)
      const isCardPurchase = tx.cardId != null && tx.origin !== 'Fatura';
      if (isCardPurchase) return;

      if (tx.type === 'Receita') receitas += tx.value;
      if (tx.type === 'Despesa') despesas += tx.value;
    });
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
            <p className="text-muted-foreground mt-1 text-sm">Registre entradas, saídas e compras parceladas.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
          >
            <Plus size={18} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Buscar lançamentos..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-input border border-border pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Filter Type */}
        <div className="flex gap-2 flex-wrap items-center">
          <input 
            type="month" 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
            className="bg-input border border-border px-3 py-2 rounded-xl text-sm focus:outline-none font-medium cursor-pointer transition-all hover:bg-muted/50"
            title="Mês de Referência"
          />
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="bg-input border border-border px-3 py-2 rounded-xl text-sm focus:outline-none transition-all hover:bg-muted/50 cursor-pointer"
          >
            <option value="all">Todos os tipos</option>
            <option value="Receita">Receitas</option>
            <option value="Despesa">Despesas</option>
          </select>

          {/* Filter Account */}
          <select 
            value={filterAccountId} 
            onChange={e => setFilterAccountId(e.target.value)}
            className="bg-input border border-border px-3 py-2 rounded-xl text-sm focus:outline-none transition-all hover:bg-muted/50 cursor-pointer"
          >
            <option value="all">Todas as contas</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/30 border border-border/50 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-success/15 rounded-xl"><TrendingUp size={20} className="text-success" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Receitas filtradas</p>
            <p className="text-xl font-bold text-success">{formatCurrency(filteredTotals.receitas)}</p>
          </div>
        </div>
        <div className="bg-muted/30 border border-border/50 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-destructive/15 rounded-xl"><TrendingDown size={20} className="text-destructive" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Despesas filtradas</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(filteredTotals.despesas)}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-card to-muted/20 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-1/4 translate-y-1/4">
            <DollarSign size={80} className={filteredTotals.saldo >= 0 ? 'text-primary' : 'text-destructive'} />
          </div>
          <div className={`p-3 rounded-xl relative z-10 ${filteredTotals.saldo >= 0 ? 'bg-primary/15' : 'bg-destructive/15'}`}>
            <DollarSign size={20} className={filteredTotals.saldo >= 0 ? 'text-primary' : 'text-destructive'} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Saldo do período</p>
            <p className={`text-xl font-black tracking-tight ${filteredTotals.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(filteredTotals.saldo)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-card border border-border rounded-lg"></div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Search size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Nenhum lançamento encontrado</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Tente mudar os filtros ou adicione uma nova movimentação para alimentar a listagem.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead className="bg-[#eef5fc] dark:bg-slate-800 text-[#0f5298] dark:text-blue-300 font-semibold border-b border-border">
                <tr>
                  <th className="p-2 border-r border-border text-center w-16">Ações</th>
                  <th className="p-2 border-r border-border w-24 text-center">Data</th>
                  <th className="p-2 border-r border-border w-28 text-right">Valor</th>
                  <th className="p-2 border-r border-border">Descrição</th>
                  <th className="p-2 border-r border-border w-24 text-center">Status</th>
                  <th className="p-2 border-r border-border w-32">Categoria</th>
                  <th className="p-2 w-32">Conta Origem</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => {
                  try {
                    const txDate = new Date(tx.date);
                    const accountName = accounts.find(a => a.id === tx.accountId)?.name || 'Cartão/Fatura';
                    const categoryName = categories.find(c => c.id === tx.categoryId)?.name || 'Sem Categoria';

                    const isVirtual = tx.id ? tx.id.toString().startsWith('virtual-') : false;
                    return (
                      <tr key={tx.id || `tx-${idx}`} className={`${idx % 2 === 0 ? 'bg-card' : 'bg-[#f7f9fa] dark:bg-muted/20'} border-b border-border ${isVirtual ? 'opacity-75' : ''}`}>
                        <td className="p-1.5 border-r border-border text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isVirtual && (
                              <>
                                <button
                                  onClick={() => openEdit(tx)}
                                  className="text-amber-600 hover:text-amber-700 cursor-pointer"
                                  title="Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(tx.id)}
                                  className="text-destructive hover:text-destructive/80 cursor-pointer"
                                  title="Excluir"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-r border-border text-center text-muted-foreground whitespace-nowrap">
                          {txDate.toLocaleDateString('pt-BR')}
                        </td>
                        <td className={`p-2 border-r border-border text-right font-semibold whitespace-nowrap ${
                          tx.type === 'Receita' ? 'text-success' : 'text-destructive'
                        }`}>
                          {formatCurrency(tx.value)}
                        </td>
                        <td className="p-2 border-r border-border">
                          {tx.description}
                          {tx.isInstallment && !tx.description?.includes('[Amortização]') && !tx.loanId && (
                            <span className="ml-2 text-[9px] text-muted-foreground">
                              ({tx.installmentNumber ? `${tx.installmentNumber}/${tx.totalInstallments}` : `x${tx.totalInstallments}`})
                            </span>
                          )}
                          {tx.cardId != null && tx.origin !== 'Fatura' && (
                            <span className="ml-2 text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                              💳 Cartão
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-border text-center">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                            backgroundColor: tx.status === 'Efetivado' ? '#d4edda' : tx.status === 'Previsto' ? '#cce5ff' : 'var(--muted)',
                            color: tx.status === 'Efetivado' ? '#155724' : tx.status === 'Previsto' ? '#004085' : 'var(--muted-foreground)'
                          }}>{tx.status}</span>
                        </td>
                        <td className="p-2 border-r border-border truncate max-w-[120px]" title={categoryName}>
                          {categoryName}
                        </td>
                        <td className="p-2 truncate max-w-[120px]" title={accountName}>
                          {accountName}
                        </td>
                      </tr>
                    );
                  } catch (err: any) {
                    return (
                      <tr key={`err-${idx}`}>
                        <td colSpan={7} className="p-2 text-center text-red-500 text-xs">Erro: {err.message}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Transaction Modal */}
      {isModalOpen && (
        <ErrorBoundary>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
            <div className="flex justify-between items-center p-5 border-b border-border bg-muted/30">
                <h2 className="text-lg font-bold">Novo Lançamento</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-muted transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setEntryFormType('normal')}
                  className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                    entryFormType === 'normal' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Conta Bancária
                </button>
                <button
                  type="button"
                  onClick={() => setEntryFormType('card')}
                  className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                    entryFormType === 'card' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cartão de Crédito
                </button>

              </div>

              <form onSubmit={handleCreate} className="p-5 space-y-4">
                {/* Type Toggle for normal */}
                {entryFormType === 'normal' && (
                  <div className="flex gap-2 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setType('Despesa')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        type === 'Despesa' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('Receita')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        type === 'Receita' ? 'bg-card text-success shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                )}

                {/* Value Input */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-muted-foreground text-sm">R$</span>
                    <CurrencyInput
                      value={value}
                      onChange={(raw, num) => { setValue(raw); setNumericValue(num); }}
                      autoFocus
                      className="w-full bg-input border border-border pl-9 pr-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-mono text-base"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição / Nome *</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Almoço no Restaurante" 
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>

                {/* Dynamic form inputs based on entryFormType */}
                <div className="grid grid-cols-2 gap-3">
                  {entryFormType === 'normal' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta Bancária *</label>
                        <select 
                          value={accountId}
                          onChange={e => setAccountId(e.target.value)}
                          className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"
                          required
                        >
                          <option value="">Selecione...</option>
                          {accounts.filter(a => a.isActive).map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria *</label>
                        <select 
                          value={categoryId}
                          onChange={e => setCategoryId(e.target.value)}
                          className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="">Nenhuma / Sem Categoria</option>
                          {categories.filter(c => c.type === type || c.type === 'Ambos').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Cartão de Crédito *</label>
                        <select 
                          value={cardId}
                          onChange={e => setCardId(e.target.value)}
                          className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"
                          required
                        >
                          <option value="">Selecione...</option>
                          {cards.filter(c => c.isActive).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria *</label>
                        <select 
                          value={categoryId}
                          onChange={e => setCategoryId(e.target.value)}
                          className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="">Nenhuma / Sem Categoria</option>
                          {categories.filter(c => c.type === 'Despesa' || c.type === 'Ambos').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Number of installments/repetitions - Common to both */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {entryFormType === 'card' ? 'Número de Parcelas *' : 'Repetições / Parcelas (Meses) *'}
                  </label>
                  <input 
                    type="number" 
                    min={1} 
                    max={60}
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                    required
                  />
                </div>

                {/* Date & Status — hide status for card entries */}
                <div className={entryFormType === 'card' ? '' : 'grid grid-cols-2 gap-3'}>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Data *</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                      className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono cursor-pointer"
                      required
                    />
                  </div>
                  {entryFormType === 'normal' && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Situação *</label>
                      <select 
                        value={status}
                        onChange={e => setStatus(e.target.value as TransactionStatus)}
                        className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                      >
                        <option value="Efetivado">Efetivado (Pago/Rec.)</option>
                        <option value="Previsto">Pendente (Agendado)</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </form>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <ErrorBoundary>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold">Editar Lançamento</h2>
              <button onClick={() => setEditingTx(null)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              {/* Value Input */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <label className="block text-xs font-semibold text-muted-foreground mb-2 text-center">Valor</label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-medium text-muted-foreground">R$</span>
                  <CurrencyInput 
                    value={editValue} 
                    onChange={(raw, num) => { setEditValue(raw); setEditNumericValue(num); }}
                    className={`text-4xl font-bold bg-transparent outline-none w-48 text-center tabular-nums ${
                      editingTx.type === 'Receita' ? 'text-success' : editingTx.type === 'Despesa' ? 'text-destructive' : 'text-primary'
                    }`}
                    placeholder="0,00"
                    required
                    disabled={!!editingTx.cardId} // Cartão não edita valor aqui
                  />
                </div>
                {editingTx.cardId && (
                  <p className="text-xs text-center text-muted-foreground mt-2">Valores de compras de cartão não podem ser editados.</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição / Nome *</label>
                <input 
                  type="text" 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                  disabled={editingTx.id.startsWith('virtual-fat-')}
                />
              </div>

              {/* Dynamic form inputs based on Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta Bancária *</label>
                  <select 
                    value={editAccountId}
                    onChange={e => setEditAccountId(e.target.value)}
                    className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"
                    required
                    disabled={!!editingTx.cardId && editingTx.origin !== 'Fatura'}
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria *</label>
                  <select 
                    value={editCategoryId}
                    onChange={e => setEditCategoryId(e.target.value)}
                    className="w-full bg-input border border-border px-2 py-2 rounded-lg text-xs focus:outline-none"

                  >
                    <option value="">Nenhuma / Sem Categoria</option>
                    {categories.filter(c => c.type === editingTx.type || c.type === 'Ambos').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data *</label>
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono cursor-pointer"
                    required
                    disabled={editingTx.id.startsWith('virtual-fat-')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Situação *</label>
                  <select 
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as TransactionStatus)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    disabled={!!editingTx.cardId}
                  >
                    <option value="Efetivado">Efetivado (Pago/Rec.)</option>
                    <option value="Previsto">Pendente (Agendado)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
        </ErrorBoundary>
      )}
    </div>
  );
};
export default LancamentosView;
