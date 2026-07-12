import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { PurchaseService } from '../../services/PurchaseService';
import { PurchaseRepository } from '../../database/repositories';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Plus, Search, Trash2, ShoppingCart, Check, Camera, Eye, X, ShieldAlert, FileText } from 'lucide-react';
import type { PurchaseStatus, Purchase } from '../../types';

export const ComprasView: React.FC = () => {
  const { purchases, categories, accounts, cards, loading } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Convert wish to purchase modal
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertPurchase, setConvertPurchase] = useState<Purchase | null>(null);

  // Form Type
  const [formType, setFormType] = useState<'compra' | 'desejo'>('compra');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [valor, setValor] = useState('');
  const [valorNumerico, setValorNumerico] = useState(0);
  const [loja, setLoja] = useState('');
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Cartão' | 'Pix' | 'Outro'>('Dinheiro');
  const [contaId, setContaId] = useState('');
  const [cartaoId, setCartaoId] = useState('');
  const [status, setStatus] = useState<PurchaseStatus>('Comprado');
  const [garantiaFim, setGarantiaFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [comprovanteBase64, setComprovanteBase64] = useState<string | null>(null);
  const [generateExpense, setGenerateExpense] = useState(true);
  const [installmentsCount, setInstallmentsCount] = useState(1);

  // Convert form state
  const [cvFormaPagamento, setCvFormaPagamento] = useState<'Dinheiro' | 'Cartão' | 'Pix' | 'Outro'>('Dinheiro');
  const [cvContaId, setCvContaId] = useState('');
  const [cvCartaoId, setCvCartaoId] = useState('');
  const [cvInstallments, setCvInstallments] = useState(1);
  const [cvDate, setCvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cvGenerateExpense, setCvGenerateExpense] = useState(true);

  // Filter and Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'desejos' | 'andamento' | 'concluidos'>('andamento');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setComprovanteBase64(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openEditPurchase = (p: Purchase) => {
    setEditingPurchaseId(p.id);
    setFormType(p.status === 'Desejado' ? 'desejo' : 'compra');
    setName(p.name);
    setDescription(p.description || '');
    setCategoryId(p.categoryId || '');
    setValor(p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setValorNumerico(p.valor);
    setLoja(p.loja || '');
    if (p.dataCompra) setDataCompra(new Date(p.dataCompra).toISOString().split('T')[0]);
    setFormaPagamento(p.formaPagamento);
    setContaId(p.contaId || '');
    setCartaoId(p.cartaoId || '');
    setStatus(p.status);
    if (p.garantiaFim) setGarantiaFim(new Date(p.garantiaFim).toISOString().split('T')[0]);
    else setGarantiaFim('');
    setObservacoes(p.observacoes || '');
    setComprovanteBase64(p.comprovanteBase64 || null);
    setGenerateExpense(false);
    setInstallmentsCount(1);
    setIsModalOpen(true);
  };

  const openConvertWish = (p: Purchase) => {
    setConvertPurchase(p);
    setCvFormaPagamento('Dinheiro');
    setCvContaId('');
    setCvCartaoId('');
    setCvInstallments(1);
    setCvDate(new Date().toISOString().split('T')[0]);
    setCvGenerateExpense(true);
    setIsConvertOpen(true);
  };

  const resetForm = () => {
    setEditingPurchaseId(null);
    setFormType('compra');
    setName(''); setDescription(''); setCategoryId('');
    setValor(''); setValorNumerico(0); setLoja('');
    setDataCompra(new Date().toISOString().split('T')[0]);
    setFormaPagamento('Dinheiro');
    setContaId(''); setCartaoId('');
    setStatus('Comprado'); setGarantiaFim(''); setObservacoes('');
    setComprovanteBase64(null);
    setGenerateExpense(true); setInstallmentsCount(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !valor) return;
    const dataCompraObj = new Date(dataCompra + 'T12:00:00');
    const garantiaFimObj = garantiaFim ? new Date(garantiaFim + 'T12:00:00') : undefined;
    try {
      const purchaseData = {
        name, description: description || undefined,
        categoryId: categoryId || undefined,
        valor: valorNumerico,
        loja: loja || undefined,
        dataCompra: dataCompraObj,
        formaPagamento,
        contaId: formType === 'compra' && formaPagamento !== 'Cartão' ? (contaId || undefined) : undefined,
        cartaoId: formType === 'compra' && formaPagamento === 'Cartão' ? (cartaoId || undefined) : undefined,
        status: formType === 'desejo' ? 'Desejado' as PurchaseStatus : status,
        garantiaFim: garantiaFimObj,
        observacoes: observacoes || undefined,
        comprovanteBase64: comprovanteBase64 || undefined
      };
      const financials = {
        generateExpense: formType === 'compra' ? generateExpense : false,
        installmentsCount: formType === 'compra' ? installmentsCount : 1
      };
      if (editingPurchaseId) {
        await PurchaseService.updatePurchase(editingPurchaseId, purchaseData, financials);
      } else {
        await PurchaseService.createPurchase(purchaseData, financials);
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao salvar compra: ${err.message}`);
    }
  };

  const handleConvertWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertPurchase) return;
    try {
      await PurchaseService.updatePurchase(convertPurchase.id, {
        status: 'Comprado',
        formaPagamento: cvFormaPagamento,
        contaId: cvFormaPagamento !== 'Cartão' ? (cvContaId || undefined) : undefined,
        cartaoId: cvFormaPagamento === 'Cartão' ? (cvCartaoId || undefined) : undefined,
        dataCompra: new Date(cvDate + 'T12:00:00'),
      }, {
        generateExpense: cvGenerateExpense,
        installmentsCount: cvFormaPagamento === 'Cartão' ? cvInstallments : 1
      });
      setIsConvertOpen(false);
      setConvertPurchase(null);
    } catch (err: any) {
      alert(`Erro ao efetivar compra: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir esta compra? Os lançamentos financeiros associados não serão removidos.')) {
      await PurchaseService.deletePurchase(id);
    }
  };

  const handleUpdateStatus = async (purchase: Purchase, nextStatus: PurchaseStatus) => {
    try {
      await PurchaseRepository.update(purchase.id, { status: nextStatus });
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  const filteredPurchases = useMemo(() =>
    purchases.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.loja && p.loja.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesTab = false;
      if (activeTab === 'desejos') matchesTab = p.status === 'Desejado';
      if (activeTab === 'andamento') matchesTab = p.status === 'Comprado';
      if (activeTab === 'concluidos') matchesTab = p.status === 'Concluído' || p.status === 'Cancelado';
      
      return matchesSearch && matchesTab;
    }).sort((a, b) => new Date(b.dataCompra).getTime() - new Date(a.dataCompra).getTime()),
    [purchases, searchQuery, activeTab]
  );

  const getWarrantyStatus = (endDateString?: Date) => {
    if (!endDateString) return null;
    const end = new Date(endDateString);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expirada', color: 'text-destructive' };
    if (diffDays <= 30) return { label: `${diffDays}d restantes`, color: 'text-warning' };
    return { label: `Válida até ${end.toLocaleDateString('pt-BR')}`, color: 'text-success' };
  };

  const statusColors: Record<PurchaseStatus, string> = {
    'Desejado': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300',
    'Comprado': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'Concluído': 'bg-success/10 text-success',
    'Cancelado': 'bg-destructive/10 text-destructive'
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
            <p className="text-muted-foreground mt-1 text-sm">Gerencie compras realizadas e lista de desejos.</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
          >
            <Plus size={18} /> Cadastrar Compra
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-sm">
        <div className="flex bg-muted/50 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('desejos')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'desejos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
          >
            Lista de Desejos
          </button>
          <button
            onClick={() => setActiveTab('andamento')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'andamento' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
          >
            Em Andamento
          </button>
          <button
            onClick={() => setActiveTab('concluidos')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'concluidos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
          >
            Concluídos
          </button>
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar compra..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-input border border-border pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* List Layout */}
      {loading ? (
        <div className="animate-pulse h-48 bg-card rounded-xl border border-border"></div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
          <ShoppingCart size={40} className="text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold">Nenhuma compra encontrada</h3>
          <p className="text-muted-foreground text-xs max-w-xs mx-auto mt-1">
            {activeTab === 'desejos' ? 'Adicione itens à sua lista de desejos.' : 'Registre suas compras ou mova um desejo para esta lista.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((p) => {
            const warranty = getWarrantyStatus(p.garantiaFim);
            return (
              <div key={p.id} className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Product Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShoppingCart size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-foreground truncate flex items-center gap-2">
                      {p.name}
                      {warranty && <span className={`text-[9px] px-1.5 py-0.5 rounded bg-muted ${warranty.color}`}>{warranty.label}</span>}
                    </h4>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                      <span>Loja: {p.loja || '—'}</span>
                      <span className="hidden md:inline">•</span>
                      <span>Pagamento: {p.status === 'Desejado' ? '—' : p.formaPagamento}</span>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-1.5 truncate">{p.description}</p>}
                  </div>
                </div>

                {/* Price & Date */}
                <div className="flex flex-row md:flex-col justify-between items-center md:items-end shrink-0 md:min-w-[120px] bg-muted/30 md:bg-transparent p-3 md:p-0 rounded-lg">
                  <span className="font-bold text-lg text-foreground">{formatCurrency(p.valor)}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {new Date(p.dataCompra).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Actions & Status */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 border-t border-border/50 md:pt-0 md:border-none">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                  
                  <div className="flex items-center gap-1.5 border-l border-border/50 pl-3">
                    {p.status === 'Desejado' && (
                      <button onClick={() => openConvertWish(p)} className="text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer">
                        Comprar
                      </button>
                    )}
                    {p.status === 'Comprado' && (
                      <button onClick={() => handleUpdateStatus(p, 'Concluído')} className="text-[10px] font-bold bg-success text-white hover:bg-success/90 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer">
                        Concluir
                      </button>
                    )}
                    {p.comprovanteBase64 && (
                      <button onClick={() => { setPreviewImage(p.comprovanteBase64 || null); setIsPreviewModalOpen(true); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-md cursor-pointer" title="Ver Comprovante"><Eye size={14} /></button>
                    )}
                    <button onClick={() => openEditPurchase(p)} className="p-1.5 text-muted-foreground hover:text-amber-600 transition-colors bg-muted rounded-md cursor-pointer" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-md cursor-pointer" title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShoppingCart size={16} className="text-primary" />
                {editingPurchaseId ? 'Editar Compra / Desejo' : 'Nova Compra / Lista de Desejos'}
              </h2>
              <button onClick={() => { resetForm(); setIsModalOpen(false); }} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted/50">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3 overflow-y-auto">
              {/* Type toggle */}
              <div className="flex bg-muted/30 p-1 rounded-lg border border-border">
                <button type="button" onClick={() => setFormType('compra')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${formType === 'compra' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                  Compra Realizada
                </button>
                <button type="button" onClick={() => setFormType('desejo')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${formType === 'desejo' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                  Lista de Desejos
                </button>
              </div>

              {/* Name + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Produto *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do produto" className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor (R$) *</label>
                  <CurrencyInput value={valor} onChange={(raw, num) => { setValor(raw); setValorNumerico(num); }} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono" required />
                </div>
              </div>

              {/* Category + Store */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoria</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Loja / Estabelecimento</label>
                  <input type="text" value={loja} onChange={e => setLoja(e.target.value)} placeholder="Ex: Amazon" className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none" />
                </div>
              </div>

              {/* Payment — only for compra */}
              {formType === 'compra' && (
                <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground">Pagamento</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Forma de Pagamento</label>
                      <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value as any)} className="w-full bg-card border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                        <option value="Dinheiro">Débito / Dinheiro</option>
                        <option value="Cartão">Cartão de Crédito</option>
                        <option value="Pix">PIX</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    {formaPagamento === 'Cartão' ? (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Cartão *</label>
                        <select value={cartaoId} onChange={e => setCartaoId(e.target.value)} className="w-full bg-card border border-border px-3 py-2 rounded-lg text-sm focus:outline-none" required>
                          <option value="">Selecione...</option>
                          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Conta de Origem</label>
                        <select value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-card border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                          <option value="">Nenhuma</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="checkbox" checked={generateExpense} onChange={e => setGenerateExpense(e.target.checked)} className="rounded accent-primary" />
                      Lançar despesa no extrato automaticamente?
                    </label>
                    {generateExpense && formaPagamento === 'Cartão' && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <label className="text-xs text-muted-foreground shrink-0">Parcelas:</label>
                        <input type="number" min={1} max={48} value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)} className="w-16 bg-card border border-border px-2 py-1 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status + Date */}
              <div className="grid grid-cols-2 gap-3">
                {formType === 'compra' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value as PurchaseStatus)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                      <option value="Comprado">Em Andamento (Comprado)</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data do Registro</label>
                  <input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono" required />
                </div>
              </div>

              {formType === 'compra' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fim da Garantia (opcional)</label>
                  <input type="date" value={garantiaFim} onChange={e => setGarantiaFim(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono" />
                </div>
              )}

              {/* Receipt */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-lg border border-dashed border-border/80 cursor-pointer text-xs font-semibold">
                  <Camera size={14} /> Anexar Comprovante
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
                {comprovanteBase64 && <span className="text-xs text-success flex items-center gap-1"><Check size={12} /> Arquivo carregado</span>}
              </div>

              {/* Observations */}
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações, número de série..." className="w-full bg-input border border-border px-3 py-2 rounded-lg text-xs focus:outline-none h-14 resize-none" />

              <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg text-sm hover:opacity-90 cursor-pointer">
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Convert Wish to Purchase Modal */}
      {isConvertOpen && convertPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Check size={16} className="text-success" /> Efetivar Compra
              </h2>
              <button onClick={() => setIsConvertOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
            </div>
            <div className="px-4 pt-3 pb-1">
              <p className="text-sm font-semibold">{convertPurchase.name}</p>
              <p className="text-xs text-muted-foreground">Valor: {formatCurrency(convertPurchase.valor)}</p>
            </div>
            <form onSubmit={handleConvertWish} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Data da Compra</label>
                <input type="date" value={cvDate} onChange={e => setCvDate(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Forma de Pagamento</label>
                <select value={cvFormaPagamento} onChange={e => setCvFormaPagamento(e.target.value as any)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                  <option value="Dinheiro">Débito / Dinheiro</option>
                  <option value="Cartão">Cartão de Crédito</option>
                  <option value="Pix">PIX</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              {cvFormaPagamento === 'Cartão' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Cartão *</label>
                    <select value={cvCartaoId} onChange={e => setCvCartaoId(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Parcelas</label>
                    <input type="number" min={1} max={48} value={cvInstallments} onChange={e => setCvInstallments(parseInt(e.target.value) || 1)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta de Origem</label>
                  <select value={cvContaId} onChange={e => setCvContaId(e.target.value)} className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none">
                    <option value="">Nenhuma</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input type="checkbox" checked={cvGenerateExpense} onChange={e => setCvGenerateExpense(e.target.checked)} className="rounded accent-primary" />
                Lançar despesa no extrato automaticamente?
              </label>
              <button type="submit" className="w-full bg-success text-white font-semibold py-2 rounded-lg text-sm hover:opacity-90 cursor-pointer">
                Confirmar Compra
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden relative">
            <button onClick={() => setIsPreviewModalOpen(false)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full cursor-pointer z-50">
              <X size={16} />
            </button>
            <div className="p-6 flex justify-center items-center max-h-[80vh]">
              {previewImage?.startsWith('data:application/pdf') ? (
                <div className="text-center p-8">
                  <FileText size={48} className="text-primary mx-auto mb-2" />
                  <a href={previewImage} download="comprovante_compra.pdf" className="mt-4 inline-block bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-xs">Baixar PDF</a>
                </div>
              ) : (
                <img src={previewImage || ''} alt="Comprovante" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasView;
