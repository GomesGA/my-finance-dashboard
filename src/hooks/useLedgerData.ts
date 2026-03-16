import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import type { LedgerData, MonthData, Expense, CardBill, Installment, ExtraIncome, Investment } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const STORAGE_KEY = 'ledger_data';

const loadData = (): LedgerData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { monthlyData: {}, installments: [] };
    const parsed = JSON.parse(saved);
    // Migrate old month data missing new fields
    if (parsed.monthlyData) {
      for (const key of Object.keys(parsed.monthlyData)) {
        const m = parsed.monthlyData[key];
        if (!m.extraIncomes) m.extraIncomes = [];
        if (!m.extraordinaryExpenses) m.extraordinaryExpenses = [];
        if (!m.investments) m.investments = [];
      }
    }
    return parsed;
  } catch {
    return { monthlyData: {}, installments: [] };
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
        [monthKey]: updater(prev.monthlyData[monthKey] || { ...emptyMonthData, extraIncomes: [], extraordinaryExpenses: [], investments: [] }),
      },
    }));
  }, [monthKey]);

  // Income
  const setIncome = (val: number) => updateMonthData(m => ({ ...m, income: val }));

  // Variable Expenses
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

  // Investments
  const addInvestment = (type: 'CDB' | 'Bitcoin', description: string, value: number) => {
    const item: Investment = { id: crypto.randomUUID(), type, description, value, date: monthKey };
    updateMonthData(m => ({ ...m, investments: [...(m.investments || []), item] }));
  };
  const removeInvestment = (id: string) => {
    updateMonthData(m => ({ ...m, investments: (m.investments || []).filter(i => i.id !== id) }));
  };

  // Installments
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

  // Totals — only paid items count toward expenses and balance
  const totalExpenses =
    currentMonthData.variableExpenses.filter(e => e.paid).reduce((a, c) => a + Number(c.value), 0) +
    currentMonthData.cardBills.filter(c => c.paid).reduce((a, c) => a + Number(c.value), 0) +
    (currentMonthData.extraordinaryExpenses || []).filter(e => e.paid).reduce((a, c) => a + Number(c.value), 0) +
    activeInstallments.filter(i => i.paidMonths.includes(monthKey)).reduce((a, c) => a + Number(c.monthlyValue), 0);

  const totalIncome = currentMonthData.income +
    (currentMonthData.extraIncomes || []).reduce((a, c) => a + Number(c.value), 0);

  const balance = totalIncome - totalExpenses;

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
    addInvestment, removeInvestment,
    activeInstallments, getInstallmentNumber,
    addInstallment, toggleInstallmentPaid, removeInstallment,
    totalExpenses, totalIncome, balance,
  };
}
