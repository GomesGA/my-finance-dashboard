import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { LedgerData, MonthData, Expense, CardBill, Installment, ExtraIncome, Investment, Goal, LedgerEntry, RecurringExpense, ManualEntry } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const STORAGE_KEY = 'ledger_data';

const getInitialData = (): LedgerData => ({ monthlyData: {}, installments: [], goals: [], recurringExpenses: [] });

export function useLedgerData() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<LedgerData>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Nova trava de segurança para impedir que ele salve dados vazios por cima da nuvem
  const isFetchingRef = useRef(false); 

  const monthKey = format(currentDate, 'yyyy-MM');

  // 1. CARREGAR OS DADOS DO SUPABASE (Com escuta de Login)
  useEffect(() => {
    const fetchCloudData = async (userId: string) => {
      isFetchingRef.current = true; // Ativa a trava de segurança
      try {
        const { data: dbData, error } = await supabase
          .from('user_ledger')
          .select('dados')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (dbData && dbData.dados) {
          const parsed = dbData.dados as LedgerData;
          
          // Mantendo as validações de segurança originais
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
          
          setData(parsed);
        }
      } catch (err) {
        console.error("Erro ao carregar do Supabase", err);
      } finally {
        isFetchingRef.current = false; // Desativa a trava de segurança
        setIsLoaded(true);
      }
    };

    // Tenta buscar ao abrir o site
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchCloudData(session.user.id);
      else setIsLoaded(true);
    });

    // A MÁGICA: Escuta o exato momento em que o login é concluído
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        fetchCloudData(session.user.id);
      } else if (!session) {
        setData(getInitialData()); // Se você clicar em "Sair", limpa a tela
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. SALVAR NA NUVEM SEMPRE QUE O ESTADO MUDAR
  useEffect(() => {
    // Se não carregou ainda OU se estiver no meio do download (fetching), NÃO SALVE!
    if (!isLoaded || isFetchingRef.current) return; 

    const saveToCloud = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // O upsert garante que, se a linha não existir, ele cria. Se existir, ele atualiza.
        await supabase
          .from('user_ledger')
          .upsert(
            { user_id: session.user.id, dados: data }, 
            { onConflict: 'user_id' }
          );

      } catch (err) {
        console.error("Erro ao salvar no Supabase:", err);
      }
    };

    const timeoutId = setTimeout(() => { saveToCloud(); }, 500);
    return () => clearTimeout(timeoutId);
  }, [data, isLoaded]);

  // Daqui para baixo, o código continua igual...
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

  const updateRecurringDate = (id: string, date: string) => {
    updateMonthData(m => ({ ...m, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: date } }));
  };

  const removeLedgerEntry = (idStr: string, source: string) => {
    const id = idStr.replace(/^[a-z]+-/, ''); 
    if (source === 'manual-entry') removeManualEntry(id);
    else if (source === 'manual-exit') removeManualExit(id);
    else if (source === 'card') updateCard(id, { paid: false });
    else if (source === 'recurring') toggleRecurringPaid(id);
    else if (source === 'salary') setIncome(0);
  };

  const editLedgerEntry = (idStr: string, source: string, date: string, description: string, value: number) => {
    const id = idStr.replace(/^[a-z]+-/, '');
    if (source === 'manual-entry') {
      updateMonthData(m => ({ ...m, manualEntries: (m.manualEntries||[]).map(e => e.id === id ? { ...e, date, description, value } : e) }));
    } else if (source === 'manual-exit') {
      updateMonthData(m => ({ ...m, manualExits: (m.manualExits||[]).map(e => e.id === id ? { ...e, date, description, value } : e) }));
    } else if (source === 'card') {
      updateCard(id, { name: description, value, paymentDate: date });
    } else if (source === 'recurring') {
      updateRecurringValue(id, value);
      updateRecurringDate(id, date);
      setData(prev => ({ ...prev, recurringExpenses: prev.recurringExpenses.map(re => re.id === id ? { ...re, name: description } : re) }));
    } else if (source === 'salary') {
      setIncome(value);
    }
  };

  // Helper de Ordenação
  const sortEntriesByDate = (a: LedgerEntry, b: LedgerEntry) => new Date(a.date).getTime() - new Date(b.date).getTime();

  // Computed Entries
  const computedEntries: LedgerEntry[] = useMemo(() => {
    const entries: LedgerEntry[] = [];
    if (currentMonthData.income > 0) entries.push({ id: 'salary', date: `${monthKey}-01`, description: 'Salário', value: currentMonthData.income, source: 'salary' });
    (currentMonthData.manualEntries || []).forEach(me => entries.push({ id: `me-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-entry' }));
    return entries.sort(sortEntriesByDate);
  }, [currentMonthData, monthKey]);

  // Computed Exits
  const computedExits: LedgerEntry[] = useMemo(() => {
    const exits: LedgerEntry[] = [];
    activeRecurringExpenses.forEach(re => {
      if (currentMonthData.recurringPaidState[re.id]) {
        const val = currentMonthData.recurringValueOverrides[re.id] ?? re.value;
        const pDate = currentMonthData.recurringDateOverrides?.[re.id] || `${monthKey}-${String(re.dueDay).padStart(2, '0')}`;
        exits.push({ id: `rec-${re.id}`, date: pDate, description: re.name, value: Number(val), source: 'recurring' });
      }
    });
    currentMonthData.cardBills.filter(c => c.paid).forEach(c => {
      const pDate = c.paymentDate || `${monthKey}-${String(c.dueDay || 1).padStart(2, '0')}`;
      exits.push({ id: `card-${c.id}`, date: pDate, description: c.name || 'Cartão', value: Number(c.value), source: 'card' });
    });
    (currentMonthData.manualExits || []).forEach(me => exits.push({ id: `mx-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-exit' }));
    return exits.sort(sortEntriesByDate); // Ordenação cronológica garantida!
  }, [currentMonthData, monthKey, activeRecurringExpenses]);

  const totalIncome = computedEntries.reduce((a, c) => a + c.value, 0);
  const totalExpenses = computedExits.reduce((a, c) => a + c.value, 0);
  const balance = totalIncome - totalExpenses;

  const allInvestments = useMemo(() => Object.entries(data.monthlyData).flatMap(([, m]) => m.investments || []), [data.monthlyData]);

  return {
    currentDate, monthKey, data, setCurrentDate, goNextMonth: () => setCurrentDate(d => addMonths(d, 1)), goPrevMonth: () => setCurrentDate(d => subMonths(d, 1)),
    currentMonthData, setIncome, addExpense, updateExpense, removeExpense, addCard, updateCard, removeCard, addExtraIncome, updateExtraIncome, removeExtraIncome,
    addExtraordinaryExpense, updateExtraordinaryExpense, removeExtraordinaryExpense, activeRecurringExpenses, addRecurringExpense, softDeleteRecurringExpense,
    toggleRecurringPaid, updateRecurringValue, addInvestment, removeInvestment, addManualEntry, removeManualEntry, addManualExit, removeManualExit,
    activeInstallments, getInstallmentNumber, addInstallment, toggleInstallmentPaid, removeInstallment, addGoal, toggleGoalPurchased, removeGoal,
    computedEntries, computedExits, totalExpenses, totalIncome, balance, allInvestments,
    removeLedgerEntry, editLedgerEntry // Novas funções exportadas
  };
}