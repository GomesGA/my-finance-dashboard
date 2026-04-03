import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { LedgerData, MonthData, Expense, CardBill, Installment, ExtraIncome, Investment, Goal, LedgerEntry, RecurringExpense, ManualEntry, Card, Subscription } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const STORAGE_KEY = 'ledger_data';
const getInitialData = (): LedgerData => ({ monthlyData: {}, installments: [], goals: [], recurringExpenses: [], cards: [], subscriptions: [] });

export function useLedgerData() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<LedgerData>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);
  const isFetchingRef = useRef(false); 
  const monthKey = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    const fetchCloudData = async (userId: string) => {
      isFetchingRef.current = true;
      try {
        const { data: dbData, error } = await supabase.from('user_ledger').select('dados').eq('user_id', userId).single();
        if (error && error.code !== 'PGRST116') throw error;

        if (dbData && dbData.dados) {
          const parsed = dbData.dados as LedgerData;
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
              if (!m.subscriptionPaidState) m.subscriptionPaidState = {};
              if (!m.subscriptionValueOverrides) m.subscriptionValueOverrides = {};
              m.investments = m.investments.map((inv: any) => ({ ...inv, action: inv.action || 'deposit' }));
            }
          }
          if (!parsed.goals) parsed.goals = [];
          if (!parsed.recurringExpenses) parsed.recurringExpenses = [];
          if (!parsed.subscriptions) parsed.subscriptions = [];
        
          if (!parsed.cards) {
            const allCardsMap = new Map<string, Card>();
            Object.keys(parsed.monthlyData || {}).forEach(mKey => {
              (parsed.monthlyData[mKey].cardBills || []).forEach(cb => {
                if (!allCardsMap.has(cb.id)) allCardsMap.set(cb.id, { id: cb.id, name: cb.name, dueDay: cb.dueDay || 1, startMonth: mKey, createdAt: cb.createdAt || Date.now() });
              });
            });
            parsed.cards = Array.from(allCardsMap.values());
          }
          setData(parsed);
        }
      } catch (err) { console.error("Erro ao carregar do Supabase", err); } 
      finally { isFetchingRef.current = false; setIsLoaded(true); }
    };

    supabase.auth.getSession().then(({ data: { session } }) => { if (session) fetchCloudData(session.user.id); else setIsLoaded(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') fetchCloudData(session.user.id); else if (!session) setData(getInitialData());
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded || isFetchingRef.current) return; 
    const saveToCloud = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('user_ledger').upsert({ user_id: session.user.id, dados: data }, { onConflict: 'user_id' });
      } catch (err) { console.error("Erro ao salvar:", err); }
    };
    const timeoutId = setTimeout(() => saveToCloud(), 500);
    return () => clearTimeout(timeoutId);
  }, [data, isLoaded]);

  const currentMonthData: MonthData = data.monthlyData[monthKey] || { ...emptyMonthData };
  const updateMonthData = useCallback((updater: (prev: MonthData) => MonthData) => {
    setData(prev => ({
      ...prev,
      monthlyData: { ...prev.monthlyData, [monthKey]: updater(prev.monthlyData[monthKey] || { ...emptyMonthData, recurringPaidState: {}, recurringValueOverrides: {}, subscriptionPaidState: {}, subscriptionValueOverrides: {}, manualEntries: [], manualExits: [] }) },
    }));
  }, [monthKey]);

  // FUNÇÕES DE DADOS (Restauradas para não perder histórico antigo)
  const setIncome = (val: number, date?: string) => updateMonthData(m => ({ ...m, income: val, incomeDate: date }));

  const addExpense = () => { const item: Expense = { id: crypto.randomUUID(), name: '', value: 0, paid: false, createdAt: Date.now() }; updateMonthData(m => ({ ...m, variableExpenses: [...m.variableExpenses, item] })); };
  const updateExpense = (id: string, patch: Partial<Expense>) => updateMonthData(m => ({ ...m, variableExpenses: m.variableExpenses.map(e => e.id === id ? { ...e, ...patch } : e) }));
  const removeExpense = (id: string) => updateMonthData(m => ({ ...m, variableExpenses: m.variableExpenses.filter(e => e.id !== id) }));

  const addExtraIncome = () => { const item: ExtraIncome = { id: crypto.randomUUID(), description: '', value: 0, createdAt: Date.now() }; updateMonthData(m => ({ ...m, extraIncomes: [...(m.extraIncomes || []), item] })); };
  const updateExtraIncome = (id: string, patch: Partial<ExtraIncome>) => updateMonthData(m => ({ ...m, extraIncomes: (m.extraIncomes || []).map(e => e.id === id ? { ...e, ...patch } : e) }));
  const removeExtraIncome = (id: string) => updateMonthData(m => ({ ...m, extraIncomes: (m.extraIncomes || []).filter(e => e.id !== id) }));

  const addExtraordinaryExpense = () => { const item: Expense = { id: crypto.randomUUID(), name: '', value: 0, paid: false, createdAt: Date.now() }; updateMonthData(m => ({ ...m, extraordinaryExpenses: [...(m.extraordinaryExpenses || []), item] })); };
  const updateExtraordinaryExpense = (id: string, patch: Partial<Expense>) => updateMonthData(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).map(e => e.id === id ? { ...e, ...patch } : e) }));
  const removeExtraordinaryExpense = (id: string) => updateMonthData(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).filter(e => e.id !== id) }));

  const addCard = () => { const item: Card = { id: crypto.randomUUID(), name: '', dueDay: 1, startMonth: monthKey, createdAt: Date.now() }; setData(prev => ({ ...prev, cards: [...(prev.cards || []), item] })); };
  const updateCard = (id: string, patch: Partial<CardBill>) => {
    if (patch.name !== undefined || patch.dueDay !== undefined) setData(prev => ({ ...prev, cards: (prev.cards || []).map(c => c.id === id ? { ...c, name: patch.name ?? c.name, dueDay: patch.dueDay ?? c.dueDay } : c) }));
    if (patch.value !== undefined || patch.paid !== undefined || patch.paymentDate !== undefined) {
      updateMonthData(m => {
        const existing = m.cardBills.find(c => c.id === id);
        return existing ? { ...m, cardBills: m.cardBills.map(c => c.id === id ? { ...c, ...patch } : c) } : { ...m, cardBills: [...m.cardBills, { id, name: '', value: patch.value || 0, paid: patch.paid || false, paymentDate: patch.paymentDate }] };
      });
    }
  };
  const removeCard = (id: string) => setData(prev => ({ ...prev, cards: (prev.cards || []).map(c => c.id === id ? { ...c, endMonth: monthKey } : c) }));

  const computedCardBills: CardBill[] = useMemo(() => {
    return (data.cards || []).filter(c => { if (c.startMonth > monthKey) return false; if (c.endMonth && c.endMonth <= monthKey) return false; return true; })
      .map(c => { const mData = currentMonthData.cardBills.find(cb => cb.id === c.id); return { id: c.id, name: c.name, dueDay: c.dueDay, value: mData ? mData.value : 0, paid: mData ? mData.paid : false, paymentDate: mData?.paymentDate, createdAt: c.createdAt }; })
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [data.cards, currentMonthData.cardBills, monthKey]);

  // ASSINATURAS
  const activeSubscriptions = useMemo(() => { return (data.subscriptions || []).filter(s => { if (s.startMonth > monthKey) return false; if (s.endMonth && s.endMonth <= monthKey) return false; return true; }); }, [data.subscriptions, monthKey]);
  const addSubscription = (name: string, value: number, dueDay: number, paymentMethod: string) => { const sub: Subscription = { id: crypto.randomUUID(), name, value, dueDay, startMonth: monthKey, createdAt: Date.now(), paymentMethod }; setData(prev => ({ ...prev, subscriptions: [...(prev.subscriptions || []), sub] })); };
  const softDeleteSubscription = (id: string) => setData(prev => ({ ...prev, subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, endMonth: monthKey } : s) }));
  const toggleSubscriptionPaid = (id: string) => updateMonthData(m => ({ ...m, subscriptionPaidState: { ...m.subscriptionPaidState, [id]: !m.subscriptionPaidState[id] } }));
  const updateSubscriptionValue = (id: string, value: number) => updateMonthData(m => ({ ...m, subscriptionValueOverrides: { ...m.subscriptionValueOverrides, [id]: value } }));
  const updateSubscriptionDate = (id: string, date: string) => updateMonthData(m => ({ ...m, subscriptionDateOverrides: { ...(m.subscriptionDateOverrides || {}), [id]: date } }));

  // RECORRENTES E OUTROS
  const activeRecurringExpenses = useMemo(() => { return data.recurringExpenses.filter(re => { if (re.startMonth > monthKey) return false; if (re.endMonth && re.endMonth <= monthKey) return false; return true; }); }, [data.recurringExpenses, monthKey]);
  const addRecurringExpense = (name: string, value: number, dueDay: number) => { const re: RecurringExpense = { id: crypto.randomUUID(), name, value, dueDay, startMonth: monthKey, createdAt: Date.now() }; setData(prev => ({ ...prev, recurringExpenses: [...prev.recurringExpenses, re] })); };
  const softDeleteRecurringExpense = (id: string) => setData(prev => ({ ...prev, recurringExpenses: prev.recurringExpenses.map(re => re.id === id ? { ...re, endMonth: monthKey } : re) }));
  const toggleRecurringPaid = (id: string) => updateMonthData(m => ({ ...m, recurringPaidState: { ...m.recurringPaidState, [id]: !m.recurringPaidState[id] } }));
  const updateRecurringValue = (id: string, value: number) => updateMonthData(m => ({ ...m, recurringValueOverrides: { ...m.recurringValueOverrides, [id]: value } }));
  const updateRecurringDate = (id: string, date: string) => updateMonthData(m => ({ ...m, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: date } }));

  const addInvestment = (type: 'CDB' | 'Bitcoin', description: string, value: number, action: 'deposit' | 'withdraw' | 'yield', date?: string) => { const item: Investment = { id: crypto.randomUUID(), type, description, value, date: date || monthKey, action, createdAt: Date.now() }; updateMonthData(m => ({ ...m, investments: [...(m.investments || []), item] })); };  const removeInvestment = (id: string) => updateMonthData(m => ({ ...m, investments: (m.investments || []).filter(i => i.id !== id) }));
  const addManualEntry = (date: string, description: string, value: number) => { const item: ManualEntry = { id: crypto.randomUUID(), date, description, value, createdAt: Date.now() }; updateMonthData(m => ({ ...m, manualEntries: [...(m.manualEntries || []), item] })); };
  const removeManualEntry = (id: string) => updateMonthData(m => ({ ...m, manualEntries: (m.manualEntries || []).filter(e => e.id !== id) }));
  const addManualExit = (date: string, description: string, value: number) => { const item: ManualEntry = { id: crypto.randomUUID(), date, description, value, createdAt: Date.now() }; updateMonthData(m => ({ ...m, manualExits: [...(m.manualExits || []), item] })); };
  const removeManualExit = (id: string) => updateMonthData(m => ({ ...m, manualExits: (m.manualExits || []).filter(e => e.id !== id) }));

  const activeInstallments = data.installments.filter(inst => { const startDate = new Date(Number(inst.startDate.split('-')[0]), Number(inst.startDate.split('-')[1]) - 1, 1); const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); const diff = differenceInMonths(currentMonthDate, startDate); return diff >= 0 && diff < inst.totalMonths; });
  const getInstallmentNumber = (inst: Installment): number => differenceInMonths(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), new Date(Number(inst.startDate.split('-')[0]), Number(inst.startDate.split('-')[1]) - 1, 1)) + 1;
  const addInstallment = (name: string, monthlyValue: number, totalMonths: number, paymentMethod: string, dueDay: number) => { const inst: Installment = { id: crypto.randomUUID(), name, monthlyValue, totalMonths, startDate: monthKey, paidMonths: [], createdAt: Date.now(), paymentMethod, dueDay }; setData(prev => ({ ...prev, installments: [...prev.installments, inst] })); };
  const toggleInstallmentPaid = (id: string) => setData(prev => ({ ...prev, installments: prev.installments.map(inst => inst.id === id ? { ...inst, paidMonths: inst.paidMonths.includes(monthKey) ? inst.paidMonths.filter(m => m !== monthKey) : [...inst.paidMonths, monthKey] } : inst) }));
  const removeInstallment = (id: string) => setData(prev => ({ ...prev, installments: prev.installments.filter(i => i.id !== id) }));

  const addGoal = (name: string, targetValue: number) => { const goal: Goal = { id: crypto.randomUUID(), name, targetValue, purchased: false, createdAt: Date.now() }; setData(prev => ({ ...prev, goals: [...prev.goals, goal] })); };
  const toggleGoalPurchased = (id: string) => setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, purchased: !g.purchased } : g) }));
  const removeGoal = (id: string) => setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));

  const editSubscription = (id: string, name: string, value: number, dueDay: number, paymentMethod: string) => setData(prev => ({ ...prev, subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, name, value, dueDay, paymentMethod } : s) }));
  const editInstallment = (id: string, name: string, monthlyValue: number, totalMonths: number, paymentMethod: string, dueDay: number) => setData(prev => ({ ...prev, installments: prev.installments.map(i => i.id === id ? { ...i, name, monthlyValue, totalMonths, paymentMethod, dueDay } : i) }));
  const editRecurringExpense = (id: string, name: string, value: number, dueDay: number) => setData(prev => ({ ...prev, recurringExpenses: prev.recurringExpenses.map(re => re.id === id ? { ...re, name, value, dueDay } : re) }));
  const editCard = (id: string, name: string, value: number, dueDay: number) => updateCard(id, { name, value, dueDay });

  const removeLedgerEntry = (idStr: string, source: string) => {
    const id = idStr.replace(/^[a-z]+-/, ''); 
    if (source === 'manual-entry') removeManualEntry(id);
    else if (source === 'manual-exit') removeManualExit(id);
    else if (source === 'card') updateCard(id, { paid: false });
    else if (source === 'recurring') toggleRecurringPaid(id);
    else if (source === 'subscription') toggleSubscriptionPaid(id);
    else if (source === 'installment') toggleInstallmentPaid(id); // NOVO
    else if (source === 'salary') setIncome(0);
    else if (source === 'investment-deposit' || source === 'investment-withdraw' || source === 'investment-yield') removeInvestment(id);
    else if (source === 'extra-income') removeExtraIncome(id);
    else if (source === 'extraordinary') removeExtraordinaryExpense(id);
  };

  const editLedgerEntry = (idStr: string, source: string, date: string, description: string, value: number) => {
    const id = idStr.replace(/^[a-z]+-/, '');
    if (source === 'manual-entry') updateMonthData(m => ({ ...m, manualEntries: (m.manualEntries||[]).map(e => e.id === id ? { ...e, date, description, value } : e) }));
    else if (source === 'manual-exit') updateMonthData(m => ({ ...m, manualExits: (m.manualExits||[]).map(e => e.id === id ? { ...e, date, description, value } : e) }));
    else if (source === 'card') updateCard(id, { name: description, value, paymentDate: date });
    else if (source === 'recurring') { updateRecurringValue(id, value); updateRecurringDate(id, date); setData(prev => ({ ...prev, recurringExpenses: prev.recurringExpenses.map(re => re.id === id ? { ...re, name: description } : re) })); } 
    else if (source === 'subscription') { updateSubscriptionValue(id, value); updateSubscriptionDate(id, date); setData(prev => ({ ...prev, subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, name: description } : s) })); }
    else if (source === 'salary') setIncome(value, date);
    else if (source === 'investment-deposit' || source === 'investment-withdraw' || source === 'investment-yield') updateMonthData(m => ({ ...m, investments: (m.investments||[]).map(inv => inv.id === id ? { ...inv, date, description: description.replace(/^(Aporte|Resgate|Rendimento) (CDB|Bitcoin)( - )?/, ''), value } : inv) }));  
  };

  const sortEntriesByDateAndQueue = (a: LedgerEntry, b: LedgerEntry) => { const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime(); if (dateDiff !== 0) return dateDiff; return (a.createdAt || 0) - (b.createdAt || 0); };

  const computedEntries: LedgerEntry[] = useMemo(() => {
    const entries: LedgerEntry[] = [];
    if (currentMonthData.income > 0) entries.push({ id: 'salary', date: currentMonthData.incomeDate || `${monthKey}-01`, description: 'Salário', value: currentMonthData.income, source: 'salary', createdAt: 0 });
    (currentMonthData.extraIncomes || []).forEach(ei => { if (ei.value > 0) entries.push({ id: `ei-${ei.id}`, date: `${monthKey}-01`, description: ei.description || 'Renda Extra', value: Number(ei.value), source: 'extra-income', createdAt: ei.createdAt }); });
    (currentMonthData.investments || []).filter(i => i.action === 'withdraw').forEach(inv => entries.push({ id: `inv-${inv.id}`, date: inv.date, description: `Resgate ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-withdraw', createdAt: inv.createdAt }));
    (currentMonthData.manualEntries || []).forEach(me => entries.push({ id: `me-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-entry', createdAt: me.createdAt }));
    return entries.sort(sortEntriesByDateAndQueue);
  }, [currentMonthData, monthKey]);

  const computedExits: LedgerEntry[] = useMemo(() => {
    const exits: LedgerEntry[] = [];
    activeRecurringExpenses.forEach(re => { if (currentMonthData.recurringPaidState[re.id]) exits.push({ id: `rec-${re.id}`, date: currentMonthData.recurringDateOverrides?.[re.id] || `${monthKey}-${String(re.dueDay).padStart(2, '0')}`, description: re.name, value: Number(currentMonthData.recurringValueOverrides[re.id] ?? re.value), source: 'recurring', createdAt: re.createdAt }); });
    
    activeSubscriptions.forEach(sub => { 
      if (currentMonthData.subscriptionPaidState[sub.id]) {
        if (!sub.paymentMethod || sub.paymentMethod === 'Pix') {
          exits.push({ id: `sub-${sub.id}`, date: currentMonthData.subscriptionDateOverrides?.[sub.id] || `${monthKey}-${String(sub.dueDay).padStart(2, '0')}`, description: sub.name, value: Number(currentMonthData.subscriptionValueOverrides[sub.id] ?? sub.value), source: 'subscription', createdAt: sub.createdAt }); 
        }
      }
    });

    activeInstallments.forEach(inst => {
      if (inst.paidMonths.includes(monthKey)) {
        if (!inst.paymentMethod || inst.paymentMethod === 'Pix') {
          exits.push({ id: `inst-${inst.id}`, date: `${monthKey}-${String(inst.dueDay || 1).padStart(2, '0')}`, description: `Parcela: ${inst.name}`, value: inst.monthlyValue, source: 'installment', createdAt: inst.createdAt });
        }
      }
    });

    computedCardBills.filter(c => c.paid).forEach(c => exits.push({ id: `card-${c.id}`, date: c.paymentDate || `${monthKey}-${String(c.dueDay || 1).padStart(2, '0')}`, description: c.name || 'Cartão', value: Number(c.value), source: 'card', createdAt: c.createdAt }));
    (currentMonthData.extraordinaryExpenses || []).filter(e => e.paid).forEach(e => exits.push({ id: `ext-${e.id}`, date: `${monthKey}-01`, description: e.name || 'Despesa Extra', value: Number(e.value), source: 'extraordinary', createdAt: e.createdAt }));
    (currentMonthData.investments || []).filter(i => i.action === 'deposit').forEach(inv => exits.push({ id: `inv-${inv.id}`, date: inv.date, description: `Aporte ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-deposit', createdAt: inv.createdAt }));
    (currentMonthData.manualExits || []).forEach(me => exits.push({ id: `mx-${me.id}`, date: me.date, description: me.description, value: Number(me.value), source: 'manual-exit', createdAt: me.createdAt }));
    return exits.sort(sortEntriesByDateAndQueue);
  }, [currentMonthData, monthKey, activeRecurringExpenses, activeSubscriptions, activeInstallments, computedCardBills]);

  const totalIncome = computedEntries.reduce((a, c) => a + c.value, 0);
  const totalExpenses = computedExits.reduce((a, c) => a + c.value, 0);
  const balance = totalIncome - totalExpenses;
  const allInvestments = useMemo(() => Object.entries(data.monthlyData).flatMap(([, m]) => m.investments || []), [data.monthlyData]);

  return { currentDate, monthKey, data, setCurrentDate, goNextMonth: () => setCurrentDate(d => addMonths(d, 1)), goPrevMonth: () => setCurrentDate(d => subMonths(d, 1)), currentMonthData, setIncome, addExpense, updateExpense, removeExpense, addCard, updateCard, removeCard, addExtraordinaryExpense, updateExtraordinaryExpense, removeExtraordinaryExpense, activeRecurringExpenses, addRecurringExpense, softDeleteRecurringExpense, toggleRecurringPaid, updateRecurringValue, activeSubscriptions, addSubscription, softDeleteSubscription, toggleSubscriptionPaid, updateSubscriptionValue, addInvestment, removeInvestment, addManualEntry, removeManualEntry, addManualExit, removeManualExit, activeInstallments, getInstallmentNumber, addInstallment, toggleInstallmentPaid, removeInstallment, addGoal, toggleGoalPurchased, removeGoal, computedEntries, computedExits, totalExpenses, totalIncome, balance, allInvestments, removeLedgerEntry, editLedgerEntry, computedCardBills, editSubscription, editInstallment, editRecurringExpense, editCard };
}