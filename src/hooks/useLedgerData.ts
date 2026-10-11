import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, differenceInMonths } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { LedgerData, MonthData, Expense, CardBill, Installment, Investment, Goal, LedgerEntry, RecurringExpense, ManualEntry, Card, Subscription, BankAccount, Category } from '@/types/ledger';
import { emptyMonthData } from '@/types/ledger';

const toMonthDate = (monthKey: string) => `${monthKey}-01`;
const monthStartDate = (monthKey: string) => new Date(Number(monthKey.split('-')[0]), Number(monthKey.split('-')[1]) - 1, 1);
const nowLocalIso = () => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

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

// =====================================================================================
// Camada de persistência
// -------------------------------------------------------------------------------------
// IMPORTANTE: no supabase-js, `supabase.from(...).insert/update/delete(...)` é PREGUIÇOSO —
// a requisição só é enviada quando alguém chama `.then()` ou `await`. Várias chamadas do
// hook eram "soltas" (sem await/then) e por isso NUNCA chegavam ao banco: era o motivo de
// cartões criados sumirem e de despesas apagadas voltarem depois de recarregar a página.
//
// Agora toda escrita passa por `runWrite`/`queueUpsert`, que:
//   1. sempre executam a requisição e mostram um toast se o banco recusar;
//   2. rodam em fila (ordem garantida: o INSERT do pai sempre chega antes do filho/UPDATE);
//   3. aglutinam upserts repetidos da mesma linha (ex.: digitar um valor tecla a tecla).
// =====================================================================================
type DbError = { message: string; code?: string; details?: string; hint?: string };
type DbResult = { error: DbError | null };
// Nome de tabela dinâmico — o client tipado não aceita, então usamos uma referência sem tipos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const reportError = (label: string, error: unknown) => {
  console.error(label, error);
  const message = (error as DbError)?.message ?? String(error);
  toast.error(label, { description: message });
};

let writeChain: Promise<unknown> = Promise.resolve();
let pendingWrites = 0;

const enqueueWrite = (task: () => Promise<void>): Promise<void> => {
  pendingWrites++;
  const next = writeChain
    .then(task)
    .catch(err => reportError('Erro inesperado ao salvar', err))
    .finally(() => { pendingWrites--; });
  writeChain = next;
  return next;
};

/** Executa (em fila) uma escrita simples. Resolve `true` se o banco aceitou. */
const runWrite = (label: string, build: () => PromiseLike<DbResult>): Promise<boolean> =>
  new Promise(resolve => {
    enqueueWrite(async () => {
      const { error } = await build();
      if (error) { reportError(label, error); resolve(false); } else resolve(true);
    }).then(() => resolve(false)); // só tem efeito se a task lançou exceção antes de resolver
  });

/** Atualiza a linha que casa com `match`; se não existir, insere. Só envia os campos de `payload`. */
const upsertRow = async (label: string, table: string, match: Record<string, unknown>, payload: Record<string, unknown>, insertExtras: Record<string, unknown>) => {
  const { data, error } = await db.from(table).select('id').match(match).limit(1);
  if (error) { reportError(label, error); return; }

  if (data && data.length > 0) {
    const { error: updateError } = await db.from(table).update(payload).match(match);
    if (updateError) reportError(label, updateError);
    return;
  }

  const { error: insertError } = await db.from(table).insert({ ...match, ...insertExtras, ...payload });
  if (insertError?.code === '23505') {
    // Alguém inseriu a linha nesse meio tempo (ex.: outra aba) — cai para UPDATE.
    const { error: updateError } = await db.from(table).update(payload).match(match);
    if (updateError) reportError(label, updateError);
  } else if (insertError) {
    reportError(label, insertError);
  }
};

const pendingUpserts = new Map<string, Record<string, unknown>>();

