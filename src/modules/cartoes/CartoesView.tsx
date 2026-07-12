import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { CardRepository, InstallmentRepository } from '../../database/repositories';
import { TransactionService } from '../../services/TransactionService';
import { parseCurrency } from '../../utils/currency';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Plus, CreditCard, Trash2, Check, Pencil, X } from 'lucide-react';
import type { Installment, Transaction } from '../../types';

export const CartoesView: React.FC = () => {
  const { cards, accounts, transactions, categories, subscriptions, loading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const txMap = useMemo(() => new Map(transactions.map(t => [t.id, t])), [transactions]);

  // Form State for Card
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [brand, setBrand] = useState('Mastercard');
  const [last4Digits, setLast4Digits] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [limit, setLimit] = useState('');
  const [limitNum, setLimitNum] = useState(0);
  const [closingDay, setClosingDay] = useState(5);
  const [dueDay, setDueDay] = useState(12);
  const [associatedAccountId, setAssociatedAccountId] = useState('');

  // Invoice view state
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Quick card purchase modal
  const [isQuickPurchaseOpen, setIsQuickPurchaseOpen] = useState(false);
  const [qpDescription, setQpDescription] = useState('');
  const [qpValue, setQpValue] = useState('');
  const [qpValueNum, setQpValueNum] = useState(0);
  const [qpInstallments, setQpInstallments] = useState(1);
  const [qpDate, setQpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qpCategoryId, setQpCategoryId] = useState('');
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentAmountNum, setPaymentAmountNum] = useState(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Edit card state
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClosingDay, setEditClosingDay] = useState(5);
  const [editDueDay, setEditDueDay] = useState(12);
  const [editLimit, setEditLimit] = useState('');
  const [editLimitNum, setEditLimitNum] = useState(0);

  // Edit transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  const brands = ['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outro'];
  const colors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#2563eb', '#111827', '#e2e8f0'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Load installments for the selected card
  useEffect(() => {
    if (selectedCardId) {
      InstallmentRepository.getByCard(selectedCardId).then(setInstallments);
    } else {
      setInstallments([]);
    }
  }, [selectedCardId, cards]);

  // Filter installments for the selected invoice period
  const selectedCard = useMemo(() => {
    return cards.find(c => c.id === selectedCardId);
  }, [selectedCardId, cards]);



  // Filter installments for the selected invoice period
  const invoiceDetails = useMemo(() => {
    if (!selectedCardId || !invoiceDate) return { items: [], total: 0 };
    
    const [yearStr, monthStr] = invoiceDate.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed

    const items: any[] = installments.filter(inst => {
      const d = new Date(inst.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && inst.status !== 'Cancelada';
    }).map(inst => ({ ...inst, isVirtual: false }));

    const invoiceEndDate = new Date(year, month + 1, 0);

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return { items, total };
  }, [installments, selectedCardId, invoiceDate, selectedCard]);

  const isInvoiceFullyPaid = invoiceDetails.items.length > 0 && invoiceDetails.items.every(item => item.status === 'Paga');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bank || !limit) return;

    await CardRepository.create({
      name,
      bank,
      brand,
      last4Digits: last4Digits || '0000',
      color,
      icon: 'CreditCard',
      limit: limitNum,
      limitAvailable: limitNum,
      closingDay: Number(closingDay),
      dueDay: Number(dueDay),
      isActive: true,
      associatedAccountId: associatedAccountId || undefined
    });

    // Reset Card Form
    setName('');
    setBank('');
    setBrand('Mastercard');
    setLast4Digits('');
    setColor('#8b5cf6');
    setLimit('');
    setClosingDay(5);
    setDueDay(12);
    setAssociatedAccountId('');
    setIsModalOpen(false);

  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cartão de crédito?')) {
      await CardRepository.softDelete(id);
      if (selectedCardId === id) setSelectedCardId(null);
    }
  };

  const openEditCard = (card?: any) => {
    const targetCard = card || selectedCard;
    if (!targetCard) return;
    setEditName(targetCard.name);
    setEditClosingDay(targetCard.closingDay);
    setEditDueDay(targetCard.dueDay);
    setEditLimit(targetCard.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setEditLimitNum(targetCard.limit);
    setIsEditCardOpen(true);
  };

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    await CardRepository.update(selectedCard.id, {
      name: editName,
      closingDay: editClosingDay,
      dueDay: editDueDay,
      limit: editLimitNum
    });
    setIsEditCardOpen(false);
  };

  const handleCancelPurchase = async (transactionId: string) => {
    if (!confirm('Cancelar esta compra? As parcelas em aberto serão canceladas e o limite devolvido. Parcelas já pagas não serão afetadas.')) return;
    try {
      await TransactionService.cancelCardPurchase(transactionId);
      const insts = await InstallmentRepository.getByCard(selectedCardId!);
      setInstallments(insts);
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err.message}`);
    }
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDescription(tx.description);
    setEditCategoryId(tx.categoryId || '');
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      await TransactionService.update(editingTx.id, {
        description: editDescription,
        categoryId: editCategoryId || undefined
      });
      setEditingTx(null);
    } catch (err: any) {
      alert(`Erro ao editar: ${err.message}`);
    }
  };

  const handleQuickPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId || !qpDescription || qpValueNum <= 0) return;
    try {
      await TransactionService.createCardPurchase(
        { cardId: selectedCardId, value: qpValueNum, description: qpDescription, categoryId: qpCategoryId || undefined, date: new Date(qpDate + 'T12:00:00') },
        qpInstallments
      );
      setIsQuickPurchaseOpen(false);
      setQpDescription(''); setQpValue(''); setQpValueNum(0); setQpInstallments(1); setQpCategoryId('');
      setQpDate(new Date().toISOString().split('T')[0]);
      const insts = await InstallmentRepository.getByCard(selectedCardId);
      setInstallments(insts);
    } catch (err: any) {
      alert(`Erro ao lançar: ${err.message}`);
    }
  };

  const openPayInvoice = () => {
    if (!selectedCardId || invoiceDetails.total <= 0) return;
    setPaymentAmountStr(invoiceDetails.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setPaymentAmountNum(invoiceDetails.total);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPayInvoiceOpen(true);
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId || !paymentAccountId || paymentAmountNum <= 0) return;

    try {
      const [yearStr, monthStr] = invoiceDate.split('-');
      const invoiceRefDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, selectedCard?.dueDay || 10);
      const actualPaymentDate = new Date(paymentDate + 'T12:00:00');

      await TransactionService.payInvoice(
        selectedCardId, 
        invoiceRefDate, 
        paymentAccountId,
        paymentAmountNum,
        actualPaymentDate
      );
      
      setIsPayInvoiceOpen(false);
      setPaymentAccountId('');
      
      // Refresh local installments
      const insts = await InstallmentRepository.getByCard(selectedCardId);
      setInstallments(insts);
      
      alert('Fatura paga com sucesso!');
    } catch (err: any) {
      alert(`Erro ao pagar fatura: ${err.message}`);
    }
};

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
            <p className="text-muted-foreground mt-1 text-sm">Controle seus cartões, limites e faturas.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
          >
            <Plus size={18} />
            Novo Cartão
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl shadow-sm">
          <CreditCard size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Nenhum cartão cadastrado</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Cadastre seus cartões de crédito para registrar parcelamentos automáticos e acompanhar limites.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:opacity-90 cursor-pointer"
          >
            Adicionar Primeiro Cartão
          </button>
        </div>
      ) : selectedCard ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedCardId(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium transition-colors">
             &larr; Voltar para Grade de Cartões
          </button>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Header detail */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border p-5" style={{ borderTopColor: selectedCard.color, borderTopWidth: 3 }}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{selectedCard.name}</h3>
                  <button
                    onClick={() => openEditCard(selectedCard)}
                    className="text-muted-foreground hover:text-primary p-1 rounded cursor-pointer transition-colors"
                    title="Editar Cartão"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fechamento: Dia {selectedCard.closingDay} • Vencimento: Dia {selectedCard.dueDay}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="month" 
                  value={invoiceDate} 
                  onChange={e => setInvoiceDate(e.target.value)}
                  onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                  className="bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
                />
                <button
                  onClick={() => setIsQuickPurchaseOpen(true)}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm"
                  title="Lançar nova compra no cartão"
                >
                  <Plus size={16} /> Nova Compra
                </button>
              </div>
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-border border-b border-border">
              <div className="p-4">
                <span className="text-xs text-muted-foreground">Total da Fatura</span>
                <p className="text-2xl font-bold text-destructive mt-0.5">{formatCurrency(invoiceDetails.total)}</p>
              </div>
              <div className="p-4">
                <span className="text-xs text-muted-foreground">Limite Disponível</span>
                <p className="text-2xl font-bold text-success mt-0.5">{formatCurrency(selectedCard.limitAvailable)}</p>
              </div>
              <div className="p-4 flex items-center justify-center bg-muted/10">
                {invoiceDetails.total > 0 && (
                  <button
                    onClick={openPayInvoice}
                    disabled={isInvoiceFullyPaid}
                    className="w-full bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInvoiceFullyPaid ? 'Fatura Paga' : 'Pagar Fatura'}
                  </button>
                )}
              </div>
            </div>

            {/* Assinaturas aparecem como parcelas automaticamente na fatura */}

            {/* Installments detailing table */}
            <div className="overflow-x-auto">
              {invoiceDetails.items.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground text-sm">
                  Nenhuma compra programada ou parcela pendente neste mês de fatura.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse font-sans">
                  <thead className="bg-[#eef5fc] dark:bg-slate-800 text-[#0f5298] dark:text-blue-300 font-semibold border-b border-border">
                    <tr>
                      <th className="p-2 border-r border-border text-center w-16">Ações</th>
                      <th className="p-2 border-r border-border w-24 text-center">Data Compra</th>
                      <th className="p-2 border-r border-border w-24 text-center">Data Venc.</th>
                      <th className="p-2 border-r border-border w-28 text-right">Valor</th>
                      <th className="p-2 border-r border-border">Descrição</th>
                      <th className="p-2 border-r border-border w-24 text-center">Parcela</th>
                      <th className="p-2 w-24 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceDetails.items.map((item, idx) => {
                      const dueDate = new Date(item.dueDate);
                      const tx = txMap.get(item.transactionId);
                      const purchaseDate = tx ? new Date(tx.date) : dueDate;
                      const description = tx ? tx.description : 'Compra no Cartão';
                      return (
                        <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-card' : 'bg-[#f7f9fa] dark:bg-muted/20'} border-b border-border`}>
                          <td className="p-1.5 border-r border-border text-center align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              {tx && (
                                <button
                                  onClick={() => openEditTx(tx)}
                                  className="text-amber-600 hover:text-amber-700 cursor-pointer"
                                  title="Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                              )}
                              {item.status === 'Prevista' && (
                                <button
                                  onClick={() => handleCancelPurchase(item.transactionId)}
                                  className="text-slate-500 hover:text-destructive cursor-pointer"
                                  title="Cancelar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2 border-r border-border text-center text-muted-foreground whitespace-nowrap">
                            {purchaseDate.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2 border-r border-border text-center text-muted-foreground whitespace-nowrap">
                            {dueDate.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2 border-r border-border text-right font-semibold text-destructive whitespace-nowrap">
                            {formatCurrency(item.value)}
                          </td>
                          <td className="p-2 border-r border-border font-medium">
                            {description}
                          </td>
                          <td className="p-2 border-r border-border text-center text-muted-foreground">
                            {item.totalInstallments > 0 ? `${item.number} / ${item.totalInstallments}` : '-'}
                          </td>
                           <td className="p-2 text-center">
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                              backgroundColor: item.status === 'Paga' ? '#d4edda' : item.status === 'Prevista' ? '#cce5ff' : item.status === 'Na Fatura' ? '#fff3cd' : 'var(--muted)',
                              color: item.status === 'Paga' ? '#155724' : item.status === 'Prevista' ? '#004085' : item.status === 'Na Fatura' ? '#856404' : 'var(--muted-foreground)'
                            }}>{item.status}</span>
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
          {cards.map(card => {
            const progress = card.limit > 0 ? Math.min(((card.limit - card.limitAvailable) / card.limit) * 100, 100) : 0;
            return (
              <div
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: card.color }} />
                
                <div className="flex justify-between items-start pt-1">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: card.color }}>
                      <CreditCard size={20} />
                    </div>
                    <h4 className="font-semibold text-base">{card.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); openEditCard(card); }}
                      className="text-muted-foreground hover:text-primary p-1 rounded cursor-pointer"
                      title="Editar Cartão"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(card.id); }}
                      className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                      title="Desativar Cartão"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite Disponível</span>
                    <span className="font-bold">{formatCurrency(card.limitAvailable)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${progress > 80 ? 'bg-destructive' : 'bg-primary'}`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right pt-1">
                    Total: {formatCurrency(card.limit)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Novo Cartão de Crédito</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome do Cartão *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Nubank Ultra" 
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Banco emissor *</label>
                  <input 
                    type="text" 
                    value={bank} 
                    onChange={e => setBank(e.target.value)}
                    placeholder="Ex: Nubank" 
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Bandeira *</label>
                  <select 
                    value={brand} 
                    onChange={e => setBrand(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  >
                    {brands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Limite Total (R$) *</label>
                  <CurrencyInput
                    value={limit} 
                    onChange={(raw, num) => { setLimit(raw); setLimitNum(num); }}
                    placeholder="5.000,00"
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Últimos 4 Dígitos</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    value={last4Digits} 
                    onChange={e => setLast4Digits(e.target.value)}
                    placeholder="1234" 
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Dia Fechamento *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={28}
                    value={closingDay} 
                    onChange={e => setClosingDay(parseInt(e.target.value))}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Dia Vencimento *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={28}
                    value={dueDay} 
                    onChange={e => setDueDay(parseInt(e.target.value))}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cor</label>
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

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Salvar Cartão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      {isPayInvoiceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Pagar Fatura ({formatCurrency(invoiceDetails.total)})</h2>
              <button onClick={() => setIsPayInvoiceOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Fechar
              </button>
            </div>

            <form onSubmit={handlePayInvoice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Data do Pagamento *</label>
                <input 
                  type="date" 
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor a Pagar *</label>
                <CurrencyInput
                  value={paymentAmountStr}
                  onChange={(raw, num) => { setPaymentAmountStr(raw); setPaymentAmountNum(num); }}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono font-bold text-destructive"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">Se pagar menos que o total, o restante será lançado para a fatura do próximo mês.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta de Origem do Pagamento *</label>
                <select 
                  value={paymentAccountId} 
                  onChange={e => setPaymentAccountId(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Selecione uma conta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.currentBalance)})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm hover:opacity-90 cursor-pointer"
              >
                Confirmar Pagamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {isEditCardOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Editar Cartão</h2>
              <button onClick={() => setIsEditCardOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Fechar
              </button>
            </div>

            <form onSubmit={handleEditCard} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome do Cartão *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Dia Fechamento *</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={editClosingDay}
                    onChange={e => setEditClosingDay(parseInt(e.target.value))}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Dia Vencimento *</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={editDueDay}
                    onChange={e => setEditDueDay(parseInt(e.target.value))}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Limite Total (R$) *</label>
                <CurrencyInput
                  value={editLimit}
                  onChange={(raw, num) => { setEditLimit(raw); setEditLimitNum(num); }}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm hover:opacity-90 cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction (Purchase) Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Editar Compra</h2>
              <button onClick={() => setEditingTx(null)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleUpdateTx} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria (Opcional)</label>
                <select
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Deseja alterar o valor ou parcelamento? Cancele esta compra e crie uma nova.
              </p>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm hover:opacity-90 cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Card Purchase Modal */}
      {isQuickPurchaseOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                Nova Compra — {selectedCard?.name}
              </h2>
              <button onClick={() => setIsQuickPurchaseOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleQuickPurchase} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor (R$) *</label>
                <CurrencyInput
                  value={qpValue}
                  onChange={(raw, num) => { setQpValue(raw); setQpValueNum(num); }}
                  autoFocus
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição *</label>
                <input
                  type="text"
                  value={qpDescription}
                  onChange={e => setQpDescription(e.target.value)}
                  placeholder="Ex: Compra Mercado, Restaurante..."
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Parcelas</label>
                  <input
                    type="number"
                    min={1} max={48}
                    value={qpInstallments}
                    onChange={e => setQpInstallments(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data da Compra</label>
                  <input
                    type="date"
                    value={qpDate}
                    onChange={e => setQpDate(e.target.value)}
                    onMouseDown={e => { e.preventDefault(); (e.target as HTMLInputElement).showPicker?.(); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria (opcional)</label>
                <select
                  value={qpCategoryId}
                  onChange={e => setQpCategoryId(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 cursor-pointer"
              >
                Lançar Compra
              </button>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};
export default CartoesView;

