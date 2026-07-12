import { LoanRepository, TransactionRepository } from '../database/repositories';
import type { Loan } from '../types';

export const LoanService = {
  async createLoanWithInstallments(
    name: string,
    totalAmount: number,
    installmentValue: number,
    totalInstallments: number,
    firstDueDate: Date,
    accountId?: string
  ): Promise<string> {
    
    // 1. Create the Loan record
    const loanId = await LoanRepository.create({
      name,
      totalAmount,
      installmentValue,
      totalInstallments,
      firstDueDate,
      status: 'Ativo',
      accountId,
      description: `Financiamento/Empréstimo: ${name}`,
      amortizedSavings: 0
    });

    // 2. Generate N Transactions in parallel!
    const promises = [];
    for (let i = 0; i < totalInstallments; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      promises.push(TransactionRepository.create({
        type: 'Despesa',
        accountId: accountId || 'default', // Using a fallback, or we can leave it empty if the schema allows
        value: installmentValue,
        description: `Parcela ${i + 1}/${totalInstallments} - ${name}`,
        date: dueDate,
        status: 'Previsto',
        origin: 'Manual',
        loanId, // Link to the loan
        isInstallment: true,
        installmentNumber: i + 1,
        totalInstallments: totalInstallments
      }));
    }

    await Promise.all(promises);


    return loanId;
  },

  async deleteLoanAndTransactions(loanId: string): Promise<void> {
    // 1. Mark the loan as Concluído (DO NOT soft delete, so it appears in the Concluídos tab)
    await LoanRepository.update(loanId, { status: 'Concluído' });
    
    // 2. Find all pending transactions for this loan and delete them
    const allTxs = await TransactionRepository.getAllActive();
    const loanTxs = allTxs.filter(tx => tx.loanId === loanId && tx.status === 'Previsto');
    
    // We use Promise.all to create all transactions in parallel, which is much faster!
    await Promise.all(loanTxs.map(tx => TransactionRepository.softDelete(tx.id)));
  },

  async permanentlyDeleteLoan(loanId: string): Promise<void> {
    const allTxs = await TransactionRepository.getAllActive();
    const loanTxs = allTxs.filter(tx => tx.loanId === loanId && tx.status === 'Previsto');
    for (const tx of loanTxs) {
      await TransactionRepository.softDelete(tx.id);
    }
    await LoanRepository.softDelete(loanId);
  },

  async amortizeInstallments(
    loanId: string,
    numberOfInstallments: number,
    amortizedValue: number,
    accountId: string,
    amortizationDate: Date
  ): Promise<void> {
    // 1. Fetch Loan
    const loan = await LoanRepository.getById(loanId);
    if (!loan) throw new Error('Empréstimo não encontrado');

    // 2. Fetch pending transactions (installments)
    const allTxs = await TransactionRepository.getAllActive();
    const loanTxs = allTxs
      .filter(tx => tx.loanId === loanId && tx.status === 'Previsto')
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort descending by date (furthest first)
    
    if (loanTxs.length < numberOfInstallments) {
      throw new Error(`Você só tem ${loanTxs.length} parcelas pendentes.`);
    }

    const txsToAmortize = loanTxs.slice(0, numberOfInstallments);
    const originalTotalValue = txsToAmortize.reduce((sum, tx) => sum + tx.value, 0);
    const savings = originalTotalValue - amortizedValue;

    // 3. Keep the first (furthest) one, mutate it to the lump sum, and delete the rest
    const primaryTx = txsToAmortize[0];
    const otherTxs = txsToAmortize.slice(1);

    await TransactionRepository.update(primaryTx.id, {
      value: amortizedValue,
      date: amortizationDate,
      status: 'Efetivado',
      accountId,
      description: `[Amortização] Referente a ${numberOfInstallments} últimas parcelas - ${loan.name}`,
      isInstallment: false
    });

    for (const tx of otherTxs) {
      await TransactionRepository.softDelete(tx.id); // Soft delete so they vanish from counting
    }

    // 4. Update Loan savings and count
    const currentSavings = loan.amortizedSavings || 0;
    const currentAmortizedCount = loan.amortizedCount || 0;
    await LoanRepository.update(loanId, {
      amortizedSavings: currentSavings + savings,
      amortizedCount: currentAmortizedCount + (numberOfInstallments - 1)
    });
  }
};
