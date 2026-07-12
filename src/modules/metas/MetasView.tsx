import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { GoalSafeService } from '../../services/GoalSafeService';
import { GoalRepository } from '../../database/repositories';
import { parseCurrency } from '../../utils/currency';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { 
  Target, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Info, 
  Calendar,
  Lock,
  Wallet,
  History,
  CheckCircle,
  AlertCircle,
  Pencil
} from 'lucide-react';
import type { Safe, Goal, MovementCofre } from '../../types';

export const MetasView: React.FC = () => {
  const { safes, goals, movementsCofre, accounts, loading } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'cofres' | 'metas'>('cofres');
  
  // Modals
  const [isSafeModalOpen, setIsSafeModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Safe Form State
  const [safeName, setSafeName] = useState('');
  const [safeObjective, setSafeObjective] = useState('');
  const [safeTarget, setSafeTarget] = useState('');
  const [safeTargetNum, setSafeTargetNum] = useState(0);
  const [safeDesc, setSafeDesc] = useState('');

  // Goal Form State
  const [goalName, setGoalName] = useState('');
  const [goalObj, setGoalObj] = useState('');
  const [goalTargetVal, setGoalTargetVal] = useState('');
  const [goalTargetNum, setGoalTargetNum] = useState(0);
  const [goalCurrentVal, setGoalCurrentVal] = useState('');
  const [goalCurrentNum, setGoalCurrentNum] = useState(0);
  const [goalLimitDate, setGoalLimitDate] = useState('');

  // Safe transaction (Deposit/Withdraw) State
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [txType, setTxType] = useState<'Depósito' | 'Retirada' | 'Rendimento'>('Depósito');
  const [txAmount, setTxAmount] = useState('');
  const [txAmountNum, setTxAmountNum] = useState(0);
  const [txContaId, setTxContaId] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // History viewer state
  const [historySafe, setHistorySafe] = useState<Safe | null>(null);

  // Edit Safe State
  const [editingSafe, setEditingSafe] = useState<Safe | null>(null);
  const [editSafeName, setEditSafeName] = useState('');
  const [editSafeObjective, setEditSafeObjective] = useState('');
  const [editSafeTarget, setEditSafeTarget] = useState('');
  const [editSafeTargetNum, setEditSafeTargetNum] = useState(0);
  const [editSafeDesc, setEditSafeDesc] = useState('');

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalObj, setEditGoalObj] = useState('');
  const [editGoalTargetVal, setEditGoalTargetVal] = useState('');
  const [editGoalTargetNum, setEditGoalTargetNum] = useState(0);
  const [editGoalLimitDate, setEditGoalLimitDate] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Safe creation
  const handleCreateSafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeName || !safeTarget) return;

    try {
      await GoalSafeService.createSafe({
        name: safeName,
        objetivo: safeObjective,
        valorMeta: safeTargetNum,
        saldoAtual: 0,
        descricao: safeDesc || undefined
      });

      setSafeName('');
      setSafeObjective('');
      setSafeTarget('');
      setSafeDesc('');
      setIsSafeModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao criar cofre: ${err.message}`);
    }
  };

  // Goal creation
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTargetVal || !goalLimitDate) return;

    try {
      await GoalSafeService.createGoal({
        name: goalName,
        objetivo: goalObj,
        valorMeta: goalTargetNum,
        valorAtual: goalCurrentNum,
        dataLimite: new Date(goalLimitDate + 'T12:00:00'),
        status: 'Em Andamento'
      });

      setGoalName('');
      setGoalObj('');
      setGoalTargetVal('');
      setGoalCurrentVal('');
      setGoalLimitDate('');
      setIsGoalModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao criar meta: ${err.message}`);
    }
  };

  const openEditSafe = (s: Safe) => {
    setEditingSafe(s);
    setEditSafeName(s.name);
    setEditSafeObjective(s.objetivo);
    setEditSafeTarget(s.valorMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setEditSafeTargetNum(s.valorMeta);
    setEditSafeDesc(s.descricao || '');
  };

  const handleUpdateSafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSafe) return;
    try {
      await GoalSafeService.updateSafe(editingSafe.id, {
        name: editSafeName,
        objetivo: editSafeObjective,
        valorMeta: editSafeTargetNum,
        descricao: editSafeDesc || undefined
      });
      setEditingSafe(null);
    } catch (err: any) {
      alert(`Erro ao editar cofre: ${err.message}`);
    }
  };

  const openEditGoal = (g: Goal) => {
    setEditingGoal(g);
    setEditGoalName(g.name);
    setEditGoalObj(g.objetivo);
    setEditGoalTargetVal(g.valorMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setEditGoalTargetNum(g.valorMeta);
    setEditGoalLimitDate(new Date(g.dataLimite).toISOString().split('T')[0]);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    try {
      await GoalSafeService.updateGoal(editingGoal.id, {
        name: editGoalName,
        objetivo: editGoalObj,
        valorMeta: editGoalTargetNum,
        dataLimite: new Date(editGoalLimitDate + 'T12:00:00')
      });
      setEditingGoal(null);
    } catch (err: any) {
      alert(`Erro ao editar meta: ${err.message}`);
    }
  };

  // Delete Safe
  const handleDeleteSafe = async (id: string) => {
    if (confirm('Deseja excluir este cofre? Os saldos e movimentações locais serão arquivados, mas os lançamentos bancários continuarão existindo no seu extrato.')) {
      await GoalSafeService.deleteSafe(id);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    if (confirm('Deseja excluir esta meta financeira?')) {
      await GoalSafeService.deleteGoal(id);
    }
  };

  // Manual update goal progress
  const handleAdjustGoal = async (goalId: string, diff: number) => {
    try {
      await GoalRepository.adjustProgress(goalId, diff);
    } catch (err: any) {
      alert(`Erro ao ajustar progresso: ${err.message}`);
    }
  };

  // Deposit/Withdraw Safe Execution
  const handleSafeTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSafe || !txAmount) return;
    if (txType !== 'Rendimento' && !txContaId) return;

    const amount = txAmountNum;
    const date = new Date(txDate + 'T12:00:00');
    try {
      if (txType === 'Depósito') {
        await GoalSafeService.depositToSafe(selectedSafe.id, txContaId, amount, date);
      } else if (txType === 'Retirada') {
        await GoalSafeService.withdrawFromSafe(selectedSafe.id, txContaId, amount, date);
      } else {
        await GoalSafeService.yieldToSafe(selectedSafe.id, amount, date);
      }

      setTxAmount('');
      setTxContaId('');
      setTxDate(new Date().toISOString().split('T')[0]);
      setSelectedSafe(null);
      setIsTxModalOpen(false);
    } catch (err: any) {
      alert(`Erro na transação: ${err.message}`);
    }
  };

  // Get dynamic cofre movements for the selected history safe
  const activeSafeHistory = useMemo(() => {
    if (!historySafe) return [];
    return movementsCofre
      .filter(m => m.cofreId === historySafe.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [movementsCofre, historySafe]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cofres</h1>
            <p className="text-muted-foreground mt-1 text-sm">Separe dinheiro em caixinhas dedicadas para objetivos e reservas.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSafeModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-2.5 rounded-xl shadow-md transition-opacity cursor-pointer text-sm"
            >
              <Plus size={18} />
              Novo Cofre
            </button>
          </div>
        </div>
      </div>

      {/* Content - Cofres only */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border/60 rounded-2xl shadow-sm"></div>
          ))}
        </div>
      ) : safes.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/60 rounded-2xl shadow-sm">
          <Wallet size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Nenhum cofre criado</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Crie cofrinhos (caixinhas) para separar dinheiro para viagens, eletrônicos ou reservas de emergência.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safes.map(s => {
              const progressPct = Math.min(100, Math.max(0, s.valorMeta > 0 ? (s.saldoAtual / s.valorMeta) * 100 : 0));
              return (
                <div key={s.id} className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between group">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base line-clamp-1">{s.name}</h4>
                        {s.objetivo && <span className="text-xs text-muted-foreground">{s.objetivo}</span>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditSafe(s)}
                          className="text-muted-foreground hover:text-primary p-1 cursor-pointer transition-opacity"
                          title="Editar Cofre"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSafe(s.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer transition-opacity"
                          title="Excluir Cofre"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block">Saldo Reservado</span>
                        <span className="text-2xl font-extrabold">{formatCurrency(s.saldoAtual)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Meta</span>
                        <span className="text-sm font-semibold">{formatCurrency(s.valorMeta)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-primary">{progressPct.toFixed(0)}%</span>
                        <span className="text-muted-foreground">{formatCurrency(s.valorMeta - s.saldoAtual)} restantes</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500 rounded-full" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    {s.descricao && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 line-clamp-2">
                        {s.descricao}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedSafe(s);
                        setTxType('Depósito');
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      <ArrowUpRight size={14} />
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSafe(s);
                        setTxType('Retirada');
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold py-2 rounded-lg text-xs border border-border/50 cursor-pointer"
                    >
                      <ArrowDownLeft size={14} />
                      Resgatar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSafe(s);
                        setTxType('Rendimento');
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-success/10 hover:bg-success/20 text-success font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      <TrendingUp size={14} />
                      Rendimento
                    </button>
                    <button
                      onClick={() => {
                        setHistorySafe(s);
                        setIsHistoryModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs border border-border/50 cursor-pointer"
                    >
                      <History size={14} />
                      Histórico
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Novo Cofre Modal */}
      {isSafeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wallet className="text-primary" size={20} />
                Criar Novo Cofre Virtual
              </h2>
              <button onClick={() => setIsSafeModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreateSafe} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome do Cofre *</label>
                <input 
                  type="text" 
                  value={safeName}
                  onChange={e => setSafeName(e.target.value)}
                  placeholder="Ex: Viagem de Fim de Ano"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Objetivo Financeiro (Breve)</label>
                <input 
                  type="text" 
                  value={safeObjective}
                  onChange={e => setSafeObjective(e.target.value)}
                  placeholder="Ex: Comprar passagens e hotel"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Meta de Valor (R$) *</label>
                <CurrencyInput
                  value={safeTarget}
                  onChange={(raw, num) => { setSafeTarget(raw); setSafeTargetNum(num); }}
                  placeholder="Ex: 5.000,00"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição Detalhada</label>
                <textarea
                  value={safeDesc}
                  onChange={e => setSafeDesc(e.target.value)}
                  placeholder="Informações adicionais sobre o cofre..."
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Salvar Cofre
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nova Meta Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="text-primary" size={20} />
                Definir Nova Meta
              </h2>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome da Meta *</label>
                <input 
                  type="text" 
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  placeholder="Ex: Comprar Notebook Novo"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Objetivo / Categoria</label>
                <input 
                  type="text" 
                  value={goalObj}
                  onChange={e => setGoalObj(e.target.value)}
                  placeholder="Ex: Trabalho / Tecnologia"
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor da Meta (R$) *</label>
                  <CurrencyInput
                    value={goalTargetVal}
                    onChange={(raw, num) => { setGoalTargetVal(raw); setGoalTargetNum(num); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor Inicial (R$)</label>
                  <CurrencyInput
                    value={goalCurrentVal}
                    onChange={(raw, num) => { setGoalCurrentVal(raw); setGoalCurrentNum(num); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Prazo / Data Limite *</label>
                <input 
                  type="date"
                  value={goalLimitDate}
                  onChange={e => setGoalLimitDate(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Salvar Meta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Safe Transaction Modal (Guardar / Resgatar) */}
      {isTxModalOpen && selectedSafe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-1.5">
                {txType === 'Depósito' && <ArrowUpRight className="text-success" size={20} />}
                {txType === 'Retirada' && <ArrowDownLeft className="text-primary" size={20} />}
                {txType === 'Rendimento' && <TrendingUp className="text-success" size={20} />}
                {txType} - {selectedSafe.name}
              </h2>
              <button 
                onClick={() => {
                  setSelectedSafe(null);
                  setIsTxModalOpen(false);
                }} 
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSafeTransaction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor da Operação (R$) *</label>
                <CurrencyInput
                  value={txAmount}
                  onChange={(raw, num) => { setTxAmount(raw); setTxAmountNum(num); }}
                  autoFocus
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Data da Operação *</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>

              {txType !== 'Rendimento' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {txType === 'Depósito' ? 'Sacar da Conta Bancária' : 'Depositar na Conta Bancária'} *
                  </label>
                  <select
                    value={txContaId}
                    onChange={e => setTxContaId(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (Saldo: {formatCurrency(a.currentBalance)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground flex gap-1.5 items-start border border-border/50">
                <Info size={14} className="shrink-0 text-primary mt-0.5" />
                <span>
                  {txType === 'Rendimento' 
                    ? 'Esta operação apenas aumentará o saldo do cofre, sem alterar nenhuma conta bancária do seu extrato.' 
                    : `Esta operação criará automaticamente uma transação do tipo ${txType === 'Depósito' ? 'Despesa' : 'Receita'} no extrato da sua conta bancária para sincronização com seu saldo real.`}
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
              >
                Confirmar {txType}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Safe History View Modal */}
      {isHistoryModalOpen && historySafe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-1.5">
                <History className="text-primary" size={20} />
                Histórico: {historySafe.name}
              </h2>
              <button 
                onClick={() => {
                  setHistorySafe(null);
                  setIsHistoryModalOpen(false);
                }} 
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {activeSafeHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma movimentação realizada neste cofre ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSafeHistory.map(m => {
                    const acc = accounts.find(a => a.id === m.contaId);
                    const isDeposit = m.tipo === 'Depósito';

                    return (
                      <div key={m.id} className="flex justify-between items-center bg-muted/40 border border-border/50 p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isDeposit ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {isDeposit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <div>
                            <span className="font-semibold block">{m.tipo}</span>
                            <span className="text-xs text-muted-foreground">
                              {acc ? `Conta: ${acc.name}` : 'Conta não cadastrada'} • {new Date(m.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${isDeposit ? 'text-success' : 'text-primary'}`}>
                          {isDeposit ? '+' : '-'} {formatCurrency(m.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Safe Modal */}
      {editingSafe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Pencil className="text-primary" size={20} />
                Editar Cofre
              </h2>
              <button onClick={() => setEditingSafe(null)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>
            <form onSubmit={handleUpdateSafe} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome do Cofre *</label>
                <input
                  type="text"
                  value={editSafeName}
                  onChange={e => setEditSafeName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Objetivo *</label>
                  <select
                    value={editSafeObjective}
                    onChange={e => setEditSafeObjective(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                    <option value="Aposentadoria">Aposentadoria</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Imóvel">Imóvel</option>
                    <option value="Veículo">Veículo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Meta Financeira (R$) *</label>
                  <CurrencyInput
                    value={editSafeTarget}
                    onChange={(raw, num) => { setEditSafeTarget(raw); setEditSafeTargetNum(num); }}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição (Opcional)</label>
                <textarea
                  value={editSafeDesc}
                  onChange={e => setEditSafeDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm hover:opacity-90 cursor-pointer"
              >
                Salvar Cofre
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Pencil className="text-primary" size={20} />
                Editar Meta
              </h2>
              <button onClick={() => setEditingGoal(null)} className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">
                Cancelar
              </button>
            </div>
            <form onSubmit={handleUpdateGoal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome da Meta *</label>
                <input
                  type="text"
                  value={editGoalName}
                  onChange={e => setEditGoalName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Objetivo *</label>
                  <select
                    value={editGoalObj}
                    onChange={e => setEditGoalObj(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Compra">Compra Programada</option>
                    <option value="Economia">Economia</option>
                    <option value="Dívida">Quitar Dívida</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Data Limite *</label>
                  <input
                    type="date"
                    value={editGoalLimitDate}
                    onChange={e => setEditGoalLimitDate(e.target.value)}
                    className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor Alvo (R$) *</label>
                <CurrencyInput
                  value={editGoalTargetVal}
                  onChange={(raw, num) => { setEditGoalTargetVal(raw); setEditGoalTargetNum(num); }}
                  className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm shadow-sm hover:opacity-90 cursor-pointer"
              >
                Salvar Meta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetasView;
