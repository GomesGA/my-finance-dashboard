import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { LedgerData, MonthData, Expense, CardBill, Installment, ExtraIncome, Investment, Goal, LedgerEntry, RecurringExpense, ManualEntry, Card, Subscription, BankAccount, Category } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const toMonthDate = (monthKey: string) => `${monthKey}-01`;
const monthStartDate = (monthKey: string) => new Date(Number(monthKey.split('-')[0]), Number(monthKey.split('-')[1]) - 1, 1);

type InvestmentRow = Investment & { month: string };

function paymentMethodToDb(paymentMethod: string | undefined, allowFree: boolean) {
  if (!paymentMethod || paymentMethod === 'Pix') return { payment_method: 'pix', card_id: null as string | null };
  if (allowFree && paymentMethod === 'Free') return { payment_method: 'free', card_id: null as string | null };
  return { payment_method: 'card', card_id: paymentMethod };
}
function paymentMethodFromDb(payment_method: string, card_id: string | null): string | undefined {
  if (payment_method === 'free') return 'Free';
  if (payment_method === 'card') return card_id ?? undefined;
  return 'Pix';
}

const emptyMonthState: MonthData = { ...emptyMonthData };

const DEFAULT_CATEGORIES = [
  { name: 'Moradia', color: '#3b82f6' }, { name: 'Alimentação', color: '#22c55e' },
  { name: 'Transporte', color: '#f97316' }, { name: 'Saúde', color: '#ef4444' },
  { name: 'Educação', color: '#8b5cf6' }, { name: 'Lazer', color: '#ec4899' },
  { name: 'Assinaturas', color: '#06b6d4' }, { name: 'Compras', color: '#eab308' },
  { name: 'Outros', color: '#94a3b8' },
];

// 🔥 Função blindada que garante a gravação no banco sem depender de Constraints complexas
const safeUpsert = async (table: string, match: Record<string, any>, payload: Record<string, any>) => {
  try {
    // Usamos (supabase as any) para o TypeScript não travar com o nome dinâmico da tabela
    const { data, error: selectError } = await (supabase as any)
      .from(table)
      .select('id')
      .match(match)
      .maybeSingle();
      
    if (selectError && selectError.code !== 'PGRST116') {
      console.error(`Erro ao buscar em ${table}:`, selectError);
      return;
    }
    
    if (data && data.id) {
      const { error } = await (supabase as any)
        .from(table)
        .update(payload)
        .eq('id', data.id);
        
      if (error) console.error(`Erro ao atualizar ${table}:`, error);
    } else {
      const { error } = await (supabase as any)
        .from(table)
        .insert({ ...match, ...payload });
        
      if (error) console.error(`Erro ao inserir em ${table}:`, error);
    }
  } catch (err) {
    console.error("Erro inesperado no safeUpsert:", err);
  }
};

