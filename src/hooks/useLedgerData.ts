import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, parseISO, differenceInMonths } from 'date-fns';
import type { LedgerData, MonthData, Expense, CardBill, Installment } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const STORAGE_KEY = 'ledger_data';

const loadData = (): LedgerData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { monthlyData: {}, installments: [] };
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
        [monthKey]: updater(prev.monthlyData[monthKey] || { ...emptyMonthData }),
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

  // Totals
  const totalExpenses =
    currentMonthData.variableExpenses.reduce((a, c) => a + Number(c.value), 0) +
    currentMonthData.cardBills.reduce((a, c) => a + Number(c.value), 0) +
    activeInstallments.reduce((a, c) => a + Number(c.monthlyValue), 0);

  const balance = currentMonthData.income - totalExpenses;

  return {
    currentDate,
    monthKey,
    setCurrentDate,
    goNextMonth: () => setCurrentDate(d => addMonths(d, 1)),
    goPrevMonth: () => setCurrentDate(d => subMonths(d, 1)),
    currentMonthData,
    setIncome,
    addExpense, updateExpense, removeExpense,
    addCard, updateCard, removeCard,
    activeInstallments, getInstallmentNumber,
    addInstallment, toggleInstallmentPaid, removeInstallment,
    totalExpenses, balance,
  };
}
