import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import type { LedgerData, MonthData, Expense, CardBill, Installment, ExtraIncome, Investment, Goal, LedgerEntry, RecurringExpense, ManualEntry } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const STORAGE_KEY = 'ledger_data';

const loadData = (): LedgerData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { monthlyData: {}, installments: [], goals: [], recurringExpenses: [] };
    const parsed = JSON.parse(saved);
    if (parsed.monthlyData) {
      for (const key of Object.keys(parsed.monthlyData)) {
        const m = parsed.monthlyData[key];
        if (!m.extraIncomes) m.extraIncomes = [];
        if (!m.extraordinaryExpenses) m.extraordinaryExpenses = [];
        if (!m.investments) m.investments = [];
        if (!m.manualEntries) m.manualEntries = [];
        if (!m.manualExits) m.manualExits = [];
        if (!m.recurringPaidState) m.recurringPaidState = {};
        if (!m.recurringValueOverrides) m.recurringValueOverrides = {};
        m.investments = m.investments.map((inv: any) => ({
          ...inv,
          action: inv.action || 'deposit',
        }));
      }
    }
    if (!parsed.goals) parsed.goals = [];
    if (!parsed.recurringExpenses) parsed.recurringExpenses = [];
    return parsed;
  } catch {
    return { monthlyData: {}, installments: [], goals: [], recurringExpenses: [] };
  }
};