export function useLedgerData() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const monthKey = format(currentDate, 'yyyy-MM');
  const monthKeyRef = useRef(monthKey);
  monthKeyRef.current = monthKey;

  const [cardsState, setCardsState] = useState<Card[]>([]);
  const [goalsState, setGoalsState] = useState<Goal[]>([]);
  const [recurringState, setRecurringState] = useState<RecurringExpense[]>([]);
  const [subscriptionsState, setSubscriptionsState] = useState<Subscription[]>([]);
  const [installmentsState, setInstallmentsState] = useState<Installment[]>([]);
  const [investmentsState, setInvestmentsState] = useState<InvestmentRow[]>([]);
  const [bankAccountsState, setBankAccountsState] = useState<BankAccount[]>([]);
  const [categoriesState, setCategoriesState] = useState<Category[]>([]);
  const [monthData, setMonthDataState] = useState<MonthData>(emptyMonthState);

  useEffect(() => {
    const loadUser = async (uid: string) => {
      setUserId(uid);

      const [cardsRes, goalsRes, recurringRes, subsRes, purchasesRes, itemsRes, invRes, banksRes, categoriesRes] = await Promise.all([
        supabase.from('cards').select('*').order('created_at'),
        supabase.from('goals').select('*').order('created_at'),
        supabase.from('recurring_expenses').select('*').order('created_at'),
        supabase.from('subscriptions').select('*').order('created_at'),
        supabase.from('installment_purchases').select('*').order('created_at'),
        supabase.from('installment_items').select('installment_purchase_id, month, paid, paid_at, bank_account_id'),
        supabase.from('investments').select('*').order('occurred_on'),
        supabase.from('bank_accounts').select('*').order('created_at'),
        supabase.from('categories').select('*').order('created_at'),
      ]);

      setCardsState((cardsRes.data ?? []).map(c => ({ id: c.id, name: c.name, dueDay: c.due_day, startMonth: c.start_month.slice(0, 7), endMonth: c.end_month?.slice(0, 7), createdAt: new Date(c.created_at).getTime() })));
      setGoalsState((goalsRes.data ?? []).map(g => ({ id: g.id, name: g.name, targetValue: Number(g.target_value), purchased: g.purchased, actualPaidValue: g.actual_paid_value ? Number(g.actual_paid_value) : undefined, paymentDate: g.payment_date ?? undefined, createdAt: new Date(g.created_at).getTime() })));
      setRecurringState((recurringRes.data ?? []).map(re => ({ id: re.id, name: re.name, value: Number(re.value), dueDay: re.due_day, startMonth: re.start_month.slice(0, 7), endMonth: re.end_month?.slice(0, 7), createdAt: new Date(re.created_at).getTime(), categoryId: re.category_id ?? undefined })));
      setSubscriptionsState((subsRes.data ?? []).map(s => ({ id: s.id, name: s.name, value: Number(s.value), dueDay: s.due_day, startMonth: s.start_month.slice(0, 7), endMonth: s.end_month?.slice(0, 7), createdAt: new Date(s.created_at).getTime(), paymentMethod: paymentMethodFromDb(s.payment_method, s.card_id), categoryId: s.category_id ?? undefined })));

      const paidMonthsByPurchase = new Map<string, string[]>();
      const paidDatesByPurchase = new Map<string, Record<string, string>>();
      const paidBankByPurchase = new Map<string, Record<string, string>>();
      
      (itemsRes.data ?? []).forEach(item => {
        if (!item.paid) return;
        const monthKeyItem = item.month.slice(0, 7);
        const months = paidMonthsByPurchase.get(item.installment_purchase_id) ?? [];
        months.push(monthKeyItem);
        paidMonthsByPurchase.set(item.installment_purchase_id, months);
        if (item.paid_at) {
          const dates = paidDatesByPurchase.get(item.installment_purchase_id) ?? {};
          dates[monthKeyItem] = item.paid_at;
          paidDatesByPurchase.set(item.installment_purchase_id, dates);
        }
        if (item.bank_account_id) {
          const banks = paidBankByPurchase.get(item.installment_purchase_id) ?? {};
          banks[monthKeyItem] = item.bank_account_id;
          paidBankByPurchase.set(item.installment_purchase_id, banks);
        }
      });

      setInstallmentsState((purchasesRes.data ?? []).map(p => ({ id: p.id, name: p.name, monthlyValue: Number(p.monthly_value), totalMonths: p.total_months, startDate: p.start_month.slice(0, 7), paidMonths: paidMonthsByPurchase.get(p.id) ?? [], createdAt: new Date(p.created_at).getTime(), paymentMethod: paymentMethodFromDb(p.payment_method, p.card_id), dueDay: p.due_day, paidDates: paidDatesByPurchase.get(p.id) ?? {}, paidBankAccounts: paidBankByPurchase.get(p.id) ?? {}, categoryId: p.category_id ?? undefined })));
      setInvestmentsState((invRes.data ?? []).map(inv => ({ id: inv.id, type: inv.type as 'CDB' | 'Bitcoin', description: inv.description ?? '', value: Number(inv.value), date: inv.occurred_on, action: inv.action as 'deposit' | 'withdraw' | 'yield', createdAt: new Date(inv.created_at).getTime(), month: inv.month.slice(0, 7) })));
      setBankAccountsState((banksRes.data ?? []).map(b => ({ id: b.id, name: b.name, kind: b.kind as 'PF' | 'PJ', createdAt: new Date(b.created_at).getTime() })));

      let categoriesData = categoriesRes.data ?? [];
      if (categoriesData.length === 0) {
        const seed = DEFAULT_CATEGORIES.map(c => ({ id: crypto.randomUUID(), user_id: uid, name: c.name, color: c.color }));
        const { data: inserted } = await supabase.from('categories').insert(seed).select('*');
        categoriesData = inserted ?? [];
      }
      setCategoriesState(categoriesData.map(c => ({ id: c.id, name: c.name, color: c.color ?? undefined, createdAt: new Date(c.created_at).getTime() })));
    };

    const clearAll = () => {
      setUserId(null);
      setCardsState([]); setGoalsState([]); setRecurringState([]);
      setSubscriptionsState([]); setInstallmentsState([]); setInvestmentsState([]);
      setBankAccountsState([]); setCategoriesState([]); setMonthDataState(emptyMonthState);
    };

    supabase.auth.getSession().then(({ data: { session } }) => { if (session) loadUser(session.user.id); else clearAll(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (session && event === 'SIGNED_IN') loadUser(session.user.id); else if (!session) clearAll(); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const monthDate = toMonthDate(monthKey);
    const requestedMonthKey = monthKey;

    (async () => {
      const [incomeRes, cardBillsRes, extraIncomesRes, expensesRes, extraordinaryRes, manualRes, recurringMonthsRes, subMonthsRes] = await Promise.all([
        supabase.from('income_entries').select('*').eq('month', monthDate).maybeSingle(),
        supabase.from('card_bills').select('*').eq('month', monthDate),
        supabase.from('extra_incomes').select('*').eq('month', monthDate),
        supabase.from('expenses').select('*').eq('month', monthDate),
        supabase.from('extraordinary_expenses').select('*').eq('month', monthDate),
        supabase.from('manual_transactions').select('*').eq('month', monthDate),
        supabase.from('recurring_expense_months').select('*').eq('month', monthDate),
        supabase.from('subscription_months').select('*').eq('month', monthDate),
      ]);

      if (monthKeyRef.current !== requestedMonthKey) return;

      const recurringPaidState: Record<string, boolean> = {}; const recurringValueOverrides: Record<string, number> = {}; const recurringDateOverrides: Record<string, string> = {}; const recurringBankAccounts: Record<string, string> = {}; const recurringActiveState: Record<string, boolean> = {}; const recurringPaidAt: Record<string, string> = {};
      (recurringMonthsRes.data ?? []).forEach(row => { recurringPaidState[row.recurring_expense_id] = row.paid; if (row.value_override != null) recurringValueOverrides[row.recurring_expense_id] = Number(row.value_override); if (row.date_override) recurringDateOverrides[row.recurring_expense_id] = row.date_override; if (row.bank_account_id) recurringBankAccounts[row.recurring_expense_id] = row.bank_account_id; if (row.paid_at) recurringPaidAt[row.recurring_expense_id] = row.paid_at; recurringActiveState[row.recurring_expense_id] = row.is_active; });

      const subscriptionPaidState: Record<string, boolean> = {}; const subscriptionValueOverrides: Record<string, number> = {}; const subscriptionDateOverrides: Record<string, string> = {}; const subscriptionBankAccounts: Record<string, string> = {}; const subscriptionPaidAt: Record<string, string> = {};
      (subMonthsRes.data ?? []).forEach(row => { subscriptionPaidState[row.subscription_id] = row.paid; if (row.value_override != null) subscriptionValueOverrides[row.subscription_id] = Number(row.value_override); if (row.date_override) subscriptionDateOverrides[row.subscription_id] = row.date_override; if (row.bank_account_id) subscriptionBankAccounts[row.subscription_id] = row.bank_account_id; if (row.paid_at) subscriptionPaidAt[row.subscription_id] = row.paid_at; });

      setMonthDataState({
        income: Number(incomeRes.data?.value ?? 0), incomeDate: incomeRes.data?.income_date ?? undefined, incomeTime: incomeRes.data?.received_at ? incomeRes.data.received_at.slice(11, 16) : undefined, incomeBankAccountId: incomeRes.data?.bank_account_id ?? undefined,
        variableExpenses: (expensesRes.data ?? []).map(e => ({ id: e.id, name: e.name, value: Number(e.value), paid: e.paid, dueDay: e.due_day ?? undefined })),
        cardBills: (cardBillsRes.data ?? []).map(cb => ({ id: cb.card_id, name: '', value: Number(cb.value), paid: cb.paid, paymentDate: cb.payment_date ?? undefined, bankAccountId: cb.bank_account_id ?? undefined, categoryId: cb.category_id ?? undefined, details: cb.detalhes ?? undefined })),
        extraIncomes: (extraIncomesRes.data ?? []).map(ei => ({ id: ei.id, description: ei.description ?? '', value: Number(ei.value) })),
        extraordinaryExpenses: (extraordinaryRes.data ?? []).map(e => ({ id: e.id, name: e.name, value: Number(e.value), paid: e.paid })),
        investments: [],
        manualEntries: (manualRes.data ?? []).filter(m => m.direction === 'entry').map(m => ({ id: m.id, date: m.date, description: m.description, value: Number(m.value), paymentMethod: m.payment_method, bankAccountId: m.bank_account_id ?? undefined, occurredAt: m.occurred_at ?? undefined, categoryId: m.category_id ?? undefined, observation: m.observacao ?? undefined, paidByOthers: m.pago_por_terceiros ?? false })),
        manualExits: (manualRes.data ?? []).filter(m => m.direction === 'exit').map(m => ({ id: m.id, date: m.date, description: m.description, value: Number(m.value), paymentMethod: m.payment_method, bankAccountId: m.bank_account_id ?? undefined, occurredAt: m.occurred_at ?? undefined, categoryId: m.category_id ?? undefined, observation: m.observacao ?? undefined, paidByOthers: m.pago_por_terceiros ?? false })),
        recurringPaidState, recurringValueOverrides, recurringDateOverrides, recurringBankAccounts, recurringActiveState, recurringPaidAt, subscriptionPaidState, subscriptionValueOverrides, subscriptionDateOverrides, subscriptionBankAccounts, subscriptionPaidAt,
      });
    })();
  }, [userId, monthKey]);

  const currentMonthData: MonthData = useMemo(() => ({ ...monthData, investments: investmentsState.filter(i => i.month === monthKey).map(({ month, ...inv }) => inv) }), [monthData, investmentsState, monthKey]);
  const data: LedgerData = useMemo(() => ({ monthlyData: { [monthKey]: currentMonthData }, installments: installmentsState, goals: goalsState, recurringExpenses: recurringState, cards: cardsState, subscriptions: subscriptionsState }), [monthKey, currentMonthData, installmentsState, goalsState, recurringState, cardsState, subscriptionsState]);

  // ===== Salário / Bancos / Categorias =====
  const setIncome = useCallback((val: number, date?: string, time?: string, bankAccountId?: string) => {
    setMonthDataState(m => ({ ...m, income: val, incomeDate: date ?? m.incomeDate, incomeTime: time ?? m.incomeTime, incomeBankAccountId: bankAccountId ?? m.incomeBankAccountId }));
    if (!userId) return;
    const effectiveTime = time ?? monthData.incomeTime;
    const effectiveDate = date ?? monthData.incomeDate ?? toMonthDate(monthKey);
    safeUpsert('income_entries', 
      { user_id: userId, month: toMonthDate(monthKey) },
      { value: val, income_date: date ?? monthData.incomeDate ?? null, bank_account_id: bankAccountId ?? monthData.incomeBankAccountId ?? null, received_at: effectiveTime ? `${effectiveDate}T${effectiveTime}:00` : null }
    );
  }, [userId, monthKey, monthData]);

  const addBankAccount = useCallback((name: string, kind: 'PF' | 'PJ') => {
    const tempId = crypto.randomUUID(); const account: BankAccount = { id: tempId, name, kind, createdAt: Date.now() };
    setBankAccountsState(prev => [...prev, account]);
    if (userId) {
      supabase.from('bank_accounts').insert({ id: tempId, user_id: userId, name, kind })
        .then(({ error }) => { if (error) { console.error("Erro na Conta:", error); alert(`O banco recusou a gravação! Erro: ${error.message}`); } });
    }
    return account;
  }, [userId]);

  const addCategory = useCallback((name: string, color?: string) => {
    const tempId = crypto.randomUUID(); 
    const category: Category = { id: tempId, name, color, createdAt: Date.now() };
    
    setCategoriesState(prev => [...prev, category]);
    
    if (userId) {
      (supabase as any).from('categories').insert({ id: tempId, user_id: userId, name, color: color ?? null })
        .then(({ error }: any) => { 
          if (error) {
            console.error("Erro ao criar categoria:", error);
            alert(`Erro ao salvar categoria: ${error.message}`);
          }
        });
    }
    
    return category;
  }, [userId]);

  // ===== Cartões (Usando safeUpsert) =====
  const addCard = useCallback(() => {
    if (!userId) return;
    const tempId = crypto.randomUUID(); const item: Card = { id: tempId, name: '', dueDay: 1, startMonth: monthKey, createdAt: Date.now() };
    setCardsState(prev => [...prev, item]);
    supabase.from('cards').insert({ id: tempId, user_id: userId, name: '', due_day: 1, start_month: toMonthDate(monthKey) });
  }, [userId, monthKey]);

  const updateCard = useCallback((id: string, patch: Partial<CardBill>) => {
    if (patch.name !== undefined || patch.dueDay !== undefined) {
      setCardsState(prev => prev.map(c => c.id === id ? { ...c, name: patch.name ?? c.name, dueDay: patch.dueDay ?? c.dueDay } : c));
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name; 
      if (patch.dueDay !== undefined) dbPatch.due_day = patch.dueDay;
      supabase.from('cards').update(dbPatch).eq('id', id);
    }
    
    if (patch.value !== undefined || patch.paid !== undefined || patch.paymentDate !== undefined || patch.bankAccountId !== undefined || patch.categoryId !== undefined || patch.details !== undefined) {
      setMonthDataState(m => {
        const current = m.cardBills.find(c => c.id === id);
        const nextBills = current ? m.cardBills.map(c => c.id === id ? { ...c, ...patch } : c) : [...m.cardBills, { id, name: '', value: patch.value || 0, paid: patch.paid || false, paymentDate: patch.paymentDate, bankAccountId: patch.bankAccountId, paidAt: patch.paidAt, categoryId: patch.categoryId, details: patch.details }];
        
        if (userId) {
          safeUpsert('card_bills', 
            { user_id: userId, card_id: id, month: toMonthDate(monthKey) },
            { value: patch.value ?? current?.value ?? 0, paid: patch.paid ?? current?.paid ?? false, payment_date: patch.paymentDate ?? current?.paymentDate ?? null, bank_account_id: patch.bankAccountId ?? current?.bankAccountId ?? null, category_id: patch.categoryId ?? current?.categoryId ?? null, paid_at: patch.paidAt ?? (patch.paid ? new Date().toISOString() : null), detalhes: patch.details ?? current?.details ?? null }
          );
        }
        return { ...m, cardBills: nextBills };
      });
    }
  }, [userId, monthKey]);

  const removeCard = useCallback((id: string) => {
    setCardsState(prev => prev.map(c => c.id === id ? { ...c, endMonth: monthKey } : c));
    supabase.from('cards').update({ end_month: toMonthDate(monthKey) }).eq('id', id);
  }, [monthKey]);

  const computedCardBills = useMemo(() => cardsState.filter(c => c.startMonth <= monthKey && (!c.endMonth || c.endMonth > monthKey)).map(c => { const mData = currentMonthData.cardBills.find(cb => cb.id === c.id); return { id: c.id, name: c.name, dueDay: c.dueDay, value: mData?.value || 0, paid: mData?.paid || false, paymentDate: mData?.paymentDate, bankAccountId: mData?.bankAccountId, paidAt: mData?.paidAt, categoryId: mData?.categoryId, details: mData?.details, createdAt: c.createdAt }; }).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [cardsState, currentMonthData.cardBills, monthKey]);

  // ===== Assinaturas (Usando safeUpsert) =====
  const activeSubscriptions = useMemo(() => subscriptionsState.filter(s => s.startMonth <= monthKey && (!s.endMonth || s.endMonth > monthKey)), [subscriptionsState, monthKey]);
  
  const addSubscription = useCallback((name: string, value: number, dueDay: number, paymentMethod: string, categoryId?: string) => {
    if (!userId) return;
    const tempId = crypto.randomUUID();
    const sub: Subscription = { id: tempId, name, value, dueDay, startMonth: monthKey, createdAt: Date.now(), paymentMethod, categoryId };
    setSubscriptionsState(prev => [...prev, sub]);
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, true);
    supabase.from('subscriptions').insert({ id: tempId, user_id: userId, name, value, due_day: dueDay, payment_method, card_id, category_id: categoryId ?? null, start_month: toMonthDate(monthKey) });
  }, [userId, monthKey]);

  const softDeleteSubscription = useCallback((id: string) => {
    setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, endMonth: monthKey } : s));
    supabase.from('subscriptions').update({ end_month: toMonthDate(monthKey) }).eq('id', id);
  }, [monthKey]);

  const paySubscription = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    const dateOnly = paidAtIso.slice(0, 10);
    setMonthDataState(m => {
      if (userId) {
        safeUpsert('subscription_months', 
          { user_id: userId, subscription_id: id, month: toMonthDate(monthKey) },
          { paid: true, value_override: m.subscriptionValueOverrides[id] ?? null, date_override: dateOnly, bank_account_id: bankAccountId, paid_at: paidAtIso }
        );
      }
      return { ...m, subscriptionPaidState: { ...m.subscriptionPaidState, [id]: true }, subscriptionDateOverrides: { ...(m.subscriptionDateOverrides || {}), [id]: dateOnly }, subscriptionBankAccounts: { ...(m.subscriptionBankAccounts || {}), [id]: bankAccountId }, subscriptionPaidAt: { ...(m.subscriptionPaidAt || {}), [id]: paidAtIso } };
    });
  }, [userId, monthKey]);

  const unpaySubscription = useCallback((id: string) => {
    setMonthDataState(m => {
      if (userId) {
        safeUpsert('subscription_months', 
          { user_id: userId, subscription_id: id, month: toMonthDate(monthKey) },
          { paid: false, value_override: m.subscriptionValueOverrides[id] ?? null, date_override: m.subscriptionDateOverrides?.[id] ?? null, bank_account_id: m.subscriptionBankAccounts?.[id] ?? null, paid_at: null }
        );
      }
      return { ...m, subscriptionPaidState: { ...m.subscriptionPaidState, [id]: false } };
    });
  }, [userId, monthKey]);

  const updateSubscriptionValue = useCallback((id: string, value: number) => {
    setMonthDataState(m => {
      if (userId) safeUpsert('subscription_months', { user_id: userId, subscription_id: id, month: toMonthDate(monthKey) }, { value_override: value, paid: m.subscriptionPaidState[id] ?? false });
      return { ...m, subscriptionValueOverrides: { ...m.subscriptionValueOverrides, [id]: value } };
    });
  }, [userId, monthKey]);

  const updateSubscriptionDate = useCallback((id: string, date: string) => {
    setMonthDataState(m => {
      if (userId) safeUpsert('subscription_months', { user_id: userId, subscription_id: id, month: toMonthDate(monthKey) }, { date_override: date, paid: m.subscriptionPaidState[id] ?? false });
      return { ...m, subscriptionDateOverrides: { ...(m.subscriptionDateOverrides || {}), [id]: date } };
    });
  }, [userId, monthKey]);

  // ===== Recorrentes (Usando safeUpsert) =====
  const activeRecurringExpenses = useMemo(() => recurringState.filter(re => re.startMonth <= monthKey && (!re.endMonth || re.endMonth > monthKey)), [recurringState, monthKey]);
  
  const addRecurringExpense = useCallback((name: string, value: number, dueDay: number, categoryId?: string) => {
    if (!userId) return;
    const tempId = crypto.randomUUID();
    const re: RecurringExpense = { id: tempId, name, value, dueDay, startMonth: monthKey, createdAt: Date.now(), categoryId };
    setRecurringState(prev => [...prev, re]);
    setMonthDataState(m => ({ ...m, recurringValueOverrides: { ...m.recurringValueOverrides, [tempId]: value } }));
    (async () => {
      await supabase.from('recurring_expenses').insert({ id: tempId, user_id: userId, name, value, due_day: dueDay, category_id: categoryId ?? null, start_month: toMonthDate(monthKey) });
      await supabase.from('recurring_expense_months').insert({ user_id: userId, recurring_expense_id: tempId, month: toMonthDate(monthKey), value_override: value, is_active: true });
    })();
  }, [userId, monthKey]);

  const softDeleteRecurringExpense = useCallback((id: string) => {
    setRecurringState(prev => prev.map(re => re.id === id ? { ...re, endMonth: monthKey } : re));
    supabase.from('recurring_expenses').update({ end_month: toMonthDate(monthKey) }).eq('id', id);
  }, [monthKey]);

  const toggleRecurringActive = useCallback((id: string) => {
    setMonthDataState(m => {
      const newActive = !(m.recurringActiveState?.[id] ?? true);
      if (userId) safeUpsert('recurring_expense_months', { user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) }, { is_active: newActive, paid: m.recurringPaidState[id] ?? false });
      return { ...m, recurringActiveState: { ...(m.recurringActiveState || {}), [id]: newActive } };
    });
  }, [userId, monthKey]);

  const payRecurringExpense = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    const dateOnly = paidAtIso.slice(0, 10);
    setMonthDataState(m => {
      if (userId) {
        safeUpsert('recurring_expense_months', 
          { user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) },
          { paid: true, value_override: m.recurringValueOverrides[id] ?? null, date_override: dateOnly, bank_account_id: bankAccountId, paid_at: paidAtIso, is_active: m.recurringActiveState?.[id] ?? true }
        );
      }
      return { ...m, recurringPaidState: { ...m.recurringPaidState, [id]: true }, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: dateOnly }, recurringBankAccounts: { ...(m.recurringBankAccounts || {}), [id]: bankAccountId }, recurringPaidAt: { ...(m.recurringPaidAt || {}), [id]: paidAtIso } };
    });
  }, [userId, monthKey]);

  const unpayRecurringExpense = useCallback((id: string) => {
    setMonthDataState(m => {
      if (userId) {
        safeUpsert('recurring_expense_months', 
          { user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) },
          { paid: false, value_override: m.recurringValueOverrides[id] ?? null, date_override: m.recurringDateOverrides?.[id] ?? null, bank_account_id: m.recurringBankAccounts?.[id] ?? null, paid_at: null, is_active: m.recurringActiveState?.[id] ?? true }
        );
      }
      return { ...m, recurringPaidState: { ...m.recurringPaidState, [id]: false } };
    });
  }, [userId, monthKey]);

  const updateRecurringValue = useCallback((id: string, value: number) => {
    setMonthDataState(m => {
      if (userId) safeUpsert('recurring_expense_months', { user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) }, { value_override: value, paid: m.recurringPaidState[id] ?? false });
      return { ...m, recurringValueOverrides: { ...m.recurringValueOverrides, [id]: value } };
    });
  }, [userId, monthKey]);

  const updateRecurringDate = useCallback((id: string, date: string) => {
    setMonthDataState(m => {
      if (userId) safeUpsert('recurring_expense_months', { user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) }, { date_override: date, paid: m.recurringPaidState[id] ?? false });
      return { ...m, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: date } };
    });
  }, [userId, monthKey]);

  // ===== Despesas variáveis e Renda Extra (Antigas) =====
  const addExpense = useCallback(() => {
    if (!userId) return;
    const tempId = crypto.randomUUID();
    const item: Expense = { id: tempId, name: '', value: 0, paid: false, createdAt: Date.now() };
    setMonthDataState(m => ({ ...m, variableExpenses: [...m.variableExpenses, item] }));
    supabase.from('expenses').insert({ id: tempId, user_id: userId, month: toMonthDate(monthKey), name: '', value: 0, paid: false });
  }, [userId, monthKey]);
  
  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setMonthDataState(m => ({ ...m, variableExpenses: m.variableExpenses.map(e => e.id === id ? { ...e, ...patch } : e) }));
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name; if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.paid !== undefined) dbPatch.paid = patch.paid; if (patch.dueDay !== undefined) dbPatch.due_day = patch.dueDay;
    if (Object.keys(dbPatch).length) supabase.from('expenses').update(dbPatch).eq('id', id);
  }, []);
  
  const removeExpense = useCallback((id: string) => {
    setMonthDataState(m => ({ ...m, variableExpenses: m.variableExpenses.filter(e => e.id !== id) }));
    (supabase as any).from('expenses').delete().eq('id', id).then(({error}: any) => { 
      if (error) console.error("Erro ao apagar despesa:", error); 
    });
  }, []);
  
  const removeExtraIncome = useCallback((id: string) => {
    setMonthDataState(m => ({ ...m, extraIncomes: (m.extraIncomes || []).filter(e => e.id !== id) }));
    (supabase as any).from('extra_incomes').delete().eq('id', id).then(({error}: any) => { 
      if (error) console.error("Erro ao apagar renda extra:", error); 
    });
  }, []);

  // ===== Entradas/saídas manuais =====
  const manualPaymentMethodToDb = (label?: string) => { switch (label) { case 'Boleto': return 'boleto'; case 'TED': return 'ted'; case 'Outros': return 'outros'; case 'Cartão': return 'card'; default: return 'pix'; } };

  const addManualEntry = useCallback((date: string, description: string, value: number, paymentMethod?: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers: boolean = false) => {
    if (!userId) return;
    const tempId = crypto.randomUUID(); const occurredAt = time ? `${date}T${time}:00` : undefined; const dbMethod = manualPaymentMethodToDb(paymentMethod);
    const item: ManualEntry = { id: tempId, date, description, value, createdAt: Date.now(), paymentMethod: dbMethod, bankAccountId, occurredAt, categoryId, observation, paidByOthers };
    setMonthDataState(m => ({ ...m, manualEntries: [...(m.manualEntries || []), item] }));
    supabase.from('manual_transactions').insert({ id: tempId, user_id: userId, month: toMonthDate(monthKey), direction: 'entry', date, description, value, payment_method: dbMethod, bank_account_id: bankAccountId ?? null, occurred_at: occurredAt ?? null, category_id: categoryId ?? null, observacao: observation ?? null, pago_por_terceiros: paidByOthers });
  }, [userId, monthKey]);

  const addManualExit = useCallback((date: string, description: string, value: number, paymentMethod?: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers: boolean = false) => {
    if (!userId) return;
    const tempId = crypto.randomUUID(); const occurredAt = time ? `${date}T${time}:00` : undefined; const dbMethod = manualPaymentMethodToDb(paymentMethod);
    const item: ManualEntry = { id: tempId, date, description, value, createdAt: Date.now(), paymentMethod: dbMethod, bankAccountId, occurredAt, categoryId, observation, paidByOthers };
    setMonthDataState(m => ({ ...m, manualExits: [...(m.manualExits || []), item] }));
    supabase.from('manual_transactions').insert({ id: tempId, user_id: userId, month: toMonthDate(monthKey), direction: 'exit', date, description, value, payment_method: dbMethod, bank_account_id: bankAccountId ?? null, occurred_at: occurredAt ?? null, category_id: categoryId ?? null, observacao: observation ?? null, pago_por_terceiros: paidByOthers });
  }, [userId, monthKey]);

  const removeManualEntry = useCallback((id: string) => { 
    setMonthDataState(m => ({ ...m, manualEntries: (m.manualEntries || []).filter(e => e.id !== id) })); 
    (supabase as any).from('manual_transactions').delete().eq('id', id).then(({error}: any) => { 
      if (error) console.error("Erro ao apagar entrada:", error); 
    }); 
  }, []);

  const removeManualExit = useCallback((id: string) => { 
    setMonthDataState(m => ({ ...m, manualExits: (m.manualExits || []).filter(e => e.id !== id) })); 
    (supabase as any).from('manual_transactions').delete().eq('id', id).then(({error}: any) => { 
      if (error) console.error("Erro ao apagar saída:", error); 
    }); 
  }, []);


  // ===== Parcelas =====
  const activeInstallments = useMemo(() => installmentsState.filter(inst => { const diff = differenceInMonths(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), monthStartDate(inst.startDate)); return diff >= 0 && diff < inst.totalMonths; }), [installmentsState, currentDate]);
  const getInstallmentNumber = useCallback((inst: Installment) => differenceInMonths(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), monthStartDate(inst.startDate)) + 1, [currentDate]);
  
  const addInstallment = useCallback((name: string, monthlyValue: number, totalMonths: number, paymentMethod: string, categoryId?: string) => {
    if (!userId) return;
    const purchaseId = crypto.randomUUID();
    const inst: Installment = { id: purchaseId, name, monthlyValue, totalMonths, startDate: monthKey, paidMonths: [], createdAt: Date.now(), paymentMethod, paidDates: {}, paidBankAccounts: {}, categoryId };
    setInstallmentsState(prev => [...prev, inst]);

    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, false);
    const startDate = monthStartDate(monthKey);
    (async () => {
      await supabase.from('installment_purchases').insert({ id: purchaseId, user_id: userId, name, monthly_value: monthlyValue, total_months: totalMonths, start_month: toMonthDate(monthKey), payment_method, card_id, category_id: categoryId ?? null });
      const items = Array.from({ length: totalMonths }, (_, i) => ({ user_id: userId, installment_purchase_id: purchaseId, month: format(addMonths(startDate, i), 'yyyy-MM-dd'), sequence_number: i + 1, amount: monthlyValue, paid: false }));
      await supabase.from('installment_items').insert(items);
    })();
  }, [userId, monthKey]);

  const payInstallment = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    setInstallmentsState(prev => prev.map(inst => inst.id === id ? { ...inst, paidMonths: inst.paidMonths.includes(monthKey) ? inst.paidMonths : [...inst.paidMonths, monthKey], paidDates: { ...inst.paidDates, [monthKey]: paidAtIso }, paidBankAccounts: { ...inst.paidBankAccounts, [monthKey]: bankAccountId } } : inst));
    supabase.from('installment_items').update({ paid: true, paid_at: paidAtIso, bank_account_id: bankAccountId }).match({ installment_purchase_id: id, month: toMonthDate(monthKey) }).then(({error}) => { if (error) console.error(error) });
  }, [monthKey]);

  const unpayInstallment = useCallback((id: string) => {
    setInstallmentsState(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      const paidDates = { ...inst.paidDates }; delete paidDates[monthKey];
      const paidBankAccounts = { ...inst.paidBankAccounts }; delete paidBankAccounts[monthKey];
      return { ...inst, paidMonths: inst.paidMonths.filter(m => m !== monthKey), paidDates, paidBankAccounts };
    }));
    supabase.from('installment_items').update({ paid: false, paid_at: null, bank_account_id: null }).match({ installment_purchase_id: id, month: toMonthDate(monthKey) }).then(({error}) => { if (error) console.error(error) });
  }, [monthKey]);

  const removeInstallment = useCallback((id: string) => {
    setInstallmentsState(prev => prev.filter(i => i.id !== id));
    supabase.from('installment_purchases').delete().eq('id', id);
  }, []);

  const editInstallment = useCallback((id: string, name: string, monthlyValue: number, totalMonths: number, paymentMethod: string, categoryId?: string) => {
    const inst = installmentsState.find(i => i.id === id);
    if (!inst || !userId) return;
    const startDate = monthStartDate(inst.startDate);
    const oldTotal = inst.totalMonths;
    const newPaidMonths = inst.paidMonths.filter(m => differenceInMonths(monthStartDate(m), startDate) < totalMonths);
    setInstallmentsState(prev => prev.map(i => i.id === id ? { ...i, name, monthlyValue, totalMonths, paymentMethod, categoryId, paidMonths: newPaidMonths } : i));
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, false);
    (async () => {
      await supabase.from('installment_purchases').update({ name, monthly_value: monthlyValue, total_months: totalMonths, payment_method, card_id, category_id: categoryId ?? null }).eq('id', id);
      await supabase.from('installment_items').update({ amount: monthlyValue }).eq('installment_purchase_id', id);
      if (totalMonths > oldTotal) {
        const newItems = Array.from({ length: totalMonths - oldTotal }, (_, k) => { const seq = oldTotal + k + 1; return { user_id: userId, installment_purchase_id: id, month: format(addMonths(startDate, seq - 1), 'yyyy-MM-dd'), sequence_number: seq, amount: monthlyValue, paid: false }; });
        await supabase.from('installment_items').insert(newItems);
      } else if (totalMonths < oldTotal) {
        await supabase.from('installment_items').delete().eq('installment_purchase_id', id).gt('sequence_number', totalMonths);
      }
    })();
  }, [installmentsState, userId]);

  // ===== Investimentos e Metas =====
  const addInvestment = useCallback((type: 'CDB' | 'Bitcoin', description: string, value: number, action: 'deposit' | 'withdraw' | 'yield', date?: string) => {
    if (!userId) return;
    const tempId = crypto.randomUUID(); const occurredOn = date || toMonthDate(monthKey);
    const item: InvestmentRow = { id: tempId, type, description, value, date: occurredOn, action, createdAt: Date.now(), month: monthKey };
    setInvestmentsState(prev => [...prev, item]);
    
    // Inserção blindada com verificação de erro
    (supabase as any).from('investments').insert({ id: tempId, user_id: userId, month: toMonthDate(monthKey), type, description, value, occurred_on: occurredOn, action })
      .then(({error}: any) => { if (error) console.error("Erro ao inserir investimento/resgate:", error); });
  }, [userId, monthKey]);

  const removeInvestment = useCallback((id: string) => { 
    setInvestmentsState(prev => prev.filter(i => i.id !== id)); 
    
    // Exclusão blindada com verificação de erro
    (supabase as any).from('investments').delete().eq('id', id)
      .then(({error}: any) => { if (error) console.error("Erro ao apagar investimento/resgate:", error); }); 
  }, []);

  const addGoal = useCallback((name: string, targetValue: number) => {
    if (!userId) return;
    const tempId = crypto.randomUUID(); const goal: Goal = { id: tempId, name, targetValue, purchased: false, createdAt: Date.now() };
    setGoalsState(prev => [...prev, goal]);
    supabase.from('goals').insert({ id: tempId, user_id: userId, name, target_value: targetValue, purchased: false });
  }, [userId]);

  const markGoalPurchased = useCallback((id: string, actualValue: number, paymentDate: string) => {
    setGoalsState(prev => prev.map(g => g.id === id ? { ...g, purchased: true, actualPaidValue: actualValue, paymentDate } : g));
    supabase.from('goals').update({ purchased: true, actual_paid_value: actualValue, payment_date: paymentDate }).eq('id', id);
  }, []);

  const toggleGoalPurchased = useCallback((id: string) => {
    let newVal = false;
    setGoalsState(prev => prev.map(g => { if (g.id !== id) return g; newVal = !g.purchased; return { ...g, purchased: newVal }; }));
    supabase.from('goals').update({ purchased: newVal, actual_paid_value: null, payment_date: null }).eq('id', id);
  }, []);

  const removeGoal = useCallback((id: string) => { setGoalsState(prev => prev.filter(g => g.id !== id)); supabase.from('goals').delete().eq('id', id); }, []);

  const addExtraordinaryExpense = useCallback(() => {
    if (!userId) return;
    const tempId = crypto.randomUUID();
    const item: Expense = { id: tempId, name: '', value: 0, paid: false, createdAt: Date.now() };
    setMonthDataState(m => ({ ...m, extraordinaryExpenses: [...(m.extraordinaryExpenses || []), item] }));
    supabase.from('extraordinary_expenses').insert({ id: tempId, user_id: userId, month: toMonthDate(monthKey), name: '', value: 0, paid: false });
  }, [userId, monthKey]);
  
  const updateExtraordinaryExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setMonthDataState(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).map(e => e.id === id ? { ...e, ...patch } : e) }));
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name; if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.paid !== undefined) dbPatch.paid = patch.paid;
    if (Object.keys(dbPatch).length) supabase.from('extraordinary_expenses').update(dbPatch).eq('id', id);
  }, []);

