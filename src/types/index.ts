export type SyncStatus = 'LOCAL' | 'PENDING' | 'SYNCED' | 'CONFLICT';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // For Soft Delete
  version: number;
  syncStatus: SyncStatus;
  deviceId: string;
  userId: string;
}

export type AccountType = 'Corrente' | 'Poupança' | 'Carteira' | 'Dinheiro' | 'Investimento' | 'Internacional' | 'Outro';

export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  bank: string;
  color: string;
  icon: string;
  initialBalance: number;
  currentBalance: number;
  description?: string;
  isActive: boolean;
}

export interface Card extends BaseEntity {
  name: string;
  bank: string;
  brand: string;
  last4Digits: string;
  color: string;
  icon: string;
  limit: number;
  limitAvailable: number;
  closingDay: number;
  dueDay: number;
  isActive: boolean;
  associatedAccountId?: string; // Optional linked bank account for payment
}

export type TransactionType = 'Receita' | 'Despesa';
export type TransactionStatus = 'Previsto' | 'Efetivado' | 'Cancelado';
export type TransactionOrigin = 'Manual' | 'Compra' | 'Fatura' | 'Assinatura' | 'Recorrência' | 'Sistema' | 'Cofre';

export interface Transaction extends BaseEntity {
  type: TransactionType;
  categoryId?: string;
  accountId: string; // The account affected
  value: number; // Positive number. For despesas/débitos, logic subtracts it.
  description: string;
  date: Date; // Competence date
  paymentDate?: Date; // Date actually paid (if status is 'Efetivado')
  status: TransactionStatus;
  origin: TransactionOrigin;
  
  // Card details if transaction belongs to a card
  cardId?: string;
  isInstallment?: boolean;
  installmentId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  
  // Recurrence details
  isRecurring?: boolean;
  recurrenceId?: string;
  
  // Metadata links
  purchaseId?: string; // Links back to a Purchase tracking entity (post-MVP)
  loanId?: string; // Links back to a Loan entity
}

export type CategoryType = 'Receita' | 'Despesa' | 'Ambos';

export interface Category extends BaseEntity {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface Budget extends BaseEntity {
  categoryId: string;
  monthYear: string; // Format 'YYYY-MM'
  limitAmount: number;
  spentAmount: number; // Calculated dynamically or cached
}

export interface Installment {
  id: string;
  transactionId: string;
  cardId: string;
  number: number;
  totalInstallments: number;
  value: number;
  dueDate: Date;
  status: 'Prevista' | 'Na Fatura' | 'Paga' | 'Cancelada';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  theme?: string;
  currency?: string;
  language?: string;
  dateFormat?: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';
  previousValue?: string; // JSON stringified
  newValue?: string; // JSON stringified
  timestamp: Date;
}

export type PurchaseStatus = 'Desejado' | 'Comprado' | 'Concluído' | 'Cancelado';

export interface Purchase extends BaseEntity {
  name: string;
  description?: string;
  categoryId?: string;
  valor: number;
  loja?: string;
  dataCompra: Date;
  formaPagamento: 'Dinheiro' | 'Cartão' | 'Pix' | 'Outro';
  contaId?: string;
  cartaoId?: string;
  status: PurchaseStatus;
  garantiaFim?: Date;
  observacoes?: string;
  comprovanteBase64?: string; // Base64 invoice/photo attachment
}

export interface Goal extends BaseEntity {
  name: string;
  objetivo: string;
  valorMeta: number;
  valorAtual: number;
  dataLimite: Date;
  status: 'Em Andamento' | 'Concluída' | 'Expirada';
}

export interface Safe extends BaseEntity {
  name: string;
  objetivo: string;
  valorMeta: number;
  saldoAtual: number;
  descricao?: string;
}

export interface MovementCofre extends BaseEntity {
  cofreId: string;
  tipo: 'Depósito' | 'Retirada' | 'Rendimento';
  valor: number;
  contaId?: string;
  data: Date;
  transactionId?: string; // Links back to the bank account transaction
}

export type LoanStatus = 'Ativo' | 'Concluído';

export interface Loan extends BaseEntity {
  name: string;
  totalAmount: number; // Valor total original
  installmentValue: number; // Valor base da parcela
  totalInstallments: number; // Quantidade de meses/parcelas
  firstDueDate: Date; // Data de vencimento da primeira parcela
  status: LoanStatus;
  description?: string;
  // Link para conta que geralmente paga o empréstimo (opcional)
  accountId?: string;
  amortizedSavings?: number;
  amortizedCount?: number;
}
