
import { SafeRepository, GoalRepository, MovementCofreRepository, AccountRepository } from '../database/repositories';
import { TransactionService } from './TransactionService';
import type { Safe, Goal, MovementCofre } from '../types';

export const GoalSafeService = {
  /**
   * Deposit money from a bank account into a virtual safe.
   */
  async depositToSafe(
    safeId: string,
    contaId: string,
    amount: number,
    date: Date = new Date()
  ): Promise<string> {
    if (amount <= 0) throw new Error('O valor do depósito deve ser maior que zero.');

    const safe = await SafeRepository.getById(safeId);
      if (!safe) throw new Error('Cofre não encontrado.');

      const account = await AccountRepository.getById(contaId);
      if (!account) throw new Error('Conta bancária de origem não encontrada.');
      if (account.currentBalance < amount) throw new Error('Saldo insuficiente na conta de origem.');

      // 1. Create a linked Expense transaction in the bank account
      const txId = await TransactionService.create({
        type: 'Despesa',
        accountId: contaId,
        value: amount,
        description: `Depósito no cofre: ${safe.name}`,
        date,
        status: 'Efetivado',
        origin: 'Cofre',
        categoryId: ''
      });

      // 2. Adjust the safe balance upwards
      await SafeRepository.adjustBalance(safeId, amount);

      // 3. Create the cofre movement record (linking back to the transaction)
      const moveId = await MovementCofreRepository.create({
        cofreId: safeId,
        tipo: 'Depósito',
        valor: amount,
        contaId,
        data: date,
        transactionId: txId
      });

      return moveId;
  },

  /**
   * Withdraw money from a virtual safe back into a bank account.
   */
  async withdrawFromSafe(
    safeId: string,
    contaId: string,
    amount: number,
    date: Date = new Date()
  ): Promise<string> {
    if (amount <= 0) throw new Error('O valor da retirada deve ser maior que zero.');

    const safe = await SafeRepository.getById(safeId);
      if (!safe) throw new Error('Cofre não encontrado.');
      if (safe.saldoAtual < amount) throw new Error('Saldo insuficiente no cofre.');

      const account = await AccountRepository.getById(contaId);
      if (!account) throw new Error('Conta bancária de destino não encontrada.');

      // 1. Create a linked Income transaction in the destination bank account
      const txId = await TransactionService.create({
        type: 'Receita',
        accountId: contaId,
        value: amount,
        description: `Resgate do cofre: ${safe.name}`,
        date,
        status: 'Efetivado',
        origin: 'Cofre',
        categoryId: ''
      });

      // 2. Adjust the safe balance downwards
      await SafeRepository.adjustBalance(safeId, -amount);

      // 3. Create the cofre movement record (linking back to the transaction)
      const moveId = await MovementCofreRepository.create({
        cofreId: safeId,
        tipo: 'Retirada',
        valor: amount,
        contaId,
        data: date,
        transactionId: txId
      });

      return moveId;
  },

  /**
   * Safe CRUD wrapper.
   */
  async createSafe(safe: Omit<Safe, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    return await SafeRepository.create({ ...safe, saldoAtual: 0 });
  },

  async updateSafe(id: string, mods: Partial<Safe>): Promise<void> {
    await SafeRepository.update(id, mods);
  },

  async deleteSafe(id: string): Promise<void> {
    const movements = await MovementCofreRepository.getAll();
    const safeMovements = movements.filter(m => m.cofreId === id);
    
    for (const mov of safeMovements) {
      if (mov.transactionId) {
        try {
          await TransactionService.delete(mov.transactionId);
        } catch (e) {}
      }
    }
    await SafeRepository.softDelete(id);
  },

  /**
   * Goal CRUD wrapper.
   */
  async createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>): Promise<string> {
    return await GoalRepository.create({ ...goal, status: 'Em Andamento' });
  },

  async updateGoal(id: string, mods: Partial<Goal>): Promise<void> {
    await GoalRepository.update(id, mods);
  },

  async deleteGoal(id: string): Promise<void> {
    await GoalRepository.softDelete(id);
  },

  /**
   * Add yield (rendimento) to a safe without affecting any bank account.
   */
  async yieldToSafe(
    safeId: string,
    amount: number,
    date: Date = new Date()
  ): Promise<string> {
    if (amount <= 0) throw new Error('O valor do rendimento deve ser maior que zero.');

    const safe = await SafeRepository.getById(safeId);
    if (!safe) throw new Error('Cofre não encontrado.');

    // 1. Adjust the safe balance upwards
    await SafeRepository.adjustBalance(safeId, amount);

    // 2. Create the cofre movement record
    const moveId = await MovementCofreRepository.create({
      cofreId: safeId,
      tipo: 'Rendimento',
      valor: amount,
      data: date
    } as any);

    return moveId;
  }
};