export function useLedgerData() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<LedgerData>(loadData);

  const monthKey = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentMonthData: MonthData = data.monthlyData[monthKey] || { ...emptyMonthData };

  const updateMonthData = useCallback((updater: (prev: MonthData) => MonthData) => {
    setData(prev => ({
      ...prev,
      monthlyData: {
        ...prev.monthlyData,
        [monthKey]: updater(prev.monthlyData[monthKey] || { ...emptyMonthData, recurringPaidState: {}, recurringValueOverrides: {}, manualEntries: [], manualExits: [] }),
      },
    }));
  }, [monthKey]);

  // Income
  const setIncome = (val: number) => updateMonthData(m => ({ ...m, income: val }));

  // Variable Expenses (legacy - kept for extraordinary)
  const addExpense = () => {
    const item: Expense = { id: crypto.randomUUID(), name: '', value: 0, paid: false };
    updateMonthData(m => ({ ...m, variableExpenses: [...m.variableExpenses, item] }));
  };
  const updateExpense = (id: string, patch: Partial<Expense>) => {
    updateMonthData(m => ({
      ...m,
      variableExpenses: m.variableExpenses.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
  };
  const removeExpense = (id: string) => {
    updateMonthData(m => ({ ...m, variableExpenses: m.variableExpenses.filter(e => e.id !== id) }));
  };

  // Card Bills
  const addCard = () => {
    const item: CardBill = { id: crypto.randomUUID(), name: '', value: 0, paid: false };
    updateMonthData(m => ({ ...m, cardBills: [...m.cardBills, item] }));
  };
  const updateCard = (id: string, patch: Partial<CardBill>) => {
    updateMonthData(m => ({
      ...m,
      cardBills: m.cardBills.map(c => c.id === id ? { ...c, ...patch } : c),
    }));
  };
  const removeCard = (id: string) => {
    updateMonthData(m => ({ ...m, cardBills: m.cardBills.filter(c => c.id !== id) }));
  };

  // Extra Incomes
  const addExtraIncome = () => {
    const item: ExtraIncome = { id: crypto.randomUUID(), description: '', value: 0 };
    updateMonthData(m => ({ ...m, extraIncomes: [...(m.extraIncomes || []), item] }));
  };
  const updateExtraIncome = (id: string, patch: Partial<ExtraIncome>) => {
    updateMonthData(m => ({
      ...m,
      extraIncomes: (m.extraIncomes || []).map(e => e.id === id ? { ...e, ...patch } : e),
    }));
  };
  const removeExtraIncome = (id: string) => {
    updateMonthData(m => ({ ...m, extraIncomes: (m.extraIncomes || []).filter(e => e.id !== id) }));
  };

  // Extraordinary Expenses
  const addExtraordinaryExpense = () => {
    const item: Expense = { id: crypto.randomUUID(), name: '', value: 0, paid: false };
    updateMonthData(m => ({ ...m, extraordinaryExpenses: [...(m.extraordinaryExpenses || []), item] }));
  };
  const updateExtraordinaryExpense = (id: string, patch: Partial<Expense>) => {
    updateMonthData(m => ({
      ...m,
      extraordinaryExpenses: (m.extraordinaryExpenses || []).map(e => e.id === id ? { ...e, ...patch } : e),
    }));
  };
  const removeExtraordinaryExpense = (id: string) => {
    updateMonthData(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).filter(e => e.id !== id) }));
  };

  // Recurring Expenses (global, with temporal propagation)
  const activeRecurringExpenses = useMemo(() => {
    return data.recurringExpenses.filter(re => {
      if (re.startMonth > monthKey) return false;
      if (re.endMonth && re.endMonth <= monthKey) return false;
      return true;
    });
  }, [data.recurringExpenses, monthKey]);

  const addRecurringExpense = (name: string, value: number, dueDay: number) => {
    const re: RecurringExpense = {
      id: crypto.randomUUID(),
      name,
      value,
      dueDay,
      startMonth: monthKey,
    };
    setData(prev => ({ ...prev, recurringExpenses: [...prev.recurringExpenses, re] }));
  };

  const softDeleteRecurringExpense = (id: string) => {
    setData(prev => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.map(re =>
        re.id === id ? { ...re, endMonth: monthKey } : re
      ),
    }));
  };

  const toggleRecurringPaid = (id: string) => {
    updateMonthData(m => ({
      ...m,
      recurringPaidState: {
        ...m.recurringPaidState,
        [id]: !m.recurringPaidState[id],
      },
    }));
  };

  const updateRecurringValue = (id: string, value: number) => {
    updateMonthData(m => ({
      ...m,
      recurringValueOverrides: {
        ...m.recurringValueOverrides,
        [id]: value,
      },
    }));
  };

  // Investments
  const addInvestment = (type: 'CDB' | 'Bitcoin', description: string, value: number, action: 'deposit' | 'withdraw') => {
    const item: Investment = { id: crypto.randomUUID(), type, description, value, date: monthKey, action };
    updateMonthData(m => ({ ...m, investments: [...(m.investments || []), item] }));
  };
  const removeInvestment = (id: string) => {
    updateMonthData(m => ({ ...m, investments: (m.investments || []).filter(i => i.id !== id) }));
  };

  // Manual Entries & Exits
  const addManualEntry = (date: string, description: string, value: number) => {
    const item: ManualEntry = { id: crypto.randomUUID(), date, description, value };
    updateMonthData(m => ({ ...m, manualEntries: [...(m.manualEntries || []), item] }));
  };
  const removeManualEntry = (id: string) => {
    updateMonthData(m => ({ ...m, manualEntries: (m.manualEntries || []).filter(e => e.id !== id) }));
  };
  const addManualExit = (date: string, description: string, value: number) => {
    const item: ManualEntry = { id: crypto.randomUUID(), date, description, value };
    updateMonthData(m => ({ ...m, manualExits: [...(m.manualExits || []), item] }));
  };
  const removeManualExit = (id: string) => {
    updateMonthData(m => ({ ...m, manualExits: (m.manualExits || []).filter(e => e.id !== id) }));
  };

  // Installments (display only)
  const activeInstallments = data.installments.filter(inst => {
    const startParts = inst.startDate.split('-');
    const startDate = new Date(Number(startParts[0]), Number(startParts[1]) - 1, 1);
    const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const diff = differenceInMonths(currentMonthDate, startDate);
    return diff >= 0 && diff < inst.totalMonths;
  });

  const getInstallmentNumber = (inst: Installment): number => {
    const startParts = inst.startDate.split('-');
    const startDate = new Date(Number(startParts[0]), Number(startParts[1]) - 1, 1);
    const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return differenceInMonths(currentMonthDate, startDate) + 1;
  };

  const addInstallment = (name: string, monthlyValue: number, totalMonths: number) => {
    const inst: Installment = {
      id: crypto.randomUUID(),
      name,
      monthlyValue,
      totalMonths,
      startDate: monthKey,
      paidMonths: [],
    };
    setData(prev => ({ ...prev, installments: [...prev.installments, inst] }));
  };

  const toggleInstallmentPaid = (id: string) => {
    setData(prev => ({
      ...prev,
      installments: prev.installments.map(inst => {
        if (inst.id !== id) return inst;
        const isPaid = inst.paidMonths.includes(monthKey);
        return {
          ...inst,
          paidMonths: isPaid
            ? inst.paidMonths.filter(m => m !== monthKey)
            : [...inst.paidMonths, monthKey],
        };
      }),
    }));
  };

  const removeInstallment = (id: string) => {
    setData(prev => ({ ...prev, installments: prev.installments.filter(i => i.id !== id) }));
  };

  // Goals
  const addGoal = (name: string, targetValue: number) => {
    const goal: Goal = { id: crypto.randomUUID(), name, targetValue, purchased: false };
    setData(prev => ({ ...prev, goals: [...prev.goals, goal] }));
  };
  const toggleGoalPurchased = (id: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, purchased: !g.purchased } : g),
    }));
  };
  const removeGoal = (id: string) => {
    setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  };

  // Computed Entries
  const computedEntries: LedgerEntry[] = useMemo(() => {
    const entries: LedgerEntry[] = [];
    if (currentMonthData.income > 0) {
      entries.push({ id: 'salary', date: monthKey, description: 'Salário', value: currentMonthData.income, source: 'salary' });
    }
    (currentMonthData.extraIncomes || []).forEach(ei => {
      if (ei.value > 0) {
        entries.push({ id: `ei-${ei.id}`, date: monthKey, description: ei.description || 'Renda Extra', value: Number(ei.value), source: 'extra-income' });
      }
    });
    (currentMonthData.investments || []).filter(i => i.action === 'withdraw').forEach(inv => {
      entries.push({ id: `inv-${inv.id}`, date: inv.date, description: `Resgate ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-withdraw' });
    });
    (currentMonthData.manualEntries || []).forEach(me => {
      entries.push({ id: `me-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-entry' });
    });
    return entries;
  }, [currentMonthData, monthKey]);

  // Computed Exits
  const computedExits: LedgerEntry[] = useMemo(() => {
    const exits: LedgerEntry[] = [];
    // Recurring expenses (paid)
    activeRecurringExpenses.forEach(re => {
      if (currentMonthData.recurringPaidState[re.id]) {
        const val = currentMonthData.recurringValueOverrides[re.id] ?? re.value;
        exits.push({ id: `rec-${re.id}`, date: `${monthKey}-${String(re.dueDay).padStart(2, '0')}`, description: re.name, value: Number(val), source: 'recurring' });
      }
    });
    // Card bills (paid)
    currentMonthData.cardBills.filter(c => c.paid).forEach(c => {
      exits.push({ id: `card-${c.id}`, date: monthKey, description: c.name || 'Cartão', value: Number(c.value), source: 'card' });
    });
    // Extraordinary expenses (paid)
    (currentMonthData.extraordinaryExpenses || []).filter(e => e.paid).forEach(e => {
      exits.push({ id: `ext-${e.id}`, date: monthKey, description: e.name || 'Despesa Extra', value: Number(e.value), source: 'extraordinary' });
    });
    // Investment deposits
    (currentMonthData.investments || []).filter(i => i.action === 'deposit').forEach(inv => {
      exits.push({ id: `inv-${inv.id}`, date: inv.date, description: `Aporte ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-deposit' });
    });
    // Manual exits
    (currentMonthData.manualExits || []).forEach(me => {
      exits.push({ id: `mx-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-exit' });
    });
    return exits;
  }, [currentMonthData, monthKey, activeRecurringExpenses]);

  const totalIncome = computedEntries.reduce((a, c) => a + c.value, 0);
  const totalExpenses = computedExits.reduce((a, c) => a + c.value, 0);
  const balance = totalIncome - totalExpenses;

  const allInvestments = useMemo(() => {
    return Object.entries(data.monthlyData).flatMap(([, m]) => m.investments || []);
  }, [data.monthlyData]);

  return {
    currentDate,
    monthKey,
    data,
    setCurrentDate,
    goNextMonth: () => setCurrentDate(d => addMonths(d, 1)),
    goPrevMonth: () => setCurrentDate(d => subMonths(d, 1)),
    currentMonthData,
    setIncome,
    addExpense, updateExpense, removeExpense,
    addCard, updateCard, removeCard,
    addExtraIncome, updateExtraIncome, removeExtraIncome,
    addExtraordinaryExpense, updateExtraordinaryExpense, removeExtraordinaryExpense,
    activeRecurringExpenses, addRecurringExpense, softDeleteRecurringExpense,
    toggleRecurringPaid, updateRecurringValue,
    addInvestment, removeInvestment,
    addManualEntry, removeManualEntry, addManualExit, removeManualExit,
    activeInstallments, getInstallmentNumber,
    addInstallment, toggleInstallmentPaid, removeInstallment,
    addGoal, toggleGoalPurchased, removeGoal,
    computedEntries, computedExits,
    totalExpenses, totalIncome, balance,
    allInvestments,
  };
}
