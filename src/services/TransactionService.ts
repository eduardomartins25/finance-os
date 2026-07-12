import { 
  AccountRepository, 
  TransactionRepository, 
  CardRepository, 
  InstallmentRepository,
  SafeRepository,
  MovementCofreRepository
} from '../database/repositories';
import type { Transaction, Installment, TransactionStatus } from '../types';
import { uuidv7 } from '../utils/uuid';

const getLockDate = (): Date | null => {
  if (typeof localStorage === 'undefined') return null;
  const saved = localStorage.getItem('finance-accounting-lock-date');
  return saved ? new Date(saved + 'T23:59:59') : null;
};

const isDateLocked = (date: Date): boolean => {
  const lockDate = getLockDate();
  if (!lockDate) return false;
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const l = new Date(lockDate);
  l.setHours(0,0,0,0);
  return d.getTime() <= l.getTime();
};

export const TransactionService = {
  async create(
    tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>,
    installmentsCount: number = 1
  ): Promise<string> {
    if (isDateLocked(tx.date)) {
      throw new Error('Erro: Período contábil bloqueado. Não é possível registrar lançamentos nesta data.');
    }
    
    // 1. Persist the first transaction
    const firstTx = { ...tx };
    if (installmentsCount > 1) {
      firstTx.isInstallment = true;
      firstTx.installmentNumber = 1;
      firstTx.totalInstallments = installmentsCount;
    }
    
    const id = await TransactionRepository.create(firstTx);
    
    // 2. Adjust account balances for the first transaction
    if (firstTx.status === 'Efetivado') {
      if (firstTx.type === 'Receita') {
        await AccountRepository.adjustBalance(firstTx.accountId, firstTx.value);
      } else if (firstTx.type === 'Despesa') {
        await AccountRepository.adjustBalance(firstTx.accountId, -firstTx.value);
      }
    }

    // 3. Create subsequent installments (Previsto)
    if (installmentsCount > 1) {
      for (let i = 2; i <= installmentsCount; i++) {
        const nextDate = new Date(tx.date);
        nextDate.setMonth(nextDate.getMonth() + (i - 1));
        
        await TransactionRepository.create({
          ...tx,
          date: nextDate,
          status: 'Previsto',
          isInstallment: true,
          installmentNumber: i,
          totalInstallments: installmentsCount,
        });
      }
    }

    return id;
  },

  async delete(id: string): Promise<void> {
    const tx = await TransactionRepository.getById(id);
    if (!tx) return;
    
    if (!tx.deletedAt && isDateLocked(tx.date)) {
      throw new Error('Erro: Período contábil bloqueado. Não é possível excluir lançamentos deste período.');
    }

    // 1. Soft delete transaction if not already deleted
    if (!tx.deletedAt) {
      await TransactionRepository.softDelete(id);
    }

    // 2. Reverse effects based on type
    if (tx.cardId && tx.origin === 'Compra') {
      // Card purchase: restore limit and cancel installments
      const insts = await InstallmentRepository.getByTransaction(id);
      const activeInsts = insts.filter(i => i.status !== 'Cancelada');
      
      if (activeInsts.length > 0) {
        await CardRepository.adjustLimitAvailable(tx.cardId, tx.value);
        for (const inst of activeInsts) {
          await InstallmentRepository.updateStatus(inst.id, 'Cancelada');
        }
      }
    } else {
      // Reverse checking account balance changes if it was effectively executed
      if (tx.status === 'Efetivado' && !tx.deletedAt) {
        if (tx.type === 'Receita') {
          await AccountRepository.adjustBalance(tx.accountId, -tx.value);
        } else if (tx.type === 'Despesa') {
          await AccountRepository.adjustBalance(tx.accountId, tx.value);
        }
      }

      // 3. If linked to a cofre, also reverse the safe balance
      if (tx.origin === 'Cofre' && !tx.deletedAt) {
        const allMovements = await MovementCofreRepository.getAll();
        // Try direct link first (new deposits), then fall back to fuzzy match (old records)
        const matching = allMovements.find((m: any) => m.transactionId === id)
          ?? allMovements.find((m: any) =>
            m.contaId === tx.accountId &&
            Math.abs(m.valor - tx.value) < 0.01 &&
            Math.abs(new Date(m.data).getTime() - new Date(tx.date).getTime()) < 86400000
          );
        if (matching) {
          // Depósito (Despesa da conta) => decrementar cofre
          // Retirada (Receita da conta) => incrementar cofre
          const safeAdjust = tx.type === 'Despesa' ? -tx.value : tx.value;
          await SafeRepository.adjustBalance(matching.cofreId, safeAdjust);
        }
      }
    }
  },

  async update(
    id: string,
    mods: {
      description?: string;
      categoryId?: string;
      value?: number;
      date?: Date;
      status?: TransactionStatus;
      accountId?: string;
    }
  ): Promise<void> {
    const old = await TransactionRepository.getById(id);
    if (!old || old.deletedAt) throw new Error('Lançamento não encontrado');
    if (isDateLocked(old.date)) {
      throw new Error('Erro: Período contábil bloqueado. Não é possível editar lançamentos deste período.');
    }

    // 1. Reverse old balance effect (if it was Efetivado)
    if (old.status === 'Efetivado') {
      if (old.type === 'Receita') {
        await AccountRepository.adjustBalance(old.accountId, -old.value);
      } else if (old.type === 'Despesa' && !old.cardId) {
        await AccountRepository.adjustBalance(old.accountId, old.value);
      }
    }

    // 2. Persist updated fields
    const newAccountId = mods.accountId ?? old.accountId;
    const newValue     = mods.value     ?? old.value;
    const newStatus    = mods.status    ?? old.status;
    await TransactionRepository.update(id, {
      description: mods.description ?? old.description,
      categoryId:  mods.categoryId  ?? old.categoryId,
      value:       newValue,
      date:        mods.date        ?? old.date,
      status:      newStatus,
      accountId:   newAccountId
    });

    // 3. Apply new balance effect (if new status is Efetivado)
    if (newStatus === 'Efetivado') {
      if (old.type === 'Receita') {
        await AccountRepository.adjustBalance(newAccountId, newValue);
      } else if (old.type === 'Despesa' && !old.cardId) {
        await AccountRepository.adjustBalance(newAccountId, -newValue);
      }
    }
  },

  async createCardPurchase(
    purchase: {
      cardId: string;
      value: number;
      description: string;
      categoryId?: string;
      date: Date;
    },
    totalInstallmentsCount: number
  ): Promise<string> {
    if (isDateLocked(purchase.date)) {
      throw new Error('Erro: Período contábil bloqueado. Não é possível registrar lançamentos nesta data.');
    }
    const card = await CardRepository.getById(purchase.cardId);
    if (!card) throw new Error('Card not found');

    // 1. Create Transaction (always status: Previsto, since it enters credit card invoice)
    const txId = await TransactionRepository.create({
      type: 'Despesa',
      accountId: card.associatedAccountId || 'card-virtual-account', // placeholder or linked account
      categoryId: purchase.categoryId || undefined,
      value: purchase.value,
      description: purchase.description,
      date: purchase.date,
      status: 'Previsto',
      origin: 'Compra',
      cardId: purchase.cardId,
      isInstallment: totalInstallmentsCount > 1,
      totalInstallments: totalInstallmentsCount
    });

    // 2. Adjust available card limit
    await CardRepository.adjustLimitAvailable(purchase.cardId, -purchase.value);

    // 3. Create Installments
    const baseValue = Math.floor((purchase.value / totalInstallmentsCount) * 100) / 100;
    const remainder = Number((purchase.value - baseValue * totalInstallmentsCount).toFixed(2));

    for (let i = 1; i <= totalInstallmentsCount; i++) {
      // Adjust the first installment for any division roundoff
      const installmentValue = i === 1 ? Number((baseValue + remainder).toFixed(2)) : baseValue;
      
      // Calculate due date (month by month)
      const dueDate = new Date(purchase.date);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      
      // If purchase date day is after closing day, it goes to next month's invoice.
      // For simplicity: add 1 month if purchase day > closingDay
      if (purchase.date.getDate() > card.closingDay) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      dueDate.setDate(card.dueDay);

      await InstallmentRepository.create({
        id: uuidv7(),
        transactionId: txId,
        cardId: purchase.cardId,
        number: i,
        totalInstallments: totalInstallmentsCount,
        value: installmentValue,
        dueDate,
        status: 'Prevista'
      });
    }

    return txId;
  },

  async payInvoice(
    cardId: string, 
    invoiceDate: Date, 
    accountId: string,
    amount: number,
    paymentDate: Date
  ): Promise<string> {
    if (isDateLocked(paymentDate)) {
      throw new Error('Erro: Período contábil bloqueado. Não é possível realizar o pagamento da fatura nesta data.');
    }
    const card = await CardRepository.getById(cardId);
    if (!card) throw new Error('Card not found');

    // Fetch installments due in this invoice period
    const installments = await InstallmentRepository.getByCard(cardId);
    
    const invoiceYear = invoiceDate.getFullYear();
    const invoiceMonth = invoiceDate.getMonth();

    const invoiceInstallments = installments.filter(inst => {
      return inst.status === 'Prevista' && 
             inst.dueDate.getFullYear() === invoiceYear && 
             inst.dueDate.getMonth() === invoiceMonth;
    });

    if (invoiceInstallments.length === 0) {
      throw new Error('No pending installments for this invoice period');
    }

    const totalValue = invoiceInstallments.reduce((sum, inst) => sum + inst.value, 0);
    
    // Validações básicas de valor
    if (amount <= 0) throw new Error('Valor do pagamento deve ser maior que zero.');
    if (amount > totalValue) throw new Error('Valor do pagamento não pode ser maior que o total da fatura.');

    // 1. Create despesa transaction representing invoice payment
    const paymentTxId = await TransactionRepository.create({
      type: 'Despesa',
      accountId,
      value: amount, // Pagamento real que saiu da conta
      description: `Pagamento Fatura - ${card.name} (${invoiceMonth + 1}/${invoiceYear})`,
      date: paymentDate,
      paymentDate: paymentDate,
      status: 'Efetivado',
      origin: 'Fatura',
      cardId
    });

    // 2. Adjust payment account balance
    await AccountRepository.adjustBalance(accountId, -amount);

    // 3. Mark installments as paid (always all of them to close the invoice)
    for (const inst of invoiceInstallments) {
      await InstallmentRepository.updateStatus(inst.id, 'Paga');
    }

    // 4. Se o pagamento for PARCIAL, gera o Restante da Fatura pro próximo mês.
    const diff = Number((totalValue - amount).toFixed(2));
    if (diff > 0) {
      // Restaurar apenas o que foi pago do limite
      await CardRepository.adjustLimitAvailable(cardId, amount);

      // A data de compra do "Restante" será hoje (ou a paymentDate) para cair na fatura do mês que vem
      const nextMonthPurchaseDate = new Date(paymentDate);
      
      // Criar uma compra à vista para o valor restante, para que caia na próxima fatura
      await this.createCardPurchase({
        cardId,
        value: diff,
        description: `Restante Fatura (${invoiceMonth + 1}/${invoiceYear})`,
        date: nextMonthPurchaseDate
      }, 1);
    } else {
      // Pagamento integral: restaura limite integral
      await CardRepository.adjustLimitAvailable(cardId, totalValue);
    }

    return paymentTxId;
  },

  async cancelCardPurchase(transactionId: string): Promise<void> {
    const tx = await TransactionRepository.getById(transactionId);
    if (!tx || !tx.cardId) throw new Error('Transação de cartão não encontrada');

    // 1. Get all installments for this transaction
    const allInsts = await InstallmentRepository.getByTransaction(transactionId);

    // 2. Only cancel open ones (Prevista), skip Paga and already Cancelada
    const openInsts = allInsts.filter(i => i.status === 'Prevista');
    const openTotal = openInsts.reduce((sum, i) => sum + i.value, 0);

    for (const inst of openInsts) {
      await InstallmentRepository.updateStatus(inst.id, 'Cancelada');
    }

    // 3. Restore limit only for open installments
    if (openTotal > 0 && tx.cardId) {
      await CardRepository.adjustLimitAvailable(tx.cardId, openTotal);
    }

    // 4. If ALL installments were open (nothing was paid), also soft-delete the transaction
    const hasPaid = allInsts.some(i => i.status === 'Paga');
    if (!hasPaid) {
      await TransactionRepository.softDelete(transactionId);
    }
  }
};