const removeExtraordinaryExpense = useCallback((id: string) => {
    setMonthDataState(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).filter(e => e.id !== id) }));
    (supabase as any).from('extraordinary_expenses').delete().eq('id', id).then(({error}: any) => { 
      if (error) console.error("Erro ao apagar despesa extra:", error); 
    });
  }, []);

  // ===== Edição Rápida e Remoção Geral =====
  const editSubscription = useCallback((id: string, name: string, value: number, dueDay: number, paymentMethod: string, categoryId?: string) => {
    setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, name, value, dueDay, paymentMethod, categoryId } : s));
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, true);
    supabase.from('subscriptions').update({ name, value, due_day: dueDay, payment_method, card_id, category_id: categoryId ?? null }).eq('id', id);
  }, []);

  const editRecurringExpense = useCallback((id: string, name: string, dueDay: number, categoryId?: string) => {
    setRecurringState(prev => prev.map(re => re.id === id ? { ...re, name, dueDay, categoryId } : re));
    supabase.from('recurring_expenses').update({ name, due_day: dueDay, category_id: categoryId ?? null }).eq('id', id);
  }, []);

  const editCard = useCallback((id: string, name: string, value: number, dueDay: number, categoryId?: string, details?: string) => updateCard(id, { name, value, dueDay, categoryId, details }), [updateCard]);

  const removeLedgerEntry = useCallback((idStr: string, source: string) => {
    const id = idStr.replace(/^[a-z]+-/, '');
    if (source === 'manual-entry') removeManualEntry(id);
    else if (source === 'manual-exit') removeManualExit(id);
    else if (source === 'card') updateCard(id, { paid: false });
    else if (source === 'recurring') unpayRecurringExpense(id);
    else if (source === 'subscription') unpaySubscription(id);
    else if (source === 'installment') unpayInstallment(id);
    else if (source === 'salary') setIncome(0);
    else if (source === 'investment-deposit' || source === 'investment-withdraw' || source === 'investment-yield') removeInvestment(id);
    else if (source === 'extra-income') removeExtraIncome(id);
    else if (source === 'extraordinary') removeExtraordinaryExpense(id);
  }, [removeManualEntry, removeManualExit, updateCard, unpayRecurringExpense, unpaySubscription, unpayInstallment, setIncome, removeInvestment, removeExtraIncome, removeExtraordinaryExpense]);

  const editLedgerEntry = useCallback((idStr: string, source: string, date: string, description: string, value: number) => {
    const id = idStr.replace(/^[a-z]+-/, '');
    
    if (source === 'manual-entry') { 
      setMonthDataState(m => ({ ...m, manualEntries: (m.manualEntries || []).map(e => e.id === id ? { ...e, date, description, value } : e) })); 
      (supabase as any).from('manual_transactions').update({ date, description, value }).eq('id', id).then(({error}: any) => { if (error) console.error(error); }); 
    }
    else if (source === 'manual-exit') { 
      setMonthDataState(m => ({ ...m, manualExits: (m.manualExits || []).map(e => e.id === id ? { ...e, date, description, value } : e) })); 
      (supabase as any).from('manual_transactions').update({ date, description, value }).eq('id', id).then(({error}: any) => { if (error) console.error(error); }); 
    }
    else if (source === 'card') { 
      updateCard(id, { name: description, value, paymentDate: date }); 
    }
    else if (source === 'recurring') { 
      updateRecurringValue(id, value); updateRecurringDate(id, date); 
      setRecurringState(prev => prev.map(re => re.id === id ? { ...re, name: description } : re)); 
      (supabase as any).from('recurring_expenses').update({ name: description }).eq('id', id).then(({error}: any) => { if (error) console.error(error); }); 
    }
    else if (source === 'subscription') { 
      updateSubscriptionValue(id, value); updateSubscriptionDate(id, date); 
      setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, name: description } : s)); 
      (supabase as any).from('subscriptions').update({ name: description }).eq('id', id).then(({error}: any) => { if (error) console.error(error); }); 
    }
    else if (source === 'salary') { 
      setIncome(value, date); 
    }
    else if (source === 'investment-deposit' || source === 'investment-withdraw' || source === 'investment-yield') { 
      const cleanDesc = description.replace(/^(Aporte|Resgate|Rendimento) (CDB|Bitcoin)( - )?/, ''); 
      setInvestmentsState(prev => prev.map(inv => inv.id === id ? { ...inv, date, description: cleanDesc, value } : inv)); 
      (supabase as any).from('investments').update({ occurred_on: date, description: cleanDesc, value }).eq('id', id).then(({error}: any) => { if (error) console.error("Erro ao editar investimento:", error); }); 
    }
  }, [updateCard, updateRecurringValue, updateRecurringDate, updateSubscriptionValue, updateSubscriptionDate, setIncome]);

  // ===== Ordenação e Computed =====
  const sortEntriesDesc = (a: LedgerEntry, b: LedgerEntry) => {
    const timeA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
    const timeB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
    if (timeA !== timeB) return timeB - timeA; 
    return (b.createdAt || 0) - (a.createdAt || 0);
  };

  const splitDateTime = (iso?: string) => { if (!iso) return {}; if (iso.length <= 10) return { date: iso }; return { date: iso.slice(0, 10), time: iso.slice(11, 16) }; };

  const computedEntries: LedgerEntry[] = useMemo(() => {
    const entries: LedgerEntry[] = [];
    if (currentMonthData.income > 0) entries.push({ id: 'salary', date: currentMonthData.incomeDate || `${monthKey}-01`, time: currentMonthData.incomeTime, description: 'Salário', value: currentMonthData.income, source: 'salary', createdAt: 0, bankAccountId: currentMonthData.incomeBankAccountId });
    (currentMonthData.extraIncomes || []).forEach(ei => { if (ei.value > 0) entries.push({ id: `ei-${ei.id}`, date: `${monthKey}-01`, description: ei.description || 'Renda Extra', value: Number(ei.value), source: 'extra-income', createdAt: ei.createdAt }); });
    (currentMonthData.investments || []).filter(i => i.action === 'withdraw').forEach(inv => entries.push({ id: `inv-${inv.id}`, date: inv.date, description: `Resgate ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-withdraw', createdAt: inv.createdAt }));
    (currentMonthData.manualEntries || []).forEach(me => entries.push({ id: `me-${me.id}`, date: me.date, time: me.occurredAt ? me.occurredAt.slice(11, 16) : undefined, description: me.description, value: Number(me.value), source: 'manual-entry', createdAt: me.createdAt, categoryId: me.categoryId, bankAccountId: me.bankAccountId, observation: me.observation, paidByOthers: me.paidByOthers }));
    return entries.sort(sortEntriesDesc);
  }, [currentMonthData, monthKey]);

  const computedExits: LedgerEntry[] = useMemo(() => {
    const exits: LedgerEntry[] = [];
    
    activeRecurringExpenses.forEach(re => {
      if (currentMonthData.recurringActiveState?.[re.id] === false) return;
      if (currentMonthData.recurringPaidState[re.id]) {
        const date = currentMonthData.recurringDateOverrides?.[re.id] || `${monthKey}-${String(re.dueDay).padStart(2, '0')}`;
        const time = currentMonthData.recurringPaidAt?.[re.id] ? splitDateTime(currentMonthData.recurringPaidAt[re.id]).time : undefined;
        exits.push({ 
          id: `rec-${re.id}`, date, time, description: re.name, 
          // 🔥 AQUI ESTAVA O ERRO! Trocamos "?? 0" por "?? re.value"
          value: Number(currentMonthData.recurringValueOverrides[re.id] ?? re.value), 
          source: 'recurring', createdAt: re.createdAt, categoryId: re.categoryId, bankAccountId: currentMonthData.recurringBankAccounts?.[re.id] 
        });
      }
    });

    activeSubscriptions.forEach(sub => {
      if (currentMonthData.subscriptionPaidState[sub.id]) {
        if (!sub.paymentMethod || sub.paymentMethod === 'Pix') {
          const date = currentMonthData.subscriptionDateOverrides?.[sub.id] || `${monthKey}-${String(sub.dueDay).padStart(2, '0')}`;
          const time = currentMonthData.subscriptionPaidAt?.[sub.id] ? splitDateTime(currentMonthData.subscriptionPaidAt[sub.id]).time : undefined;
          exits.push({ 
            id: `sub-${sub.id}`, date, time, description: sub.name, 
            value: Number(currentMonthData.subscriptionValueOverrides[sub.id] ?? sub.value), 
            source: 'subscription', createdAt: sub.createdAt, categoryId: sub.categoryId, bankAccountId: currentMonthData.subscriptionBankAccounts?.[sub.id] 
          });
        }
      }
    });

    activeInstallments.forEach(inst => {
      if (inst.paidMonths.includes(monthKey)) {
        if (!inst.paymentMethod || inst.paymentMethod === 'Pix') {
          const { date, time } = splitDateTime(inst.paidDates?.[monthKey]);
          exits.push({ id: `inst-${inst.id}`, date: date || `${monthKey}-01`, time, description: `Parcela: ${inst.name}`, value: inst.monthlyValue, source: 'installment', createdAt: inst.createdAt, categoryId: inst.categoryId, bankAccountId: inst.paidBankAccounts?.[monthKey] });
        }
      }
    });

    computedCardBills.filter(c => c.paid).forEach(c => exits.push({ id: `card-${c.id}`, date: c.paymentDate || `${monthKey}-${String(c.dueDay || 1).padStart(2, '0')}`, time: c.paidAt ? splitDateTime(c.paidAt).time : undefined, description: c.name || 'Cartão', value: Number(c.value), source: 'card', createdAt: c.createdAt, categoryId: c.categoryId, bankAccountId: c.bankAccountId }));
    (currentMonthData.extraordinaryExpenses || []).filter(e => e.paid).forEach(e => exits.push({ id: `ext-${e.id}`, date: `${monthKey}-01`, description: e.name || 'Despesa Extra', value: Number(e.value), source: 'extraordinary', createdAt: e.createdAt }));
    (currentMonthData.investments || []).filter(i => i.action === 'deposit').forEach(inv => exits.push({ id: `inv-${inv.id}`, date: inv.date, description: `Aporte ${inv.type}${inv.description ? ` - ${inv.description}` : ''}`, value: Number(inv.value), source: 'investment-deposit', createdAt: inv.createdAt }));
    (currentMonthData.manualExits || []).forEach(me => exits.push({ id: `mx-${me.id}`, date: me.date, time: me.occurredAt ? me.occurredAt.slice(11, 16) : undefined, description: me.description, value: Number(me.value), source: 'manual-exit', createdAt: me.createdAt, categoryId: me.categoryId, bankAccountId: me.bankAccountId, observation: me.observation, paidByOthers: me.paidByOthers }));

    return exits.sort(sortEntriesDesc);
  }, [currentMonthData, monthKey, activeRecurringExpenses, activeSubscriptions, activeInstallments, computedCardBills]);

  const totalIncome = computedEntries.filter(e => !e.paidByOthers).reduce((a, c) => a + c.value, 0);
  const totalExpenses = computedExits.filter(e => !e.paidByOthers).reduce((a, c) => a + c.value, 0);
  const balance = totalIncome - totalExpenses;
  const allInvestments = useMemo(() => investmentsState.map(({ month, ...inv }) => inv), [investmentsState]);

  return { currentDate, monthKey, data, setCurrentDate, goNextMonth: () => setCurrentDate(d => addMonths(d, 1)), goPrevMonth: () => setCurrentDate(d => subMonths(d, 1)), currentMonthData, setIncome, addExpense, updateExpense, removeExpense, addCard, updateCard, removeCard, addExtraordinaryExpense, updateExtraordinaryExpense, removeExtraordinaryExpense, activeRecurringExpenses, addRecurringExpense, softDeleteRecurringExpense, payRecurringExpense, unpayRecurringExpense, updateRecurringValue, toggleRecurringActive, activeSubscriptions, addSubscription, softDeleteSubscription, paySubscription, unpaySubscription, updateSubscriptionValue, addInvestment, removeInvestment, addManualEntry, removeManualEntry, addManualExit, removeManualExit, activeInstallments, getInstallmentNumber, addInstallment, payInstallment, unpayInstallment, removeInstallment, addGoal, toggleGoalPurchased, markGoalPurchased, removeGoal, computedEntries, computedExits, totalExpenses, totalIncome, balance, allInvestments, removeLedgerEntry, editLedgerEntry, computedCardBills, editSubscription, editInstallment, editRecurringExpense, editCard, bankAccounts: bankAccountsState, addBankAccount, categories: categoriesState, addCategory };
}