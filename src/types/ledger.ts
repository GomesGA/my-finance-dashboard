export interface Expense { id: string; name: string; value: number; paid: boolean; dueDay?: number; createdAt?: number; }
export interface RecurringExpense { id: string; name: string; value: number; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; categoryId?: string; }
export interface CardBill { id: string; name: string; value: number; paid: boolean; dueDay?: number; paymentDate?: string; bankAccountId?: string; paidAt?: string; categoryId?: string; createdAt?: number; }
export interface ExtraIncome { id: string; description: string; value: number; createdAt?: number; }
export interface Investment { id: string; type: 'CDB' | 'Bitcoin'; description: string; value: number; date: string; action: 'deposit' | 'withdraw' | 'yield'; createdAt?: number; }

export interface Goal {
  id: string;
  name: string;
  targetValue: number;
  purchased: boolean;
  actualPaidValue?: number; // <-- Adicionado (Valor real pago)
  paymentDate?: string;     // <-- Adicionado (Data em que foi comprado)
  createdAt?: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  time?: string;
  description: string;
  value: number;
  source: string;
  createdAt?: number;
  categoryId?: string;
  bankAccountId?: string;
  observation?: string;     // <-- Adicionado
  paidByOthers?: boolean;   // <-- Adicionado
}

export interface ManualEntry {
  id: string;
  date: string;
  description: string;
  value: number;
  createdAt?: number;
  paymentMethod?: string;
  bankAccountId?: string;
  occurredAt?: string;
  categoryId?: string;
  observation?: string;     // <-- Adicionado
  paidByOthers?: boolean;   // <-- Adicionado
}

export interface Card { id: string; name: string; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; }
export interface Subscription { id: string; name: string; value: number; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; paymentMethod?: string; categoryId?: string; }
export interface Installment { id: string; name: string; monthlyValue: number; totalMonths: number; startDate: string; paidMonths: string[]; createdAt?: number; paymentMethod?: string; dueDay?: number; paidDates?: Record<string, string>; paidBankAccounts?: Record<string, string>; categoryId?: string; }
export interface BankAccount { id: string; name: string; kind: 'PF' | 'PJ'; createdAt?: number; }
export interface Category { id: string; name: string; color?: string; createdAt?: number; }

export interface MonthData {
  income: number;
  incomeDate?: string;
  incomeTime?: string;
  incomeBankAccountId?: string;
  variableExpenses: Expense[];
  cardBills: CardBill[];
  extraIncomes: ExtraIncome[];
  extraordinaryExpenses: Expense[];
  investments: Investment[];
  manualEntries: ManualEntry[];
  manualExits: ManualEntry[];
  recurringPaidState: Record<string, boolean>;
  recurringValueOverrides: Record<string, number>;
  recurringDateOverrides?: Record<string, string>;
  recurringBankAccounts?: Record<string, string>;
  recurringActiveState?: Record<string, boolean>;
  recurringPaidAt?: Record<string, string>;
  subscriptionPaidState: Record<string, boolean>;
  subscriptionValueOverrides: Record<string, number>;
  subscriptionDateOverrides?: Record<string, string>;
  subscriptionBankAccounts?: Record<string, string>;
  subscriptionPaidAt?: Record<string, string>;
}

export interface LedgerData {
  monthlyData: Record<string, MonthData>;
  installments: Installment[];
  goals: Goal[];
  recurringExpenses: RecurringExpense[];
  cards: Card[];
  subscriptions: Subscription[];
}

export const emptyMonthData: MonthData = {
  income: 0,
  variableExpenses: [],
  cardBills: [],
  extraIncomes: [],
  extraordinaryExpenses: [],
  investments: [],
  manualEntries: [],
  manualExits: [],
  recurringPaidState: {},
  recurringValueOverrides: {},
  recurringDateOverrides: {},
  recurringBankAccounts: {},
  recurringActiveState: {},
  subscriptionPaidState: {},
  subscriptionValueOverrides: {},
  subscriptionDateOverrides: {},
  subscriptionBankAccounts: {}
};
