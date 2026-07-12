import { db } from '../database/db';
import { PurchaseRepository } from '../database/repositories';
import { TransactionService } from './TransactionService';
import type { Purchase } from '../types';

export const PurchaseService = {
  /**
   * Creates a Purchase record and optionally generates a linked financial expense/installments.
   */
  async createPurchase(
    purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>,
    financials?: {
      generateExpense: boolean;
      installmentsCount: number;
    }
  ): Promise<string> {
    return await db.transaction('rw', [
      db.purchases, 
      db.transactions, 
      db.accounts, 
      db.cards, 
      db.installments, 
      db.auditLogs
    ], async () => {
      // 1. Create the purchase record
      const purchaseId = await PurchaseRepository.create(purchase);

      // 2. Generate linked transaction if requested and status involves immediate payment / layout
      if (financials?.generateExpense && (purchase.status === 'Comprado' || purchase.status === 'Concluído')) {
        const dateObj = purchase.dataCompra ? new Date(purchase.dataCompra) : new Date();

        if (purchase.formaPagamento === 'Cartão' && purchase.cartaoId) {
          // Credit card purchase (can be installment based)
          await TransactionService.createCardPurchase({
            cardId: purchase.cartaoId,
            value: purchase.valor,
            description: `Compra: ${purchase.name}`,
            categoryId: purchase.categoryId || '',
            date: dateObj
          }, financials.installmentsCount || 1);
        } else if (purchase.contaId) {
          // Cash/Debit card direct expense
          await TransactionService.create({
            type: 'Despesa',
            accountId: purchase.contaId,
            categoryId: purchase.categoryId || undefined,
            value: purchase.valor,
            description: `Compra: ${purchase.name}`,
            date: dateObj,
            status: 'Efetivado',
            origin: 'Compra',
            purchaseId
          });
        }
      }

      return purchaseId;
    });
  },

  /**
   * Updates a Purchase record and optionally generates a linked financial expense/installments 
   * if it's being converted from a Wish to a Real Purchase.
   */
  async updatePurchase(
    id: string,
    updates: Partial<Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deviceId' | 'userId'>>,
    financials?: {
      generateExpense: boolean;
      installmentsCount: number;
    }
  ): Promise<void> {
    return await db.transaction('rw', [
      db.purchases, 
      db.transactions, 
      db.accounts, 
      db.cards, 
      db.installments, 
      db.auditLogs
    ], async () => {
      // Get the existing purchase
      const existing = await PurchaseRepository.getById(id);
      if (!existing) throw new Error('Compra não encontrada');

      const merged = { ...existing, ...updates };
      await PurchaseRepository.update(id, updates);

      // Generate linked transaction if requested AND it wasn't already generated 
      // (a heuristic here is checking if we are generating it now)
      if (financials?.generateExpense && (merged.status === 'Comprado' || merged.status === 'Concluído')) {
        const dateObj = merged.dataCompra ? new Date(merged.dataCompra) : new Date();

        if (merged.formaPagamento === 'Cartão' && merged.cartaoId) {
          await TransactionService.createCardPurchase({
            cardId: merged.cartaoId,
            value: merged.valor,
            description: `Compra: ${merged.name}`,
            categoryId: merged.categoryId || '',
            date: dateObj
          }, financials.installmentsCount || 1);
        } else if (merged.contaId) {
          await TransactionService.create({
            type: 'Despesa',
            accountId: merged.contaId,
            categoryId: merged.categoryId || undefined,
            value: merged.valor,
            description: `Compra: ${merged.name}`,
            date: dateObj,
            status: 'Efetivado',
            origin: 'Compra',
            purchaseId: id
          });
        }
      }
    });
  },

  /**
   * Soft deletes a purchase record.
   */
  async deletePurchase(id: string): Promise<void> {
    await PurchaseRepository.softDelete(id);
  }
};
