-- Fase 1: despesas recorrentes e assinaturas, com rollover de existência mês a mês
create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value numeric(14,2) not null default 0,
  due_day int not null default 1 check (due_day between 1 and 31),
  category_id uuid references public.categories(id),
  payment_method text not null default 'pix' check (payment_method in ('pix','card')),
  card_id uuid references public.cards(id),
  start_month date not null,
  end_month date,
  created_at timestamptz not null default now()
);

create table public.recurring_expense_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  month date not null,
  is_active boolean not null default true,
  value_override numeric(14,2),
  date_override date,
  paid boolean not null default false,
  paid_at timestamptz,
  bank_account_id uuid references public.bank_accounts(id),
  created_at timestamptz not null default now(),
  unique (recurring_expense_id, month)
);
create index recurring_expense_months_user_month_idx on public.recurring_expense_months(user_id, month);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value numeric(14,2) not null default 0,
  due_day int not null default 1 check (due_day between 1 and 31),
  payment_method text not null default 'pix' check (payment_method in ('pix','free','card')),
  card_id uuid references public.cards(id),
  category_id uuid references public.categories(id),
  start_month date not null,
  end_month date,
  created_at timestamptz not null default now()
);

create table public.subscription_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  month date not null,
  is_active boolean not null default true,
  value_override numeric(14,2),
  date_override date,
  paid boolean not null default false,
  paid_at timestamptz,
  bank_account_id uuid references public.bank_accounts(id),
  created_at timestamptz not null default now(),
  unique (subscription_id, month)
);
create index subscription_months_user_month_idx on public.subscription_months(user_id, month);

alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_months enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_months enable row level security;

create policy "recurring_expenses_own" on public.recurring_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_expense_months_own" on public.recurring_expense_months for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_own" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscription_months_own" on public.subscription_months for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