const queueUpsert = (label: string, table: string, match: Record<string, unknown>, payload: Record<string, unknown>, insertExtras: Record<string, unknown> = {}) => {
  const key = `${table}:${JSON.stringify(match)}`;
  const pending = pendingUpserts.get(key);
  if (pending) { Object.assign(pending, payload); return; } // ainda não saiu da fila: aglutina
  const merged = { ...payload };
  pendingUpserts.set(key, merged);
  enqueueWrite(async () => {
    pendingUpserts.delete(key);
    await upsertRow(label, table, match, merged, insertExtras);
  });
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

  // Refs com o valor mais recente — permitem ler o estado atual sem colocar efeitos
  // colaterais (gravações no banco) dentro de funções `setState(prev => ...)`, que o React
  // pode executar mais de uma vez (StrictMode) e duplicar as gravações.
  const monthDataRef = useRef<MonthData>(emptyMonthState);
  const goalsRef = useRef(goalsState);
  goalsRef.current = goalsState;
  const installmentsRef = useRef(installmentsState);
  installmentsRef.current = installmentsState;
  const subscriptionsRef = useRef(subscriptionsState);
  subscriptionsRef.current = subscriptionsState;
  const loadedUserRef = useRef<string | null>(null);

  const replaceMonth = useCallback((next: MonthData) => { monthDataRef.current = next; setMonthDataState(next); }, []);
  const patchMonth = useCallback((fn: (m: MonthData) => MonthData) => { replaceMonth(fn(monthDataRef.current)); }, [replaceMonth]);

  // Avisa antes de fechar/recarregar a página se ainda houver gravações pendentes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (pendingWrites > 0) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const loadUser = async (uid: string) => {
      // onAuthStateChange dispara SIGNED_IN/TOKEN_REFRESHED várias vezes (ex.: ao voltar para a aba).
      // Sem essa trava os dados eram recarregados por cima das edições e as categorias padrão
      // podiam ser semeadas em duplicidade.
      if (loadedUserRef.current === uid) return;
      loadedUserRef.current = uid;
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
      if (loadedUserRef.current !== uid) return;

      const failed = [cardsRes, goalsRes, recurringRes, subsRes, purchasesRes, itemsRes, invRes, banksRes, categoriesRes].find(r => r.error);
      if (failed?.error) reportError('Erro ao carregar seus dados', failed.error);

      setCardsState((cardsRes.data ?? []).map(c => ({ id: c.id, name: c.name, dueDay: c.due_day, startMonth: c.start_month.slice(0, 7), endMonth: c.end_month?.slice(0, 7), createdAt: new Date(c.created_at).getTime() })));
      setGoalsState((goalsRes.data ?? []).map(g => ({ id: g.id, name: g.name, targetValue: Number(g.target_value), purchased: g.purchased, actualPaidValue: g.actual_paid_value != null ? Number(g.actual_paid_value) : undefined, paymentDate: g.payment_date ?? undefined, createdAt: new Date(g.created_at).getTime() })));
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
      if (!categoriesRes.error && categoriesData.length === 0) {
        const seed = DEFAULT_CATEGORIES.map(c => ({ id: crypto.randomUUID(), user_id: uid, name: c.name, color: c.color }));
        const { data: inserted, error } = await supabase.from('categories').insert(seed).select('*');
        if (error) reportError('Erro ao criar categorias padrão', error);
        categoriesData = inserted ?? [];
      }
      setCategoriesState(categoriesData.map(c => ({ id: c.id, name: c.name, color: c.color ?? undefined, createdAt: new Date(c.created_at).getTime() })));
    };

    const clearAll = () => {
      loadedUserRef.current = null;
      setUserId(null);
      setCardsState([]); setGoalsState([]); setRecurringState([]);
      setSubscriptionsState([]); setInstallmentsState([]); setInvestmentsState([]);
      setBankAccountsState([]); setCategoriesState([]); replaceMonth(emptyMonthState);
    };

    supabase.auth.getSession().then(({ data: { session } }) => { if (session) loadUser(session.user.id); else clearAll(); });
    // Não chamar o Supabase de forma síncrona dentro do callback (pode travar o client de auth) — adia com setTimeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (session) loadUser(session.user.id); else clearAll(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [replaceMonth]);

  useEffect(() => {
    if (!userId) return;
    const monthDate = toMonthDate(monthKey);
    const requestedMonthKey = monthKey;
    // Limpa o mês anterior para não exibir (nem editar) dados de outro mês enquanto carrega.
    replaceMonth(emptyMonthState);

    (async () => {
      const results = await Promise.all([
        supabase.from('income_entries').select('*').eq('month', monthDate).maybeSingle(),
        supabase.from('card_bills').select('*').eq('month', monthDate),
        supabase.from('extra_incomes').select('*').eq('month', monthDate),
        supabase.from('expenses').select('*').eq('month', monthDate),
        supabase.from('extraordinary_expenses').select('*').eq('month', monthDate),
        supabase.from('manual_transactions').select('*').eq('month', monthDate),
        supabase.from('recurring_expense_months').select('*').eq('month', monthDate),
        supabase.from('subscription_months').select('*').eq('month', monthDate),
      ] as const);
      const [incomeRes, cardBillsRes, extraIncomesRes, expensesRes, extraordinaryRes, manualRes, recurringMonthsRes, subMonthsRes] = results;

      if (monthKeyRef.current !== requestedMonthKey) return;
      const failed = results.find(r => r.error);
      if (failed?.error) reportError('Erro ao carregar dados do mês', failed.error);

      const recurringPaidState: Record<string, boolean> = {}; const recurringValueOverrides: Record<string, number> = {}; const recurringDateOverrides: Record<string, string> = {}; const recurringBankAccounts: Record<string, string> = {}; const recurringActiveState: Record<string, boolean> = {}; const recurringPaidAt: Record<string, string> = {};
      (recurringMonthsRes.data ?? []).forEach(row => { recurringPaidState[row.recurring_expense_id] = row.paid; if (row.value_override != null) recurringValueOverrides[row.recurring_expense_id] = Number(row.value_override); if (row.date_override) recurringDateOverrides[row.recurring_expense_id] = row.date_override; if (row.bank_account_id) recurringBankAccounts[row.recurring_expense_id] = row.bank_account_id; if (row.paid_at) recurringPaidAt[row.recurring_expense_id] = row.paid_at; recurringActiveState[row.recurring_expense_id] = row.is_active; });

      const subscriptionPaidState: Record<string, boolean> = {}; const subscriptionValueOverrides: Record<string, number> = {}; const subscriptionDateOverrides: Record<string, string> = {}; const subscriptionBankAccounts: Record<string, string> = {}; const subscriptionPaidAt: Record<string, string> = {};
      (subMonthsRes.data ?? []).forEach(row => { subscriptionPaidState[row.subscription_id] = row.paid; if (row.value_override != null) subscriptionValueOverrides[row.subscription_id] = Number(row.value_override); if (row.date_override) subscriptionDateOverrides[row.subscription_id] = row.date_override; if (row.bank_account_id) subscriptionBankAccounts[row.subscription_id] = row.bank_account_id; if (row.paid_at) subscriptionPaidAt[row.subscription_id] = row.paid_at; });

      replaceMonth({
        income: Number(incomeRes.data?.value ?? 0), incomeDate: incomeRes.data?.income_date ?? undefined, incomeTime: incomeRes.data?.received_at ? incomeRes.data.received_at.slice(11, 16) : undefined, incomeBankAccountId: incomeRes.data?.bank_account_id ?? undefined,
        variableExpenses: (expensesRes.data ?? []).map(e => ({ id: e.id, name: e.name, value: Number(e.value), paid: e.paid, dueDay: e.due_day ?? undefined, createdAt: new Date(e.created_at).getTime() })),
        cardBills: (cardBillsRes.data ?? []).map(cb => ({ id: cb.card_id, name: '', value: Number(cb.value), paid: cb.paid, paymentDate: cb.payment_date ?? undefined, bankAccountId: cb.bank_account_id ?? undefined, categoryId: cb.category_id ?? undefined, details: cb.detalhes ?? undefined, paidAt: cb.paid_at ?? undefined })),
        extraIncomes: (extraIncomesRes.data ?? []).map(ei => ({ id: ei.id, description: ei.description ?? '', value: Number(ei.value), createdAt: new Date(ei.created_at).getTime() })),
        extraordinaryExpenses: (extraordinaryRes.data ?? []).map(e => ({ id: e.id, name: e.name, value: Number(e.value), paid: e.paid, createdAt: new Date(e.created_at).getTime() })),
        investments: [],
        manualEntries: (manualRes.data ?? []).filter(m => m.direction === 'entry').map(m => ({ id: m.id, date: m.date, description: m.description, value: Number(m.value), paymentMethod: m.payment_method, bankAccountId: m.bank_account_id ?? undefined, occurredAt: m.occurred_at ?? undefined, categoryId: m.category_id ?? undefined, observation: m.observacao ?? undefined, paidByOthers: m.pago_por_terceiros ?? false, createdAt: new Date(m.created_at).getTime() })),
        manualExits: (manualRes.data ?? []).filter(m => m.direction === 'exit').map(m => ({ id: m.id, date: m.date, description: m.description, value: Number(m.value), paymentMethod: m.payment_method, bankAccountId: m.bank_account_id ?? undefined, occurredAt: m.occurred_at ?? undefined, categoryId: m.category_id ?? undefined, observation: m.observacao ?? undefined, paidByOthers: m.pago_por_terceiros ?? false, createdAt: new Date(m.created_at).getTime() })),
        recurringPaidState, recurringValueOverrides, recurringDateOverrides, recurringBankAccounts, recurringActiveState, recurringPaidAt, subscriptionPaidState, subscriptionValueOverrides, subscriptionDateOverrides, subscriptionBankAccounts, subscriptionPaidAt,
      });
    })();
  }, [userId, monthKey, replaceMonth]);

  const currentMonthData: MonthData = useMemo(() => ({ ...monthData, investments: investmentsState.filter(i => i.month === monthKey).map(({ month, ...inv }) => inv) }), [monthData, investmentsState, monthKey]);
  const data: LedgerData = useMemo(() => ({ monthlyData: { [monthKey]: currentMonthData }, installments: installmentsState, goals: goalsState, recurringExpenses: recurringState, cards: cardsState, subscriptions: subscriptionsState }), [monthKey, currentMonthData, installmentsState, goalsState, recurringState, cardsState, subscriptionsState]);

  // ===== Salário / Bancos / Categorias =====
  const setIncome = useCallback((val: number, date?: string, time?: string, bankAccountId?: string) => {
    const prev = monthDataRef.current;
    const next: MonthData = { ...prev, income: val, incomeDate: date ?? prev.incomeDate, incomeTime: time ?? prev.incomeTime, incomeBankAccountId: bankAccountId ?? prev.incomeBankAccountId };
    replaceMonth(next);
    if (!userId) return;
    const effectiveDate = next.incomeDate || toMonthDate(monthKey);
    queueUpsert('Erro ao salvar salário', 'income_entries',
      { user_id: userId, month: toMonthDate(monthKey) },
      { value: val, income_date: next.incomeDate || null, bank_account_id: next.incomeBankAccountId || null, received_at: next.incomeTime ? `${effectiveDate}T${next.incomeTime}:00` : null }
    );
  }, [userId, monthKey, replaceMonth]);

  const addBankAccount = useCallback((name: string, kind: 'PF' | 'PJ') => {
    const id = crypto.randomUUID();
    const account: BankAccount = { id, name: name.trim(), kind, createdAt: Date.now() };
    setBankAccountsState(prev => [...prev, account]);
    if (userId) {
      runWrite('Erro ao salvar conta bancária', () => db.from('bank_accounts').insert({ id, user_id: userId, name: account.name, kind }))
        .then(ok => { if (!ok) setBankAccountsState(prev => prev.filter(b => b.id !== id)); });
    }
    return account;
  }, [userId]);

  const addCategory = useCallback((name: string, color?: string) => {
    const id = crypto.randomUUID();
    const category: Category = { id, name: name.trim(), color, createdAt: Date.now() };
    setCategoriesState(prev => [...prev, category]);
    if (userId) {
      runWrite('Erro ao salvar categoria', () => db.from('categories').insert({ id, user_id: userId, name: category.name, color: color ?? null }))
        .then(ok => { if (!ok) setCategoriesState(prev => prev.filter(c => c.id !== id)); });
    }
    return category;
  }, [userId]);

  // ===== Cartões =====
  const addCard = useCallback((name: string = '', dueDay: number = 1) => {
    if (!userId) return '';
    const id = crypto.randomUUID();
    const item: Card = { id, name: name.trim(), dueDay: dueDay || 1, startMonth: monthKey, createdAt: Date.now() };
    setCardsState(prev => [...prev, item]);
    runWrite('Erro ao criar cartão', () => db.from('cards').insert({ id, user_id: userId, name: item.name, due_day: item.dueDay, start_month: toMonthDate(monthKey) }))
      .then(ok => { if (!ok) setCardsState(prev => prev.filter(c => c.id !== id)); });
    return id;
  }, [userId, monthKey]);

  /**
   * Atualiza o cartão (nome/vencimento) e/ou a fatura do mês. Só grava as chaves presentes em `patch`
   * (presente com valor `undefined` = limpar o campo), assim editar o nome não apaga o horário do pagamento.
   */
  const updateCard = useCallback((id: string, patch: Partial<CardBill>) => {
    const has = (k: keyof CardBill) => Object.prototype.hasOwnProperty.call(patch, k);

    const cardDb: Record<string, unknown> = {};
    if (patch.name !== undefined) cardDb.name = patch.name;
    if (patch.dueDay !== undefined) cardDb.due_day = patch.dueDay;
    if (Object.keys(cardDb).length) {
      setCardsState(prev => prev.map(c => c.id === id ? { ...c, name: patch.name ?? c.name, dueDay: patch.dueDay ?? c.dueDay } : c));
      runWrite('Erro ao atualizar cartão', () => db.from('cards').update(cardDb).eq('id', id));
    }

    const billLocal: Partial<CardBill> = {};
    const billDb: Record<string, unknown> = {};
    if (has('value')) { billLocal.value = patch.value ?? 0; billDb.value = patch.value ?? 0; }
    if (has('paid')) {
      billLocal.paid = !!patch.paid; billDb.paid = !!patch.paid;
      if (patch.paid) { const paidAt = patch.paidAt ?? nowLocalIso(); billLocal.paidAt = paidAt; billDb.paid_at = paidAt; }
      else { billLocal.paidAt = undefined; billDb.paid_at = null; }
    } else if (has('paidAt')) { billLocal.paidAt = patch.paidAt; billDb.paid_at = patch.paidAt || null; }
    if (has('paymentDate')) { billLocal.paymentDate = patch.paymentDate || undefined; billDb.payment_date = patch.paymentDate || null; }
    if (has('bankAccountId')) { billLocal.bankAccountId = patch.bankAccountId || undefined; billDb.bank_account_id = patch.bankAccountId || null; }
    if (has('categoryId')) { billLocal.categoryId = patch.categoryId || undefined; billDb.category_id = patch.categoryId || null; }
    if (has('details')) { billLocal.details = patch.details || undefined; billDb.detalhes = patch.details || null; }
    if (!Object.keys(billDb).length) return;

    patchMonth(m => {
      const exists = m.cardBills.some(c => c.id === id);
      const cardBills = exists
        ? m.cardBills.map(c => c.id === id ? { ...c, ...billLocal } : c)
        : [...m.cardBills, { id, name: '', value: 0, paid: false, ...billLocal }];
      return { ...m, cardBills };
    });
    if (userId) queueUpsert('Erro ao salvar fatura do cartão', 'card_bills', { user_id: userId, card_id: id, month: toMonthDate(monthKey) }, billDb);
  }, [userId, monthKey, patchMonth]);

  const removeCard = useCallback((id: string) => {
    const card = cardsState.find(c => c.id === id);
    const isNewThisMonth = card && card.startMonth >= monthKey;

    if (isNewThisMonth) {
      setCardsState(prev => prev.filter(c => c.id !== id));
      runWrite('Erro ao remover cartão', async () => {
        const { error: delError } = await db.from('cards').delete().eq('id', id);
        if (delError && delError.code === '23503') {
          return db.from('cards').update({ end_month: toMonthDate(monthKey) }).eq('id', id);
        }
        return { error: delError };
      });
    } else {
      setCardsState(prev => prev.map(c => c.id === id ? { ...c, endMonth: monthKey } : c));
      runWrite('Erro ao remover cartão', () => db.from('cards').update({ end_month: toMonthDate(monthKey) }).eq('id', id));
    }
  }, [cardsState, monthKey]);

  const computedCardBills = useMemo(() => cardsState.filter(c => c.startMonth <= monthKey && (!c.endMonth || c.endMonth > monthKey)).map(c => { const mData = currentMonthData.cardBills.find(cb => cb.id === c.id); return { id: c.id, name: c.name, dueDay: c.dueDay, value: mData?.value || 0, paid: mData?.paid || false, paymentDate: mData?.paymentDate, bankAccountId: mData?.bankAccountId, paidAt: mData?.paidAt, categoryId: mData?.categoryId, details: mData?.details, createdAt: c.createdAt }; }).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [cardsState, currentMonthData.cardBills, monthKey]);

  // ===== Assinaturas =====
  const activeSubscriptions = useMemo(() => subscriptionsState.filter(s => s.startMonth <= monthKey && (!s.endMonth || s.endMonth > monthKey)), [subscriptionsState, monthKey]);

  const addSubscription = useCallback((name: string, value: number, dueDay: number, paymentMethod: string, categoryId?: string) => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const sub: Subscription = { id, name, value, dueDay, startMonth: monthKey, createdAt: Date.now(), paymentMethod, categoryId };
    setSubscriptionsState(prev => [...prev, sub]);
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, true);
    runWrite('Erro ao criar assinatura', () => db.from('subscriptions').insert({ id, user_id: userId, name, value, due_day: dueDay, payment_method, card_id, category_id: categoryId ?? null, start_month: toMonthDate(monthKey) }))
      .then(ok => { if (!ok) setSubscriptionsState(prev => prev.filter(s => s.id !== id)); });
  }, [userId, monthKey]);

  const softDeleteSubscription = useCallback((id: string) => {
    const sub = subscriptionsState.find(s => s.id === id);
    const isNewThisMonth = sub && sub.startMonth >= monthKey;

    if (isNewThisMonth) {
      setSubscriptionsState(prev => prev.filter(s => s.id !== id));
      runWrite('Erro ao apagar assinatura', () => db.from('subscriptions').delete().eq('id', id));
    } else {
      setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, endMonth: monthKey } : s));
      runWrite('Erro ao remover assinatura', () => db.from('subscriptions').update({ end_month: toMonthDate(monthKey) }).eq('id', id));
    }
  }, [subscriptionsState, monthKey]);

  const subscriptionMonthMatch = useCallback((id: string) => ({ user_id: userId, subscription_id: id, month: toMonthDate(monthKey) }), [userId, monthKey]);

  const paySubscription = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    const dateOnly = paidAtIso.slice(0, 10);
    patchMonth(m => ({ ...m, subscriptionPaidState: { ...m.subscriptionPaidState, [id]: true }, subscriptionDateOverrides: { ...(m.subscriptionDateOverrides || {}), [id]: dateOnly }, subscriptionBankAccounts: { ...(m.subscriptionBankAccounts || {}), [id]: bankAccountId }, subscriptionPaidAt: { ...(m.subscriptionPaidAt || {}), [id]: paidAtIso } }));
    if (userId) queueUpsert('Erro ao pagar assinatura', 'subscription_months', subscriptionMonthMatch(id), { paid: true, date_override: dateOnly, bank_account_id: bankAccountId, paid_at: paidAtIso });
  }, [userId, patchMonth, subscriptionMonthMatch]);

  const unpaySubscription = useCallback((id: string) => {
    patchMonth(m => { const paidAt = { ...(m.subscriptionPaidAt || {}) }; delete paidAt[id]; return { ...m, subscriptionPaidState: { ...m.subscriptionPaidState, [id]: false }, subscriptionPaidAt: paidAt }; });
    if (userId) queueUpsert('Erro ao desfazer pagamento da assinatura', 'subscription_months', subscriptionMonthMatch(id), { paid: false, paid_at: null });
  }, [userId, patchMonth, subscriptionMonthMatch]);

  const updateSubscriptionValue = useCallback((id: string, value: number) => {
    patchMonth(m => ({ ...m, subscriptionValueOverrides: { ...m.subscriptionValueOverrides, [id]: value } }));
    if (userId) queueUpsert('Erro ao salvar valor da assinatura', 'subscription_months', subscriptionMonthMatch(id), { value_override: value });
  }, [userId, patchMonth, subscriptionMonthMatch]);

  const updateSubscriptionDate = useCallback((id: string, date: string) => {
    patchMonth(m => ({ ...m, subscriptionDateOverrides: { ...(m.subscriptionDateOverrides || {}), [id]: date } }));
    if (userId) queueUpsert('Erro ao salvar data da assinatura', 'subscription_months', subscriptionMonthMatch(id), { date_override: date });
  }, [userId, patchMonth, subscriptionMonthMatch]);

  // ===== Recorrentes =====
  const activeRecurringExpenses = useMemo(() => recurringState.filter(re => re.startMonth <= monthKey && (!re.endMonth || re.endMonth > monthKey)), [recurringState, monthKey]);

  const recurringMonthMatch = useCallback((id: string) => ({ user_id: userId, recurring_expense_id: id, month: toMonthDate(monthKey) }), [userId, monthKey]);

  const addRecurringExpense = useCallback((name: string, value: number, dueDay: number, categoryId?: string) => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const re: RecurringExpense = { id, name, value, dueDay, startMonth: monthKey, createdAt: Date.now(), categoryId };
    setRecurringState(prev => [...prev, re]);
    runWrite('Erro ao criar despesa recorrente', () => db.from('recurring_expenses').insert({ id, user_id: userId, name, value, due_day: dueDay, category_id: categoryId ?? null, start_month: toMonthDate(monthKey) }))
      .then(ok => { if (!ok) setRecurringState(prev => prev.filter(r => r.id !== id)); });
  }, [userId, monthKey]);

  const softDeleteRecurringExpense = useCallback((id: string) => {
    const re = recurringState.find(r => r.id === id);
    const isNewThisMonth = re && re.startMonth >= monthKey;

    if (isNewThisMonth) {
      setRecurringState(prev => prev.filter(r => r.id !== id));
      runWrite('Erro ao apagar despesa recorrente', () => db.from('recurring_expenses').delete().eq('id', id));
    } else {
      setRecurringState(prev => prev.map(r => r.id === id ? { ...r, endMonth: monthKey } : r));
      runWrite('Erro ao remover despesa recorrente', () => db.from('recurring_expenses').update({ end_month: toMonthDate(monthKey) }).eq('id', id));
    }
  }, [recurringState, monthKey]);

  const toggleRecurringActive = useCallback((id: string) => {
    const newActive = !(monthDataRef.current.recurringActiveState?.[id] ?? true);
    patchMonth(m => ({ ...m, recurringActiveState: { ...(m.recurringActiveState || {}), [id]: newActive } }));
    if (userId) queueUpsert('Erro ao pausar/reativar despesa', 'recurring_expense_months', recurringMonthMatch(id), { is_active: newActive });
  }, [userId, patchMonth, recurringMonthMatch]);

  const payRecurringExpense = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    const dateOnly = paidAtIso.slice(0, 10);
    patchMonth(m => ({ ...m, recurringPaidState: { ...m.recurringPaidState, [id]: true }, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: dateOnly }, recurringBankAccounts: { ...(m.recurringBankAccounts || {}), [id]: bankAccountId }, recurringPaidAt: { ...(m.recurringPaidAt || {}), [id]: paidAtIso } }));
    if (userId) queueUpsert('Erro ao pagar despesa recorrente', 'recurring_expense_months', recurringMonthMatch(id), { paid: true, date_override: dateOnly, bank_account_id: bankAccountId, paid_at: paidAtIso });
  }, [userId, patchMonth, recurringMonthMatch]);

  const unpayRecurringExpense = useCallback((id: string) => {
    patchMonth(m => { const paidAt = { ...(m.recurringPaidAt || {}) }; delete paidAt[id]; return { ...m, recurringPaidState: { ...m.recurringPaidState, [id]: false }, recurringPaidAt: paidAt }; });
    if (userId) queueUpsert('Erro ao desfazer pagamento', 'recurring_expense_months', recurringMonthMatch(id), { paid: false, paid_at: null });
  }, [userId, patchMonth, recurringMonthMatch]);

  const updateRecurringValue = useCallback((id: string, value: number) => {
    patchMonth(m => ({ ...m, recurringValueOverrides: { ...m.recurringValueOverrides, [id]: value } }));
    if (userId) queueUpsert('Erro ao salvar valor da despesa', 'recurring_expense_months', recurringMonthMatch(id), { value_override: value });
  }, [userId, patchMonth, recurringMonthMatch]);

  const updateRecurringDate = useCallback((id: string, date: string) => {
    patchMonth(m => ({ ...m, recurringDateOverrides: { ...(m.recurringDateOverrides || {}), [id]: date } }));
    if (userId) queueUpsert('Erro ao salvar data da despesa', 'recurring_expense_months', recurringMonthMatch(id), { date_override: date });
  }, [userId, patchMonth, recurringMonthMatch]);

  // ===== Despesas variáveis e Renda Extra (Antigas) =====
  const addExpense = useCallback(() => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const item: Expense = { id, name: '', value: 0, paid: false, createdAt: Date.now() };
    patchMonth(m => ({ ...m, variableExpenses: [...m.variableExpenses, item] }));
    runWrite('Erro ao criar despesa', () => db.from('expenses').insert({ id, user_id: userId, month: toMonthDate(monthKey), name: '', value: 0, paid: false }));
  }, [userId, monthKey, patchMonth]);

  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    patchMonth(m => ({ ...m, variableExpenses: m.variableExpenses.map(e => e.id === id ? { ...e, ...patch } : e) }));
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.paid !== undefined) dbPatch.paid = patch.paid;
    if (patch.dueDay !== undefined) dbPatch.due_day = patch.dueDay;
    if (Object.keys(dbPatch).length) runWrite('Erro ao atualizar despesa', () => db.from('expenses').update(dbPatch).eq('id', id));
  }, [patchMonth]);

  const removeExpense = useCallback((id: string) => {
    patchMonth(m => ({ ...m, variableExpenses: m.variableExpenses.filter(e => e.id !== id) }));
    runWrite('Erro ao apagar despesa', () => db.from('expenses').delete().eq('id', id));
  }, [patchMonth]);

  const removeExtraIncome = useCallback((id: string) => {
    patchMonth(m => ({ ...m, extraIncomes: (m.extraIncomes || []).filter(e => e.id !== id) }));
    runWrite('Erro ao apagar renda extra', () => db.from('extra_incomes').delete().eq('id', id));
  }, [patchMonth]);

  // ===== Entradas/saídas manuais =====
  const manualPaymentMethodToDb = (label?: string) => { switch (label) { case 'Boleto': return 'boleto'; case 'TED': return 'ted'; case 'Outros': return 'outros'; case 'Cartão': return 'card'; default: return 'pix'; } };

  const addManualTransaction = useCallback((direction: 'entry' | 'exit', date: string, description: string, value: number, paymentMethod?: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers: boolean = false) => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const occurredAt = time ? `${date}T${time}:00` : undefined;
    const dbMethod = manualPaymentMethodToDb(paymentMethod);
    // Campos opcionais chegam como '' quando não preenchidos — '' não é um UUID válido e fazia o INSERT falhar.
    const item: ManualEntry = { id, date, description, value, createdAt: Date.now(), paymentMethod: dbMethod, bankAccountId: bankAccountId || undefined, occurredAt, categoryId: categoryId || undefined, observation: observation || undefined, paidByOthers };
    const listKey = direction === 'entry' ? 'manualEntries' : 'manualExits';

    patchMonth(m => ({ ...m, [listKey]: [...(m[listKey] || []), item] }));
    runWrite(direction === 'entry' ? 'Erro ao salvar entrada' : 'Erro ao salvar saída', () => db.from('manual_transactions').insert({ id, user_id: userId, month: toMonthDate(monthKey), direction, date, description, value, payment_method: dbMethod, bank_account_id: bankAccountId || null, occurred_at: occurredAt ?? null, category_id: categoryId || null, observacao: observation || null, pago_por_terceiros: paidByOthers }))
      .then(ok => { if (!ok) patchMonth(m => ({ ...m, [listKey]: (m[listKey] || []).filter(e => e.id !== id) })); });
  }, [userId, monthKey, patchMonth]);

  const addManualEntry = useCallback((date: string, description: string, value: number, paymentMethod?: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers: boolean = false) =>
    addManualTransaction('entry', date, description, value, paymentMethod, bankAccountId, time, categoryId, observation, paidByOthers), [addManualTransaction]);

  const addManualExit = useCallback((date: string, description: string, value: number, paymentMethod?: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers: boolean = false) =>
    addManualTransaction('exit', date, description, value, paymentMethod, bankAccountId, time, categoryId, observation, paidByOthers), [addManualTransaction]);

  const removeManualEntry = useCallback((id: string) => {
    patchMonth(m => ({ ...m, manualEntries: (m.manualEntries || []).filter(e => e.id !== id) }));
    runWrite('Erro ao apagar entrada', () => db.from('manual_transactions').delete().eq('id', id));
  }, [patchMonth]);

  const removeManualExit = useCallback((id: string) => {
    patchMonth(m => ({ ...m, manualExits: (m.manualExits || []).filter(e => e.id !== id) }));
    runWrite('Erro ao apagar saída', () => db.from('manual_transactions').delete().eq('id', id));
  }, [patchMonth]);

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
    runWrite('Erro ao criar compra parcelada', () => db.from('installment_purchases').insert({ id: purchaseId, user_id: userId, name, monthly_value: monthlyValue, total_months: totalMonths, start_month: toMonthDate(monthKey), payment_method, card_id, category_id: categoryId ?? null }))
      .then(ok => { if (!ok) setInstallmentsState(prev => prev.filter(i => i.id !== purchaseId)); });
    const items = Array.from({ length: totalMonths }, (_, i) => ({ user_id: userId, installment_purchase_id: purchaseId, month: format(addMonths(startDate, i), 'yyyy-MM-dd'), sequence_number: i + 1, amount: monthlyValue, paid: false }));
    runWrite('Erro ao criar parcelas', () => db.from('installment_items').insert(items));
  }, [userId, monthKey]);

  const payInstallment = useCallback((id: string, bankAccountId: string, paidAtIso: string) => {
    setInstallmentsState(prev => prev.map(inst => inst.id === id ? { ...inst, paidMonths: inst.paidMonths.includes(monthKey) ? inst.paidMonths : [...inst.paidMonths, monthKey], paidDates: { ...inst.paidDates, [monthKey]: paidAtIso }, paidBankAccounts: { ...inst.paidBankAccounts, [monthKey]: bankAccountId } } : inst));
    if (!userId) return;
    const inst = installmentsRef.current.find(i => i.id === id);
    const sequence = inst ? differenceInMonths(monthStartDate(monthKey), monthStartDate(inst.startDate)) + 1 : 1;
    // Upsert: se a linha da parcela não existir (ex.: dados migrados incompletos), ela é criada.
    queueUpsert('Erro ao pagar parcela', 'installment_items',
      { user_id: userId, installment_purchase_id: id, month: toMonthDate(monthKey) },
      { paid: true, paid_at: paidAtIso, bank_account_id: bankAccountId },
      { sequence_number: sequence, amount: inst?.monthlyValue ?? 0 }
    );
  }, [userId, monthKey]);

  const unpayInstallment = useCallback((id: string) => {
    setInstallmentsState(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      const paidDates = { ...inst.paidDates }; delete paidDates[monthKey];
      const paidBankAccounts = { ...inst.paidBankAccounts }; delete paidBankAccounts[monthKey];
      return { ...inst, paidMonths: inst.paidMonths.filter(m => m !== monthKey), paidDates, paidBankAccounts };
    }));
    runWrite('Erro ao desfazer pagamento da parcela', () => db.from('installment_items').update({ paid: false, paid_at: null, bank_account_id: null }).match({ installment_purchase_id: id, month: toMonthDate(monthKey) }));
  }, [monthKey]);

  const removeInstallment = useCallback((id: string) => {
    setInstallmentsState(prev => prev.filter(i => i.id !== id));
    runWrite('Erro ao apagar compra parcelada', () => db.from('installment_purchases').delete().eq('id', id));
  }, []);

  const editInstallment = useCallback((id: string, name: string, monthlyValue: number, totalMonths: number, paymentMethod: string, categoryId?: string) => {
    const inst = installmentsRef.current.find(i => i.id === id);
    if (!inst || !userId || !totalMonths || totalMonths < 1) return;
    const startDate = monthStartDate(inst.startDate);
    const oldTotal = inst.totalMonths;
    const newPaidMonths = inst.paidMonths.filter(m => differenceInMonths(monthStartDate(m), startDate) < totalMonths);
    setInstallmentsState(prev => prev.map(i => i.id === id ? { ...i, name, monthlyValue, totalMonths, paymentMethod, categoryId, paidMonths: newPaidMonths } : i));
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, false);
    const label = 'Erro ao editar compra parcelada';
    runWrite(label, () => db.from('installment_purchases').update({ name, monthly_value: monthlyValue, total_months: totalMonths, payment_method, card_id, category_id: categoryId ?? null }).eq('id', id));
    runWrite(label, () => db.from('installment_items').update({ amount: monthlyValue }).eq('installment_purchase_id', id));
    if (totalMonths > oldTotal) {
      const newItems = Array.from({ length: totalMonths - oldTotal }, (_, k) => { const seq = oldTotal + k + 1; return { user_id: userId, installment_purchase_id: id, month: format(addMonths(startDate, seq - 1), 'yyyy-MM-dd'), sequence_number: seq, amount: monthlyValue, paid: false }; });
      runWrite(label, () => db.from('installment_items').upsert(newItems, { onConflict: 'installment_purchase_id,month', ignoreDuplicates: true }));
    } else if (totalMonths < oldTotal) {
      runWrite(label, () => db.from('installment_items').delete().eq('installment_purchase_id', id).gt('sequence_number', totalMonths));
    }
  }, [userId]);

  // ===== Investimentos e Metas =====
  const addInvestment = useCallback((type: 'CDB' | 'Bitcoin', description: string, value: number, action: 'deposit' | 'withdraw' | 'yield', date?: string) => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const occurredOn = date || toMonthDate(monthKey);
    const itemMonth = occurredOn.slice(0, 7);
    const item: InvestmentRow = { id, type, description, value, date: occurredOn, action, createdAt: Date.now(), month: itemMonth };
    setInvestmentsState(prev => [...prev, item]);
    runWrite('Erro ao salvar investimento', () => db.from('investments').insert({ id, user_id: userId, month: toMonthDate(itemMonth), type, description, value, occurred_on: occurredOn, action }))
      .then(ok => { if (!ok) setInvestmentsState(prev => prev.filter(i => i.id !== id)); });
  }, [userId, monthKey]);

  const removeInvestment = useCallback((id: string) => {
    setInvestmentsState(prev => prev.filter(i => i.id !== id));
    runWrite('Erro ao apagar investimento', () => db.from('investments').delete().eq('id', id));
  }, []);

  const addGoal = useCallback((name: string, targetValue: number) => {
    if (!userId) return;
    const id = crypto.randomUUID(); const goal: Goal = { id, name, targetValue, purchased: false, createdAt: Date.now() };
    setGoalsState(prev => [...prev, goal]);
    runWrite('Erro ao criar meta', () => db.from('goals').insert({ id, user_id: userId, name, target_value: targetValue, purchased: false }))
      .then(ok => { if (!ok) setGoalsState(prev => prev.filter(g => g.id !== id)); });
  }, [userId]);

  const markGoalPurchased = useCallback((id: string, actualValue: number, paymentDate: string) => {
    setGoalsState(prev => prev.map(g => g.id === id ? { ...g, purchased: true, actualPaidValue: actualValue, paymentDate } : g));
    runWrite('Erro ao concluir meta', () => db.from('goals').update({ purchased: true, actual_paid_value: actualValue, payment_date: paymentDate }).eq('id', id));
  }, []);

  const toggleGoalPurchased = useCallback((id: string) => {
    const goal = goalsRef.current.find(g => g.id === id);
    if (!goal) return;
    const purchased = !goal.purchased;
    setGoalsState(prev => prev.map(g => g.id === id ? { ...g, purchased, ...(purchased ? {} : { actualPaidValue: undefined, paymentDate: undefined }) } : g));
    runWrite('Erro ao atualizar meta', () => db.from('goals').update(purchased ? { purchased } : { purchased, actual_paid_value: null, payment_date: null }).eq('id', id));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoalsState(prev => prev.filter(g => g.id !== id));
    runWrite('Erro ao apagar meta', () => db.from('goals').delete().eq('id', id));
  }, []);

  const addExtraordinaryExpense = useCallback(() => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const item: Expense = { id, name: '', value: 0, paid: false, createdAt: Date.now() };
    patchMonth(m => ({ ...m, extraordinaryExpenses: [...(m.extraordinaryExpenses || []), item] }));
    runWrite('Erro ao criar despesa extra', () => db.from('extraordinary_expenses').insert({ id, user_id: userId, month: toMonthDate(monthKey), name: '', value: 0, paid: false }));
  }, [userId, monthKey, patchMonth]);

  const updateExtraordinaryExpense = useCallback((id: string, patch: Partial<Expense>) => {
    patchMonth(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).map(e => e.id === id ? { ...e, ...patch } : e) }));
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.value !== undefined) dbPatch.value = patch.value;
    if (patch.paid !== undefined) dbPatch.paid = patch.paid;
    if (Object.keys(dbPatch).length) runWrite('Erro ao atualizar despesa extra', () => db.from('extraordinary_expenses').update(dbPatch).eq('id', id));
  }, [patchMonth]);

  const removeExtraordinaryExpense = useCallback((id: string) => {
    patchMonth(m => ({ ...m, extraordinaryExpenses: (m.extraordinaryExpenses || []).filter(e => e.id !== id) }));
    runWrite('Erro ao apagar despesa extra', () => db.from('extraordinary_expenses').delete().eq('id', id));
  }, [patchMonth]);

  // ===== Edição Rápida e Remoção Geral =====
  const editSubscription = useCallback((id: string, name: string, value: number, dueDay: number, paymentMethod: string, categoryId?: string) => {
    setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, name, value, dueDay, paymentMethod, categoryId } : s));
    const { payment_method, card_id } = paymentMethodToDb(paymentMethod, true);
    runWrite('Erro ao editar assinatura', () => db.from('subscriptions').update({ name, value, due_day: dueDay, payment_method, card_id, category_id: categoryId ?? null }).eq('id', id));
    // Se este mês tinha um valor sobrescrito, ele "escondia" o valor novo — atualiza junto.
    if (monthDataRef.current.subscriptionValueOverrides[id] !== undefined) updateSubscriptionValue(id, value);
  }, [updateSubscriptionValue]);

  const editRecurringExpense = useCallback((id: string, name: string, dueDay: number, categoryId?: string) => {
    setRecurringState(prev => prev.map(re => re.id === id ? { ...re, name, dueDay, categoryId } : re));
    runWrite('Erro ao editar despesa recorrente', () => db.from('recurring_expenses').update({ name, due_day: dueDay, category_id: categoryId ?? null }).eq('id', id));
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

    if (source === 'manual-entry' || source === 'manual-exit') {
      const listKey = source === 'manual-entry' ? 'manualEntries' : 'manualExits';
      const current = (monthDataRef.current[listKey] || []).find(e => e.id === id);
      // Mantém o horário, mas move a data junto (senão a hora exibida ficava presa à data antiga).
      const occurredAt = current?.occurredAt ? `${date}T${current.occurredAt.slice(11, 16)}:00` : undefined;
      patchMonth(m => ({ ...m, [listKey]: (m[listKey] || []).map(e => e.id === id ? { ...e, date, description, value, occurredAt } : e) }));
      runWrite('Erro ao editar lançamento', () => db.from('manual_transactions').update({ date, description, value, occurred_at: occurredAt ?? null }).eq('id', id));
    }
    else if (source === 'card') {
      updateCard(id, { name: description, value, paymentDate: date });
    }
    else if (source === 'recurring') {
      updateRecurringValue(id, value); updateRecurringDate(id, date);
      setRecurringState(prev => prev.map(re => re.id === id ? { ...re, name: description } : re));
      runWrite('Erro ao editar despesa recorrente', () => db.from('recurring_expenses').update({ name: description }).eq('id', id));
    }
    else if (source === 'subscription') {
      updateSubscriptionValue(id, value); updateSubscriptionDate(id, date);
      setSubscriptionsState(prev => prev.map(s => s.id === id ? { ...s, name: description } : s));
      runWrite('Erro ao editar assinatura', () => db.from('subscriptions').update({ name: description }).eq('id', id));
    }
    else if (source === 'installment') {
      // Valor e nome da parcela valem para a compra inteira (editar na seção de parcelas); aqui só a data do pagamento.
      const inst = installmentsRef.current.find(i => i.id === id);
      const previous = inst?.paidDates?.[monthKey];
      const paidAt = `${date}T${previous && previous.length > 10 ? previous.slice(11, 16) : '00:00'}:00`;
      setInstallmentsState(prev => prev.map(i => i.id === id ? { ...i, paidDates: { ...i.paidDates, [monthKey]: paidAt } } : i));
      runWrite('Erro ao editar parcela', () => db.from('installment_items').update({ paid_at: paidAt }).match({ installment_purchase_id: id, month: toMonthDate(monthKey) }));
    }
    else if (source === 'extraordinary') {
      updateExtraordinaryExpense(id, { name: description, value });
    }
    else if (source === 'extra-income') {
      patchMonth(m => ({ ...m, extraIncomes: (m.extraIncomes || []).map(e => e.id === id ? { ...e, description, value } : e) }));
      runWrite('Erro ao editar renda extra', () => db.from('extra_incomes').update({ description, value }).eq('id', id));
    }
    else if (source === 'salary') {
      setIncome(value, date);
    }
    else if (source === 'investment-deposit' || source === 'investment-withdraw' || source === 'investment-yield') {
      const cleanDesc = description.replace(/^(Aporte|Resgate|Rendimento) (CDB|Bitcoin)( - )?/, '');
      setInvestmentsState(prev => prev.map(inv => inv.id === id ? { ...inv, date, description: cleanDesc, value } : inv));
      runWrite('Erro ao editar investimento', () => db.from('investments').update({ occurred_on: date, description: cleanDesc, value }).eq('id', id));
    }
  }, [monthKey, patchMonth, updateCard, updateRecurringValue, updateRecurringDate, updateSubscriptionValue, updateSubscriptionDate, updateExtraordinaryExpense, setIncome]);

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