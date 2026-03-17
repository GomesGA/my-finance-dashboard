export interface Expense {
  id: string;
  name: string;
  value: number;
  paid: boolean;
  dueDay?: number; // day of month for due date
}

export interface RecurringExpense {
  id: string;
  name: string;
  value: number;
  dueDay: number;
  startMonth: string; // monthKey when created (e.g. "2026-01")
  endMonth?: string;  // monthKey when soft-deleted (exclusive: hidden from this month onward)
}

export interface CardBill {
  id: string;
  name: string;
  value: number;
  paid: boolean;
  dueDay?: number;
}

export interface ExtraIncome {
  id: string;
  description: string;
  value: number;
}

export interface Investment {
  id: string;
  type: 'CDB' | 'Bitcoin';
  description: string;
  value: number;
  date: string; // monthKey
  action: 'deposit' | 'withdraw';
}

export interface Goal {
  id: string;
  name: string;
  targetValue: number;
  purchased: boolean;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  value: number;
  source: string;
}

export interface ManualEntry {
  id: string;
  date: string; // full date YYYY-MM-DD
  description: string;
  value: number;
}

export interface MonthData {
  income: number;
  variableExpenses: Expense[];
  cardBills: CardBill[];
  extraIncomes: ExtraIncome[];
  extraordinaryExpenses: Expense[];
  investments: Investment[];
  manualEntries: ManualEntry[];
  manualExits: ManualEntry[];
  /** Per-month paid state for recurring expenses, keyed by recurring expense id */
  recurringPaidState: Record<string, boolean>;
  /** Per-month value overrides for recurring expenses */
  recurringValueOverrides: Record<string, number>;
}

export interface Installment {
  id: string;
  name: string;
  monthlyValue: number;
  totalMonths: number;
  startDate: string;
  paidMonths: string[];
}

export interface LedgerData {
  monthlyData: Record<string, MonthData>;
  installments: Installment[];
  goals: Goal[];
  recurringExpenses: RecurringExpense[];
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
};
