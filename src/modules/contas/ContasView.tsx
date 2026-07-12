import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { AccountRepository } from '../../database/repositories';
import { TransactionService } from '../../services/TransactionService';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { db } from '../../database/db';
import { Plus, Wallet, Trash2, Landmark, Check, ChevronUp, ChevronDown, ArrowLeftRight, Pencil, X } from 'lucide-react';
import type { AccountType, Transaction, TransactionStatus, Installment, TransactionType } from '../../types';

export const ContasView: React.FC = () => {
  const { accounts, transactions, cards, categories, loading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);

  const [installments, setInstallments] = useState<Installment[]>([]);
  useEffect(() => {
    db.installments.toArray().then(setInstallments);
  }, [transactions]);

  // Statement filter
  const [statementMonth, setStatementMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Corrente');
  const [bank, setBank] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialBalanceNum, setInitialBalanceNum] = useState(0);
  const [color, setColor] = useState('#2563eb');
  const [icon, setIcon] = useState('Landmark');
  const [description, setDescription] = useState('');

  // Edit tx state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNumericValue, setEditNumericValue] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<TransactionStatus>('Efetivado');

  // Quick tx state
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [qtValue, setQtValue] = useState('');
  const [qtValueNum, setQtValueNum] = useState(0);
  const [qtDescription, setQtDescription] = useState('');
  const [qtType, setQtType] = useState<TransactionType>('Despesa');
  const [qtInstallments, setQtInstallments] = useState(1);
  const [qtDate, setQtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qtStatus, setQtStatus] = useState<TransactionStatus>('Efetivado');
  const [qtCategoryId, setQtCategoryId] = useState('');

  const accountTypes: AccountType[] = [
    'Corrente', 'Poupança', 'Carteira', 'Dinheiro', 'Investimento', 'Internacional', 'Outro'
  ];

  const colors = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6b7280'
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const selectedAccount = useMemo(() =>
    accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  // Filter transactions for selected account and selected month
  const statementTxs = useMemo(() => {
    if (!selectedAccountId || !statementMonth) return [];
    
    // Virtual Faturas Logic
    const virtualFaturas: Transaction[] = [];
    const [yr, mo] = statementMonth.split('-').map(Number);
    const monthIndex = mo - 1;

    const pendingInstallments = installments.filter(inst => {
       const d = new Date(inst.dueDate);
       return inst.status === 'Prevista' && d.getFullYear() === yr && d.getMonth() === monthIndex;
    });

    const groupedByCard = pendingInstallments.reduce((acc, inst) => {
       if (!acc[inst.cardId]) acc[inst.cardId] = { total: 0, dueDate: inst.dueDate };
       acc[inst.cardId].total += inst.value;
       return acc;
    }, {} as Record<string, { total: number, dueDate: Date }>);

    for (const [cardId, data] of Object.entries(groupedByCard)) {
       const card = cards.find(c => c.id === cardId);
       virtualFaturas.push({
         id: `virtual-fat-${cardId}-${statementMonth}`,
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

    const allTxs = [...transactions, ...virtualFaturas];

    return allTxs.filter(tx => {
      // Ocultar compras de cartão do extrato da conta (só exibe o pagamento da fatura)
      if (tx.origin === 'Compra') return false;

      const d = new Date(tx.date);
      const matchAccount = tx.accountId === selectedAccountId;
      const matchMonth = d.getFullYear() === yr && (d.getMonth() + 1) === mo;
      return matchAccount && matchMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, installments, cards, selectedAccountId, statementMonth]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) return;

    try {
      await AccountRepository.create({
        name,
        type,
        bank: bank || '',
        color,
        icon: 'Landmark',
        initialBalance: initialBalanceNum,
        currentBalance: initialBalanceNum,
        description: description || undefined,
        isActive: true
      });

      setName(''); setType('Corrente'); setBank('');
      setInitialBalance(''); setInitialBalanceNum(0);
      setColor('#2563eb'); setDescription('');
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao criar conta: ${err.message}`);
    }
  };

  const handleQuickTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !qtDescription || qtValueNum <= 0) return;
    
    try {
      const dateObj = new Date(qtDate + 'T12:00:00');
      await TransactionService.create({
        type: qtType,
        accountId: selectedAccountId,
        value: qtValueNum,
        description: qtDescription,
        categoryId: qtCategoryId || undefined,
        date: dateObj,
        status: qtStatus,
        origin: 'Manual'
      }, qtInstallments);
      
      setQtValue(''); setQtValueNum(0); setQtDescription('');
      setQtType('Despesa'); setQtInstallments(1); setQtStatus('Efetivado');
      setQtDate(new Date().toISOString().split('T')[0]); setQtCategoryId('');
      setIsQuickTransactionOpen(false);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar esta conta? Os lançamentos vinculados permanecerão intactos.')) {
      await AccountRepository.softDelete(id);
      if (selectedAccountId === id) setSelectedAccountId(null);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Excluir este lançamento? O saldo da conta será recalculado automaticamente.')) return;
    try {
      await TransactionService.delete(txId);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
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
      await TransactionService.update(editingTx.id, {
        description: editDescription,
        categoryId: editCategoryId || undefined,
        value: editNumericValue,
        date: new Date(editDate + 'T12:00:00'),
        status: editStatus,
        accountId: editAccountId || undefined
      });
      setEditingTx(null);
    } catch (err: any) {
      alert(`Erro ao editar: ${err.message}`);
    }
  };

  const openEditAccount = (acc: any) => {
    setName(acc.name);
    setType(acc.type);
    setBank(acc.bank);
    setColor(acc.color || '#2563eb');
    setDescription(acc.description || '');
    setIsEditAccountOpen(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    try {
      await AccountRepository.update(selectedAccountId, {
        name,
        type,
        bank,
        color,
        description: description || undefined
      });
      setIsEditAccountOpen(false);
    } catch (err: any) {
      alert(`Erro ao editar conta: ${err.message}`);
    }
  };

  // Compute monthly income/expense totals for the statement
  const statementSummary = useMemo(() => {
    let income = 0, expense = 0;
    for (const tx of statementTxs) {
      if (tx.status !== 'Efetivado') continue;
      if (tx.type === 'Receita' && tx.accountId === selectedAccountId) income += tx.value;
      if (tx.type === 'Despesa' && tx.accountId === selectedAccountId) expense += tx.value;

    }
    return { income, expense };
  }, [statementTxs, selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedAccount ? selectedAccount.name : 'Contas'}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{selectedAccount ? 'Extrato detalhado da conta.' : 'Gerencie suas contas bancárias e saldos.'}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
          >
            <Plus size={18} />
            Nova Conta
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-card border border-border rounded-2xl shadow-sm" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl shadow-sm">
          <Landmark size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Nenhuma conta cadastrada</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Para começar a gerenciar suas movimentações, crie sua primeira conta bancária ou carteira física.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:opacity-90 cursor-pointer"
          >
            Adicionar Primeira Conta
          </button>
        </div>
      ) : selectedAccount ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedAccountId(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
             ← Voltar para Contas
          </button>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">

                {/* Statement Header */}
                <div className="p-5 border-b border-border flex flex-col md:flex-row justify-between gap-3 items-start md:items-center"
                  style={{ borderTopColor: selectedAccount.color, borderTopWidth: 3 }}
                >
                  <div>
                    <h3 className="text-xl font-bold">{selectedAccount.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedAccount.bank} • {selectedAccount.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={statementMonth}
                      onChange={e => setStatementMonth(e.target.value)}
                      onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                      className="bg-input border border-border px-3 py-1.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                    />
                    <button
                      onClick={() => setIsQuickTransactionOpen(true)}
                      className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm"
                      title="Novo Lançamento nesta Conta"
                    >
                      <Plus size={16} /> Lançamento
                    </button>
                    <button
                      onClick={() => openEditAccount(selectedAccount)}
                      className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted cursor-pointer"
                      title="Editar Conta"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                {/* Balance Summary Strip */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="p-4">
                    <span className="text-xs text-muted-foreground">Saldo Atual</span>
                    <p className={`text-2xl font-bold mt-0.5 ${selectedAccount.currentBalance < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(selectedAccount.currentBalance)}
                    </p>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ChevronUp size={12} className="text-success" /> Entradas
                    </span>
                    <p className="text-xl font-semibold text-success mt-0.5">{formatCurrency(statementSummary.income)}</p>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ChevronDown size={12} className="text-destructive" /> Saídas
                    </span>
                    <p className="text-xl font-semibold text-destructive mt-0.5">{formatCurrency(statementSummary.expense)}</p>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="overflow-x-auto">
                  {statementTxs.length === 0 ? (
                    <div className="text-center py-14 text-muted-foreground text-sm">
                      Nenhuma movimentação neste mês para esta conta.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse font-sans">
                      <thead className="bg-[#eef5fc] dark:bg-slate-800 text-[#0f5298] dark:text-blue-300 font-semibold border-b border-border">
                        <tr>
                          <th className="p-2 border-r border-border text-center w-16">Ações</th>
                          <th className="p-2 border-r border-border w-24 text-center">Data</th>
                          <th className="p-2 border-r border-border w-28 text-right">Valor</th>
                          <th className="p-2 border-r border-border">Descrição</th>
                          <th className="p-2 border-r border-border w-24 text-center">Tipo</th>
                          <th className="p-2 w-24 text-center">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementTxs.map((tx, idx) => {
                          const d = new Date(tx.date);
                          const isCredit = tx.type === 'Receita';
                          return (
                            <tr key={tx.id} className={`${idx % 2 === 0 ? 'bg-card' : 'bg-[#f7f9fa] dark:bg-muted/20'} border-b border-border`}>
                              <td className="p-1.5 border-r border-border text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openEdit(tx)}
                                    className="text-amber-600 hover:text-amber-700 cursor-pointer"
                                    title="Editar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTx(tx.id)}
                                    className="text-slate-500 hover:text-destructive cursor-pointer"
                                    title="Excluir"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                                </div>
                              </td>
                              <td className="p-2 border-r border-border text-center text-muted-foreground whitespace-nowrap">
                                {d.toLocaleDateString('pt-BR')}
                              </td>
                              <td className={`p-2 border-r border-border text-right font-semibold whitespace-nowrap ${
                                isCredit ? 'text-success' : 'text-destructive'
                              }`}>
                                {formatCurrency(tx.value)}
                              </td>
                              <td className="p-2 border-r border-border font-medium">
                                {tx.description}
                              </td>
                              <td className="p-2 border-r border-border text-center text-[10px] text-muted-foreground">
                                {tx.type}
                              </td>
                              <td className="p-2 text-center">
                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                                  backgroundColor: tx.status === 'Efetivado' ? '#d4edda' : tx.status === 'Previsto' ? '#cce5ff' : 'var(--muted)',
                                  color: tx.status === 'Efetivado' ? '#155724' : tx.status === 'Previsto' ? '#004085' : 'var(--muted-foreground)'
                                }}>{tx.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {accounts.map(acc => (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className="bg-card border border-border rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: acc.color }} />

              <div className="flex justify-between items-start pt-1">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: acc.color }}>
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base">{acc.name}</h4>
                    <p className="text-xs text-muted-foreground">{acc.bank} • {acc.type}</p>
                  </div>
                </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedAccountId(acc.id); openEditAccount(acc); }}
                      className="text-muted-foreground hover:text-primary p-1 rounded cursor-pointer"
                      title="Editar Conta"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                      className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                      title="Desativar Conta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground">Saldo Atual</span>
                <p className={`text-2xl font-bold ${acc.currentBalance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(acc.currentBalance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Nova Conta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Conta Corrente Nubank"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Banco / Instituição *</label>
                  <input
                    type="text"
                    value={bank}
                    onChange={e => setBank(e.target.value)}
                    placeholder="Ex: Nubank"
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as AccountType)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {accountTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Saldo Inicial (R$) *</label>
                <CurrencyInput
                  value={initialBalance}
                  onChange={(raw, num) => { setInitialBalance(raw); setInitialBalanceNum(num); }}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cor de Destaque</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição / Notas (Opcional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Alguma nota sobre a conta..."
                  rows={2}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Salvar Conta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
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
                    disabled={!!editingTx.cardId}
                  />
                </div>
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
                    disabled={!!editingTx.cardId}
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
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
      )}

      {/* Modal Editar Conta */}
      {isEditAccountOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Editar Conta</h2>
              <button onClick={() => setIsEditAccountOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Instituição/Banco *</label>
                  <input
                    type="text"
                    value={bank}
                    onChange={e => setBank(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Cor de Identificação</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="h-9 w-12 p-0 border-0 rounded cursor-pointer bg-transparent"
                    />
                    <div className="flex gap-1 items-center flex-wrap flex-1">
                      {colors.slice(0, 5).map(c => (
                        <div key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c, outline: color === c ? '2px solid var(--foreground)' : 'none', outlineOffset: 1 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de Conta</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as AccountType)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição / Observações (Opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Transaction Modal */}
      {isQuickTransactionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Novo Lançamento
              </h2>
              <button onClick={() => setIsQuickTransactionOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setQtType('Despesa')}
                className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  qtType === 'Despesa' ? 'border-destructive text-destructive' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setQtType('Receita')}
                className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors cursor-pointer ${
                  qtType === 'Receita' ? 'border-success text-success' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Receita
              </button>
            </div>

            <form onSubmit={handleQuickTransaction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor (R$) *</label>
                <CurrencyInput
                  value={qtValue}
                  onChange={(raw, num) => { setQtValue(raw); setQtValueNum(num); }}
                  autoFocus
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição *</label>
                <input
                  type="text"
                  value={qtDescription}
                  onChange={e => setQtDescription(e.target.value)}
                  placeholder="Ex: Conta de Luz, Salário..."
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Repetições/Meses</label>
                  <input
                    type="number"
                    min={1} max={60}
                    value={qtInstallments}
                    onChange={e => setQtInstallments(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data</label>
                  <input
                    type="date"
                    value={qtDate}
                    onChange={e => setQtDate(e.target.value)}
                    onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Situação</label>
                  <select
                    value={qtStatus}
                    onChange={e => setQtStatus(e.target.value as TransactionStatus)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="Efetivado">Efetivado (Pago/Rec.)</option>
                    <option value="Previsto">Pendente (Agendado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria</label>
                  <select
                    value={qtCategoryId}
                    onChange={e => setQtCategoryId(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Sem categoria</option>
                    {categories.filter(c => c.type === qtType || c.type === 'Ambos').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
      )}

    </div>
  );
};
export default ContasView;
