import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { CategoryRepository, BudgetRepository, UserRepository } from '../../database/repositories';
import { parseCurrency } from '../../utils/currency';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { BackupService } from '../../services/BackupService';
import { auth } from '../../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { 
  Sliders, 
  Tag, 
  Target, 
  Database, 
  Plus, 
  User as UserIcon,
  Trash2, 
  Download, 
  Upload, 
  Trash, 
  Check, 
  Sun, 
  Moon, 
  Zap, 
  Minimize2, 
  Palette,
  CheckCircle2,
  DollarSign,
  Leaf,
  Flame,
  Lock,
  Unlock
} from 'lucide-react';

export const ConfiguracoesView: React.FC = () => {
  const { 
    categories, 
    budgets, 
    transactions, 
    theme, 
    setTheme, 
    
    loading,
    accountingLockDate,
    setAccountingLockDate
  } = useStore();

  const [activeTab, setActiveTab] = useState<'perfil' | 'categories_budgets' | 'backup' | 'themes' | 'bloqueio'>('perfil');

  // Perfil Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'Receita' | 'Despesa' | 'Ambos'>('Despesa');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  // Budget Form State
  const [editingBudgetCatId, setEditingBudgetCatId] = useState<string | null>(null);
  const [budgetLimitValue, setBudgetLimitValue] = useState('');
  const [budgetLimitNum, setBudgetLimitNum] = useState(0);

  const currentMonthYear = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const themeOptions = [
    { id: 'professional', label: 'Profissional', desc: 'Tema corporativo e sóbrio em tons claros e limpos.', icon: Sun, colorClass: 'bg-blue-600' },
    { id: 'dark', label: 'Modo Escuro', desc: 'Fundo preto/grafite para economia de energia e conforto ocular.', icon: Moon, colorClass: 'bg-zinc-800' },
    { id: 'futuristic', label: 'Cyber Tech', desc: 'Design avançado inspirado em painéis de tecnologia de filmes. Modo noturno com destaques neon em tons ciano e azul esverdeado.', icon: Zap, colorClass: 'bg-cyan-600' },
    { id: 'emerald-forest', label: 'Floresta Esmeralda', desc: 'Tema verde musgo e tons menta.', icon: Leaf, colorClass: 'bg-emerald-600' },
    { id: 'sunset-glow', label: 'Brilho do Sol', desc: 'Tons roxos escuros e degradês de laranja.', icon: Flame, colorClass: 'bg-rose-500' },
    { id: 'minimal', label: 'Minimalista', desc: 'Monocromático, limpo e focado no essencial.', icon: Minimize2, colorClass: 'bg-zinc-300' }
  ];

  const colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#6b7280'  // Gray
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Calculate actual spending for each category in the current month
  const categorySpending = useMemo(() => {
    const spendingMap: Record<string, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach(tx => {
      if (tx.type === 'Despesa' && tx.categoryId && tx.status === 'Efetivado') {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          spendingMap[tx.categoryId] = (spendingMap[tx.categoryId] || 0) + tx.value;
        }
      }
    });

    return spendingMap;
  }, [transactions]);

  // Combine Category + Budget + Spending info
  const combinedBudgets = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'Despesa' || c.type === 'Ambos');
    const currentBudgets = budgets.filter(b => b.monthYear === currentMonthYear);

    return expenseCategories.map(cat => {
      const budget = currentBudgets.find(b => b.categoryId === cat.id);
      const spent = categorySpending[cat.id] || 0;
      const limit = budget ? budget.limitAmount : 0;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        budgetId: budget?.id || null,
        limit,
        spent,
        percent
      };
    });
  }, [categories, budgets, categorySpending, currentMonthYear]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg('As senhas não coincidem.');
      return;
    }

    try {
      if (!auth.currentUser) throw new Error('Usuário não logado');

      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordMsg('Senha alterada com sucesso!');
    } catch (err: any) {
      setPasswordMsg(`Erro ao alterar senha: ${err.message}`);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await CategoryRepository.create({
        name: newCatName.trim(),
        type: newCatType,
        color: newCatColor,
        icon: newCatIcon
      });

      setNewCatName('');
    } catch (err: any) {
      alert(`Erro ao criar categoria: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Tem certeza de que deseja excluir esta categoria? As transações vinculadas continuarão no sistema, mas ficarão sem categoria.')) {
      await CategoryRepository.softDelete(id);
    }
  };

  const handleSaveBudget = async (categoryId: string, budgetId: string | null) => {
    const limit = budgetLimitNum;
    if (limit < 0) return;

    try {
      if (budgetId) {
        await BudgetRepository.update(budgetId, {
          limitAmount: limit
        });
      } else {
        await BudgetRepository.create({
          categoryId,
          monthYear: currentMonthYear,
          limitAmount: limit,
          spentAmount: 0
        });
      }

      setEditingBudgetCatId(null);
      setBudgetLimitValue('');
    } catch (err: any) {
      alert(`Erro ao salvar orçamento: ${err.message}`);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupString = await BackupService.exportBackup();
      BackupService.downloadBackupFile(backupString);
    } catch (err: any) {
      alert(`Erro ao exportar dados: ${err.message}`);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        if (confirm('A importação substituirá TODOS os dados atuais do aplicativo. Deseja prosseguir com a restauração?')) {
          await BackupService.importBackup(json);
          alert('Backup restaurado com sucesso!');
        }
      } catch (err: any) {
        alert(`Erro ao restaurar backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleWipeDatabase = async () => {
    if (confirm('ATENÇÃO: Isso apagará permanentemente todos os seus dados locais. Esta ação é irreversível. Deseja limpar a base de dados?')) {
      try {
        await BackupService.wipeDatabase();
        alert('Banco de dados excluído com sucesso. A página será recarregada.');
        window.location.reload();
      } catch (e: any) {
        alert('Falha ao excluir o banco de dados: ' + e.message);
      }
    }
  };

  const handleResetTransactions = async () => {
    if (confirm('ATENÇÃO: Isso vai ZERAR todos os saldos das suas contas, cofres e cartões, além de APAGAR definitivamente todos os lançamentos e compras, deixando o sistema "zerado" para uso. Suas categorias, contas, cofres e cartões criados permanecerão intactos. Tem certeza?')) {
      try {
        await BackupService.resetTransactionsAndBalances();
        alert('Saldos zerados e lançamentos apagados com sucesso! O sistema está pronto para uso.');
      } catch (err: any) {
        alert(`Erro ao zerar o sistema: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Customize categorias, gerencie orçamentos do mês, altere temas e faça backups de segurança.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border text-sm font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'perfil' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserIcon size={16} />
          Meu Perfil
        </button>
        <button
          onClick={() => setActiveTab('categories_budgets')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'categories_budgets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag size={16} />
          Categorias & Orçamentos
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'backup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database size={16} />
          Backup & Dados
        </button>
        <button
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'themes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette size={16} />
          Temas do Sistema
        </button>
        <button
          onClick={() => setActiveTab('bloqueio')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bloqueio' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock size={16} />
          Bloqueio Contábil
        </button>
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === 'perfil' && (
          <div className="max-w-md bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <UserIcon className="text-primary" size={20} />
              <h3 className="text-lg font-semibold">Alterar Senha</h3>
            </div>
            <p className="text-sm text-muted-foreground">Você pode atualizar sua senha local a qualquer momento.</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Confirme a Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>

              {passwordMsg && (
                <div className={`p-3 rounded-xl text-xs flex gap-2 items-center ${passwordMsg.includes('sucesso') ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                  <span>{passwordMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}

        {activeTab === 'categories_budgets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Categories Management Column */}
            <div className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <Tag className="text-primary" size={20} />
                <h3 className="text-lg font-semibold">Suas Categorias</h3>
              </div>

              {/* Add category form */}
              <form onSubmit={handleCreateCategory} className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Nova Categoria</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nome da Categoria</label>
                    <input 
                      type="text" 
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Ex: Assinaturas"
                      className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Tipo de Movimentação</label>
                    <select
                      value={newCatType}
                      onChange={e => setNewCatType(e.target.value as any)}
                      className="w-full bg-input border border-border px-3 py-2 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="Despesa">Despesa (Saída)</option>
                      <option value="Receita">Receita (Entrada)</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Cor Visual</label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: c }}
                      >
                        {newCatColor === c && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg text-xs hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
                >
                  Criar Categoria
                </button>
              </form>

              {/* Categories list */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-muted/20 border border-border/50 px-4 py-2.5 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-sm">{cat.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {cat.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-muted-foreground hover:text-destructive transition-opacity p-1 cursor-pointer"
                      title="Excluir Categoria"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Budgets Column */}
            <div className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Target className="text-primary" size={20} />
                  <div>
                    <h3 className="text-lg font-semibold">Orçamentos Mensais</h3>
                    <p className="text-xs text-muted-foreground">Planejamento para {currentMonthYear}</p>
                  </div>
                </div>
              </div>

              {/* Budgets List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {combinedBudgets.map(item => {
                  const isEditing = editingBudgetCatId === item.categoryId;
                  const limitReached = item.limit > 0 && item.spent >= item.limit;
                  const warningZone = item.limit > 0 && (item.spent / item.limit) >= 0.85;

                  return (
                    <div key={item.categoryId} className="bg-muted/15 border border-border/50 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.categoryColor }} />
                          <h4 className="font-semibold text-sm">{item.categoryName}</h4>
                        </div>
                        
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <CurrencyInput
                              value={budgetLimitValue}
                              onChange={(raw, num) => { setBudgetLimitValue(raw); setBudgetLimitNum(num); }}
                              placeholder="Limite (R$)"
                              className="bg-input border border-border w-24 px-2 py-1 rounded text-xs focus:outline-none font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBudget(item.categoryId, item.budgetId)}
                              className="bg-primary text-primary-foreground p-1 rounded hover:opacity-90 cursor-pointer"
                              title="Salvar Limite"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => { setEditingBudgetCatId(null); setBudgetLimitValue(''); }}
                              className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
                            >
                              Sair
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBudgetCatId(item.categoryId);
                              setBudgetLimitValue(item.limit > 0 ? String(item.limit) : '');
                            }}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {item.limit > 0 ? 'Ajustar Limite' : 'Definir Limite'}
                          </button>
                        )}
                      </div>

                      {/* Spend details bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Gasto: {formatCurrency(item.spent)}</span>
                          <span className="font-medium">
                            {item.limit > 0 ? `Limite: ${formatCurrency(item.limit)}` : 'Sem limite definido'}
                          </span>
                        </div>

                        {item.limit > 0 && (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, item.percent)}%`,
                                  backgroundColor: limitReached ? 'var(--color-destructive)' : warningZone ? 'var(--color-warning)' : 'var(--color-success)'
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className={limitReached ? 'text-destructive font-semibold' : warningZone ? 'text-warning' : 'text-success'}>
                                {item.percent.toFixed(0)}% utilizado
                              </span>
                              {limitReached && <span className="text-destructive font-semibold">Orçamento Estourado!</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup actions */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Database className="text-primary" size={20} />
                <h3 className="text-lg font-semibold">Importação e Exportação</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Toda a sua base de dados do FinanceOS é armazenada de forma 100% segura e local no seu navegador. Você pode baixar uma cópia ou migrar seus dados para outro dispositivo fazendo backups manuais periódicos.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {/* Export */}
                <button
                  onClick={handleExportBackup}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-3 rounded-xl hover:opacity-90 shadow-sm transition-opacity cursor-pointer text-sm"
                >
                  <Download size={18} />
                  Exportar Backup (JSON)
                </button>

                {/* Import */}
                <label className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold px-4 py-3 rounded-xl border border-border/80 shadow-sm transition-colors cursor-pointer text-sm text-center">
                  <Upload size={18} />
                  Restaurar Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-destructive/30 p-6 rounded-2xl shadow-sm space-y-4 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <Trash className="text-destructive" size={20} />
                <h3 className="text-lg font-semibold">Zona de Risco</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Caso decida redefinir o FinanceOS do zero ou excluir todos os registros carregados no navegador, você pode limpar completamente o banco de dados IndexedDB local.
              </p>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleResetTransactions}
                  className="w-full bg-warning text-warning-foreground font-semibold px-4 py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm"
                >
                  Zerar Saldos e Lançamentos
                </button>
                <button
                  onClick={handleWipeDatabase}
                  className="w-full bg-destructive text-white font-semibold px-4 py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm"
                >
                  Apagar Todos os Dados
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="text-primary" size={20} />
              <div>
                <h3 className="text-lg font-semibold">Escolha a sua Experiência Visual</h3>
                <p className="text-sm text-muted-foreground">Selecione o tema de sua preferência para personalizar a identidade estética do FinanceOS.</p>
              </div>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.id;
                const TIcon = opt.icon;
                
                return (
                  <div
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`border-2 p-5 rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-4 hover:shadow-md relative overflow-hidden ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/35' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${opt.colorClass} shrink-0 text-white`}>
                          <TIcon size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">{opt.label}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <CheckCircle2 className="text-primary shrink-0" size={20} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'bloqueio' && (
          <div className="max-w-md bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="text-primary animate-pulse" size={20} />
              <h3 className="text-lg font-semibold">Bloqueador Contábil</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Proteja seus dados financeiros históricos contra alterações acidentais. Ao definir uma data de bloqueio, qualquer inserção, edição ou exclusão de transações em períodos anteriores ou iguais à data selecionada será impedida.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Data Limite de Bloqueio
                </label>
                <input
                  type="date"
                  value={accountingLockDate || ''}
                  onChange={e => setAccountingLockDate(e.target.value || null)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-lg text-sm focus:outline-none font-mono"
                />
              </div>

              {accountingLockDate ? (
                <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs flex gap-2 items-start">
                  <Lock size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Proteção Ativa!</span>
                    <span>Todos os lançamentos até {new Date(accountingLockDate + 'T12:00:00').toLocaleDateString('pt-BR')} estão protegidos contra alteração.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 text-muted-foreground border border-border/40 rounded-lg text-xs flex gap-2 items-start">
                  <Unlock size={16} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <span className="font-bold block">Bloqueador Desativado</span>
                    <span>Nenhum período contábil está bloqueado. Todos os lançamentos podem ser editados livremente.</span>
                  </div>
                </div>
              )}
              
              {accountingLockDate && (
                <button
                  type="button"
                  onClick={() => setAccountingLockDate(null)}
                  className="w-full bg-muted hover:bg-muted/80 text-foreground font-semibold py-2 rounded-lg text-xs border border-border transition-colors cursor-pointer"
                >
                  Remover Bloqueio
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfiguracoesView;
