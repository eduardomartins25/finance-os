import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database/db';
import { AccountRepository, SafeRepository, GoalRepository, MovementCofreRepository, TransactionRepository } from '../database/repositories';
import { GoalSafeService } from './GoalSafeService';

describe('GoalSafeService integration tests', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.safes.clear();
    await db.goals.clear();
    await db.movementsCofre.clear();
    await db.auditLogs.clear();
  });

  it('should successfully handle deposits into safes and subtract from bank balance', async () => {
    // 1. Setup account and safe
    const accId = await AccountRepository.create({
      name: 'Conta Corrente',
      type: 'Corrente',
      bank: 'Banco do Brasil',
      color: '#fbbf24',
      icon: 'Landmark',
      initialBalance: 1000,
      currentBalance: 1000,
      isActive: true
    });

    const safeId = await GoalSafeService.createSafe({
      name: 'Notebook Novo',
      objetivo: 'Trabalho',
      valorMeta: 3000,
      saldoAtual: 0,
      descricao: 'Para desenvolvimento'
    });

    // 2. Execute Deposit of R$ 400
    await GoalSafeService.depositToSafe(safeId, accId, 400);

    // 3. Assertions
    const safe = await SafeRepository.getById(safeId);
    expect(safe?.saldoAtual).toBe(400);

    const account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(600); // 1000 - 400

    const moves = await MovementCofreRepository.getByCofre(safeId);
    expect(moves.length).toBe(1);
    expect(moves[0].tipo).toBe('Depósito');
    expect(moves[0].valor).toBe(400);

    const txs = await TransactionRepository.getAllActive();
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe('Despesa');
    expect(txs[0].value).toBe(400);
    expect(txs[0].origin).toBe('Cofre');
  });

  it('should successfully handle withdrawals from safes and add back to bank balance', async () => {
    // 1. Setup account and safe with pre-loaded balance
    const accId = await AccountRepository.create({
      name: 'Poupança',
      type: 'Poupança',
      bank: 'Caixa',
      color: '#3b82f6',
      icon: 'Landmark',
      initialBalance: 500,
      currentBalance: 500,
      isActive: true
    });

    const safeId = await GoalSafeService.createSafe({
      name: 'Emergência',
      objetivo: 'Reserva',
      valorMeta: 5000,
      saldoAtual: 0
    });

    // Deposit R$ 300 first
    await GoalSafeService.depositToSafe(safeId, accId, 300);

    let safe = await SafeRepository.getById(safeId);
    let account = await AccountRepository.getById(accId);
    expect(safe?.saldoAtual).toBe(300);
    expect(account?.currentBalance).toBe(200);

    // 2. Withdraw R$ 100
    await GoalSafeService.withdrawFromSafe(safeId, accId, 100);

    // 3. Assertions
    safe = await SafeRepository.getById(safeId);
    expect(safe?.saldoAtual).toBe(200); // 300 - 100

    account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(300); // 200 + 100

    const moves = await MovementCofreRepository.getByCofre(safeId);
    expect(moves.length).toBe(2);
    expect(moves[0].tipo).toBe('Retirada'); // sorted descending
    expect(moves[0].valor).toBe(100);
  });

  it('should reject deposits exceeding account balance and withdrawals exceeding cofre balance', async () => {
    const accId = await AccountRepository.create({
      name: 'Conta Corrente',
      type: 'Corrente',
      bank: 'Nubank',
      color: '#8b5cf6',
      icon: 'CreditCard',
      initialBalance: 100,
      currentBalance: 100,
      isActive: true
    });

    const safeId = await GoalSafeService.createSafe({
      name: 'Carro',
      objetivo: 'Transporte',
      valorMeta: 40000,
      saldoAtual: 0
    });

    // 1. Deposit too much
    await expect(GoalSafeService.depositToSafe(safeId, accId, 150))
      .rejects.toThrow('Saldo insuficiente na conta de origem.');

    // 2. Withdraw too much
    await expect(GoalSafeService.withdrawFromSafe(safeId, accId, 50))
      .rejects.toThrow('Saldo insuficiente no cofre.');
  });
});
