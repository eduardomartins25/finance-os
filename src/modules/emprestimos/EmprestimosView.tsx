import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { LoanService } from '../../services/LoanService';
import { Plus, Check, Landmark, X, Briefcase, TrendingDown, Target, Building, Zap } from 'lucide-react';
import type { Loan, LoanStatus } from '../../types';
import { LoanRepository } from '../../database/repositories';

export const EmprestimosView: React.FC = () => {
  const { loans, transactions, accounts } = useStore();
  const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos'>('ativos');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalAmountNum, setTotalAmountNum] = useState(0);
  const [installmentValue, setInstallmentValue] = useState('');
  const [installmentValueNum, setInstallmentValueNum] = useState(0);
  const [installments, setInstallments] = useState(12);
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Amortize Modal State
  const [isAmortizeModalOpen, setIsAmortizeModalOpen] = useState(false);
  const [amortizeLoan, setAmortizeLoan] = useState<Loan | null>(null);
  const [amortizeCount, setAmortizeCount] = useState(1);
  const [amortizeValue, setAmortizeValue] = useState('');
  const [amortizeValueNum, setAmortizeValueNum] = useState(0);
  const [amortizeDate, setAmortizeDate] = useState(() => new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'Ativo'), [loans]);
  const completedLoans = useMemo(() => loans.filter(l => l.status === 'Concluído'), [loans]);

  const displayedLoans = activeTab === 'ativos' ? activeLoans : completedLoans;

  // Calculate Progress
  const getLoanProgress = (loan: Loan) => {
    const loanTxs = transactions.filter(tx => tx.loanId === loan.id);
    const paidTxs = loanTxs.filter(tx => tx.status === 'Efetivado');
    const amortizedCount = loan.amortizedCount || 0;
    
    // Se o usuário apagar manualmente no Lançamentos, o total diminui.
    // Mas se ele usar o botão Amortizar, nós somamos as amortizadas de volta para o total não cair!
    const effectiveTotal = loanTxs.length + amortizedCount;
    
    // Total de parcelas pagas = parcelas Efetivadas + parcelas deletadas por amortização
    const paidCount = paidTxs.length + amortizedCount;
    
    const paidAmount = paidTxs.reduce((sum, tx) => sum + tx.value, 0);
    return {
      paidCount,
      effectiveTotal,
      paidAmount,
      progressPercentage: effectiveTotal > 0 ? Math.min(100, Math.round((paidCount / effectiveTotal) * 100)) : 0
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || totalAmountNum <= 0 || installmentValueNum <= 0) return;

    try {
      setIsSubmitting(true);
      if (editingLoan) {
        await LoanRepository.update(editingLoan.id, {
          name,
          totalAmount: totalAmountNum,
          installmentValue: installmentValueNum
        });
      } else {
        if (installments <= 0) return;
        const dateObj = new Date(firstDueDate + 'T12:00:00');
        await LoanService.createLoanWithInstallments(
          name,
          totalAmountNum,
          installmentValueNum,
          installments,
          dateObj,
          accountId || undefined
        );
      }

      // Reset
      setName('');
      setTotalAmount(''); setTotalAmountNum(0);
      setInstallmentValue(''); setInstallmentValueNum(0);
      setInstallments(12);
      setAccountId('');
      setIsModalOpen(false);
      setEditingLoan(null);
      
    } catch (err: any) {
      alert(`Erro ao salvar financiamento: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (loanId: string) => {
    if (confirm('Atenção: Isso enviará o empréstimo para Concluídos e cancelará as parcelas futuras pendentes. Deseja continuar?')) {
      try {
        await LoanService.deleteLoanAndTransactions(loanId);
      } catch (err: any) {
        alert(`Erro: ${err.message}`);
      }
    }
  };

  const handleAmortize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amortizeLoan || amortizeCount <= 0 || amortizeValueNum <= 0) return;

    try {
      const paymentDate = new Date(amortizeDate + 'T12:00:00');
      await LoanService.amortizeInstallments(
        amortizeLoan.id,
        amortizeCount,
        amortizeValueNum,
        accountId || 'default',
        paymentDate
      );
      
      setIsAmortizeModalOpen(false);
      setAmortizeLoan(null);
      setAmortizeValue('');
      setAmortizeValueNum(0);
      setAmortizeCount(1);
      setAmortizeDate(new Date().toISOString().split('T')[0]);
      setAccountId('');
      alert('Amortização realizada com sucesso!');
    } catch (err: any) {
      alert(`Erro na amortização: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empréstimos e Financiamentos</h1>
            <p className="text-muted-foreground mt-1 text-sm">Gerencie seus créditos de longo prazo, como imóveis e veículos.</p>
          </div>
          <button
            onClick={() => {
              setEditingLoan(null);
              setName('');
              setTotalAmount(''); setTotalAmountNum(0);
              setInstallmentValue(''); setInstallmentValueNum(0);
              setInstallments(12);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
          >
            <Plus size={18} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('ativos')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'ativos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Em Andamento ({activeLoans.length})
        </button>
        <button
          onClick={() => setActiveTab('concluidos')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'concluidos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Concluídos ({completedLoans.length})
        </button>
      </div>

      {/* Loan List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedLoans.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-card border border-border rounded-2xl border-dashed">
            <Building size={48} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum contrato {activeTab === 'ativos' ? 'ativo' : 'concluído'} encontrado.</p>
            {activeTab === 'ativos' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-primary font-semibold hover:underline"
              >
                Criar seu primeiro financiamento
              </button>
            )}
          </div>
        ) : (
          displayedLoans.map(loan => {
            const { paidCount, effectiveTotal, progressPercentage } = getLoanProgress(loan);
            return (
              <div key={loan.id} className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between group">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base line-clamp-1">{loan.name}</h4>
                      <span className="text-xs text-muted-foreground">Criado em {new Date(loan.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-1">
                      {activeTab === 'ativos' ? (
                        <>
                          <button
                            onClick={() => {
                              setAmortizeLoan(loan);
                              setAmortizeCount(1);
                              setAmortizeValue(String(loan.installmentValue));
                              setAmortizeValueNum(loan.installmentValue);
                              setAmortizeDate(new Date().toISOString().split('T')[0]);
                              setIsAmortizeModalOpen(true);
                            }}
                            className="text-muted-foreground hover:text-warning p-1 cursor-pointer transition-opacity"
                            title="Amortizar Parcela(s)"
                          >
                            <Zap size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingLoan(loan);
                              setName(loan.name);
                              setTotalAmount(String(loan.totalAmount)); setTotalAmountNum(loan.totalAmount);
                              setInstallmentValue(String(loan.installmentValue)); setInstallmentValueNum(loan.installmentValue);
                              setIsModalOpen(true);
                            }}
                            className="text-muted-foreground hover:text-primary p-1 cursor-pointer transition-opacity"
                            title="Editar Contrato"
                          >
                            <Target size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="text-muted-foreground hover:text-success p-1 cursor-pointer transition-opacity"
                            title="Concluir / Arquivar Contrato"
                          >
                            <Check size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            if(confirm('Tem certeza que deseja excluir permanentemente este histórico de contrato?')) {
                              await LoanService.permanentlyDeleteLoan(loan.id);
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer transition-opacity"
                          title="Excluir Permanentemente"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Balance / Values */}
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block">Valor Total</span>
                      <span className="text-2xl font-extrabold">{formatCurrency(loan.totalAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Parcela</span>
                      <span className="text-sm font-semibold">{formatCurrency(loan.installmentValue)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-primary">{progressPercentage}%</span>
                      <span className="text-muted-foreground">{paidCount} / {effectiveTotal} pagas</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500 rounded-full" 
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {loan.amortizedSavings ? (
                    <div className="mt-2 flex items-center justify-between text-xs bg-success/10 text-success p-2.5 rounded-lg border border-success/20">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <TrendingDown size={14} />
                        Economia Total
                      </div>
                      <span className="font-bold">{formatCurrency(loan.amortizedSavings)}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
                      Disponível para baixa em <strong>Lançamentos</strong>.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold">{editingLoan ? 'Editar Contrato' : 'Novo Contrato (Financiamento/Empréstimo)'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome do Contrato *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Financiamento da Casa, Carro, Empréstimo Pessoal..."
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor Total (R$) *</label>
                  <CurrencyInput
                    value={totalAmount}
                    onChange={(raw, num) => { setTotalAmount(raw); setTotalAmountNum(num); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor da Parcela (R$) *</label>
                  <CurrencyInput
                    value={installmentValue}
                    onChange={(raw, num) => { setInstallmentValue(raw); setInstallmentValueNum(num); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              {!editingLoan && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Total de Meses (Parcelas) *</label>
                    <input
                      type="number"
                      min={1} max={600}
                      value={installments}
                      onChange={e => setInstallments(parseInt(e.target.value) || 1)}
                      className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Primeiro Vencimento *</label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={e => setFirstDueDate(e.target.value)}
                      className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none cursor-pointer"
                      required
                    />
                  </div>
                </div>
              )}

              {!editingLoan && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta Vinculada (Opcional)</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Selecione uma conta bancária...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                    Se preenchido, os pagamentos das parcelas descontarão diretamente desta conta.
                  </p>
                </div>
              )}
              {!editingLoan && (
                <div className="text-[10px] text-muted-foreground bg-muted/20 p-3 rounded-lg">
                  <p>
                    Os {installments} lançamentos futuros serão gerados como "Pendentes" e você poderá pagá-los um a um nos próximos meses pelas abas de Contas ou Lançamentos.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-primary-foreground font-semibold py-3 rounded-xl transition-opacity mt-4 ${isSubmitting ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:opacity-90 cursor-pointer'}`}
              >
                {isSubmitting ? 'Salvando...' : (editingLoan ? 'Salvar Alterações' : 'Criar Financiamento')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Amortize Modal */}
      {isAmortizeModalOpen && amortizeLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-warning/10">
              <h2 className="text-lg font-bold text-warning-foreground flex items-center gap-2">
                <Zap size={20} className="text-warning" />
                Amortizar Financiamento
              </h2>
              <button onClick={() => setIsAmortizeModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAmortize} className="p-5 space-y-4">
              <div className="text-sm text-muted-foreground">
                A amortização adianta as <strong>últimas parcelas</strong> pendentes do financiamento, reduzindo o tempo e os juros totais do contrato.
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nº de Parcelas *</label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={amortizeCount}
                    onChange={e => setAmortizeCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor Original Total</label>
                  <div className="w-full bg-muted/50 border border-border px-3 py-2 rounded-lg text-sm font-mono text-muted-foreground cursor-not-allowed">
                    {formatCurrency(amortizeLoan.installmentValue * amortizeCount)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-warning mb-1">Valor Efetivo a Pagar (Amortizado) *</label>
                  <CurrencyInput
                    value={amortizeValue}
                    onChange={(raw, num) => { setAmortizeValue(raw); setAmortizeValueNum(num); }}
                    className="w-full bg-input border-2 border-warning/50 focus:border-warning px-3 py-2 rounded-lg text-lg font-bold font-mono focus:outline-none text-warning-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    value={amortizeDate}
                    onChange={e => setAmortizeDate(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-lg font-mono focus:outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Conta de Saída *</label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>
                  ))}
                </select>
              </div>

              <div className="text-[10px] text-muted-foreground bg-muted/20 p-3 rounded-lg">
                <p>
                  As {amortizeCount} últimas parcelas serão consolidadas em <strong>1 única saída</strong> na sua conta de Lançamentos com a data de hoje.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-warning text-warning-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity mt-4 cursor-pointer"
              >
                Confirmar Amortização
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmprestimosView;
