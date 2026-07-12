import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database/db';
import { AccountRepository, TransactionRepository, CardRepository, InstallmentRepository } from '../database/repositories';
import { TransactionService } from './TransactionService';

// Polyfill localStorage for node environment
if (typeof localStorage === 'undefined') {
  const storage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { for (const k in storage) delete storage[k]; },
    length: 0,
    key: (index: number) => null
  } as any;
}

describe('TransactionService integration tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.accounts.clear();
    await db.transactions.clear();
    await db.cards.clear();
    await db.installments.clear();
    await db.auditLogs.clear();
    localStorage.clear();
  });

  it('should create an income transaction and update account balance', async () => {
    // 1. Create a bank account
    const accId = await AccountRepository.create({
      name: 'Nubank Test',
      type: 'Corrente',
      bank: 'Nubank',
      color: '#8b5cf6',
      icon: 'CreditCard',
      initialBalance: 1000,
      currentBalance: 1000,
      isActive: true
    });

    // 2. Add an income transaction
    const txId = await TransactionService.create({
      type: 'Receita',
      accountId: accId,
      value: 250.50,
      description: 'Salário de Teste',
      date: new Date(),
      status: 'Efetivado',
      origin: 'Manual'
    });

    // 3. Verify transaction exists and account balance updated
    const tx = await TransactionRepository.getById(txId);
    expect(tx).toBeDefined();
    expect(tx?.value).toBe(250.50);

    const account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(1250.50);
  });

  it('should create an expense transaction and deduct from account balance', async () => {
    const accId = await AccountRepository.create({
      name: 'Carteira',
      type: 'Carteira',
      bank: 'Dinheiro',
      color: '#6b7280',
      icon: 'Wallet',
      initialBalance: 200,
      currentBalance: 200,
      isActive: true
    });

    const txId = await TransactionService.create({
      type: 'Despesa',
      accountId: accId,
      value: 45.90,
      description: 'Almoço',
      date: new Date(),
      status: 'Efetivado',
      origin: 'Manual'
    });

    const account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(154.10);
  });

  it('should roll back balances upon transaction deletion', async () => {
    const accId = await AccountRepository.create({
      name: 'Nubank',
      type: 'Corrente',
      bank: 'Nubank',
      color: '#8b5cf6',
      icon: 'CreditCard',
      initialBalance: 1000,
      currentBalance: 1000,
      isActive: true
    });

    const txId = await TransactionService.create({
      type: 'Receita',
      accountId: accId,
      value: 500,
      description: 'Reembolso',
      date: new Date(),
      status: 'Efetivado',
      origin: 'Manual'
    });

    let account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(1500);

    // Delete it
    await TransactionService.delete(txId);

    account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(1000); // Rolled back!
  });

  it('should distribute card purchase installments and adjust limit', async () => {
    const cardId = await CardRepository.create({
      name: 'Gold Card',
      bank: 'Nubank',
      brand: 'Mastercard',
      last4Digits: '1234',
      color: '#8b5cf6',
      icon: 'CreditCard',
      limit: 5000,
      limitAvailable: 5000,
      closingDay: 5,
      dueDay: 12,
      isActive: true
    });

    // Purchase of 150.00 split in 3 installments (50.00 each)
    const txId = await TransactionService.createCardPurchase({
      cardId,
      value: 150.00,
      description: 'Geladeira parcelada',
      categoryId: 'cat-compra',
      date: new Date('2026-07-01')
    }, 3);

    const card = await CardRepository.getById(cardId);
    expect(card?.limitAvailable).toBe(4850.00); // 5000 - 150

    const installments = await InstallmentRepository.getByTransaction(txId);
    expect(installments.length).toBe(3);
    expect(installments[0].value).toBe(50.00);
    expect(installments[1].value).toBe(50.00);
    expect(installments[2].value).toBe(50.00);

    // Due dates should be set according to card dueDay (12th of each month)
    // Purchase is on July 1st. July 1st <= closingDay (5th). So first installment falls on July 12th!
    expect(installments[0].dueDate.getDate()).toBe(12);
    expect(installments[0].dueDate.getMonth()).toBe(6); // July (0-indexed)
    expect(installments[1].dueDate.getMonth()).toBe(7); // August
    expect(installments[2].dueDate.getMonth()).toBe(8); // September
  });

  it('should execute card invoice payment correctly', async () => {
    const accId = await AccountRepository.create({
      name: 'Nubank Acc',
      type: 'Corrente',
      bank: 'Nubank',
      color: '#8b5cf6',
      icon: 'CreditCard',
      initialBalance: 2000,
      currentBalance: 2000,
      isActive: true
    });

    const cardId = await CardRepository.create({
      name: 'Gold Card',
      bank: 'Nubank',
      brand: 'Mastercard',
      last4Digits: '1234',
      color: '#8b5cf6',
      icon: 'CreditCard',
      limit: 5000,
      limitAvailable: 5000,
      closingDay: 5,
      dueDay: 12,
      isActive: true
    });

    // Make purchase
    await TransactionService.createCardPurchase({
      cardId,
      value: 300.00,
      description: 'Compra com Cartão',
      categoryId: 'cat-lazer',
      date: new Date('2026-07-01') // Due on July 12th
    }, 3); // 3 installments of 100.00

    let card = await CardRepository.getById(cardId);
    expect(card?.limitAvailable).toBe(4700.00);

    // Pay July invoice (due date July 12th)
    const paymentDate = new Date('2026-07-12');
    const paymentTxId = await TransactionService.payInvoice(cardId, paymentDate, accId, 100.00, paymentDate);

    const paymentTx = await TransactionRepository.getById(paymentTxId);
    expect(paymentTx?.value).toBe(100.00); // First installment paid

    const account = await AccountRepository.getById(accId);
    expect(account?.currentBalance).toBe(1900.00); // 2000 - 100.00

    card = await CardRepository.getById(cardId);
    expect(card?.limitAvailable).toBe(4800.00); // 4700 + 100.00 restored!

    const installments = await InstallmentRepository.getByCard(cardId);
    expect(installments[0].status).toBe('Paga');
    expect(installments[1].status).toBe('Prevista');
    expect(installments[2].status).toBe('Prevista');
  });

  it('should enforce accounting locks and block retro-mutations', async () => {
    const accId = await AccountRepository.create({
      name: 'BB Test',
      type: 'Corrente',
      bank: 'BB',
      color: '#fbbf24',
      icon: 'Landmark',
      initialBalance: 500,
      currentBalance: 500,
      isActive: true
    });

    // Set lock date in localStorage
    localStorage.setItem('finance-accounting-lock-date', '2026-07-15');

    // 1. Trying to create transaction on 2026-07-10 (locked!)
    const dateLocked = new Date('2026-07-10');
    await expect(TransactionService.create({
      type: 'Despesa',
      accountId: accId,
      value: 10,
      description: 'Lanche Bloqueado',
      date: dateLocked,
      status: 'Efetivado',
      origin: 'Manual'
    })).rejects.toThrow('Erro: Período contábil bloqueado. Não é possível registrar lançamentos nesta data.');

    // 2. Trying to create transaction on 2026-07-20 (allowed!)
    const dateAllowed = new Date('2026-07-20');
    const txId = await TransactionService.create({
      type: 'Despesa',
      accountId: accId,
      value: 50,
      description: 'Compra Liberada',
      date: dateAllowed,
      status: 'Efetivado',
      origin: 'Manual'
    });
    expect(txId).toBeDefined();

    // 3. Clear lock date
    localStorage.removeItem('finance-accounting-lock-date');
  });
});

