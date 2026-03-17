export interface Expense {
  id: string;
  name: string;
  value: number;
  paid: boolean;
}

export interface CardBill {
  id: string;
  name: string;
  value: number;
  paid: boolean;
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

export interface MonthData {
  income: number;
  variableExpenses: Expense[];
  cardBills: CardBill[];
  extraIncomes: ExtraIncome[];
  extraordinaryExpenses: Expense[];
  investments: Investment[];
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
}

export const emptyMonthData: MonthData = {
  income: 0,
  variableExpenses: [],
  cardBills: [],
  extraIncomes: [],
  extraordinaryExpenses: [],
  investments: [],
};
