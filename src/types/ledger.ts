export interface Expense { id: string; name: string; value: number; paid: boolean; dueDay?: number; createdAt?: number; }
export interface RecurringExpense { id: string; name: string; value: number; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; }
export interface CardBill { id: string; name: string; value: number; paid: boolean; dueDay?: number; paymentDate?: string; createdAt?: number; }
export interface ExtraIncome { id: string; description: string; value: number; createdAt?: number; }
export interface Investment { id: string; type: 'CDB' | 'Bitcoin'; description: string; value: number; date: string; action: 'deposit' | 'withdraw'; createdAt?: number; }
export interface Goal { id: string; name: string; targetValue: number; purchased: boolean; createdAt?: number; }
export interface LedgerEntry { id: string; date: string; description: string; value: number; source: string; createdAt?: number; }
export interface ManualEntry { id: string; date: string; description: string; value: number; createdAt?: number; }
export interface Card { id: string; name: string; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; }
export interface Subscription { id: string; name: string; value: number; dueDay: number; startMonth: string; endMonth?: string; createdAt?: number; paymentMethod?: string; }
export interface Installment { id: string; name: string; monthlyValue: number; totalMonths: number; startDate: string; paidMonths: string[]; createdAt?: number; paymentMethod?: string; dueDay?: number; }

export interface MonthData {
  income: number;
  incomeDate?: string;
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
  subscriptionPaidState: Record<string, boolean>;
  subscriptionValueOverrides: Record<string, number>;
  subscriptionDateOverrides?: Record<string, string>;
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
  subscriptionPaidState: {}, 
  subscriptionValueOverrides: {}, 
  subscriptionDateOverrides: {}
};