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

export interface MonthData {
  income: number;
  variableExpenses: Expense[];
  cardBills: CardBill[];
}

export interface Installment {
  id: string;
  name: string;
  monthlyValue: number;
  totalMonths: number;
  startDate: string; // yyyy-MM format
  paidMonths: string[]; // array of monthKeys like "2026-01"
}

export interface LedgerData {
  monthlyData: Record<string, MonthData>;
  installments: Installment[];
}

export const emptyMonthData: MonthData = {
  income: 0,
  variableExpenses: [],
  cardBills: [],
};
