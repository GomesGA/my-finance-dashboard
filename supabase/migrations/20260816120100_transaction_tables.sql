-- Fase 1: faturas de cartão, entradas/saídas por mês, metas, investimentos
create table public.card_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  month date not null,
  value numeric(14,2) not null default 0,
  paid boolean not null default false,
  payment_date date,
  category_id uuid references public.categories(id),
  bank_account_id uuid references public.bank_accounts(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (card_id, month)
);
create index card_bills_user_month_idx on public.card_bills(user_id, month);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  value numeric(14,2) not null default 0,
  income_date date,
  bank_account_id uuid references public.bank_accounts(id),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.extra_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  description text,
  value numeric(14,2) not null default 0,
  bank_account_id uuid references public.bank_accounts(id),
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index extra_incomes_user_month_idx on public.extra_incomes(user_id, month);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  name text not null,
  value numeric(14,2) not null default 0,
  paid boolean not null default false,
  due_day int check (due_day between 1 and 31),
  category_id uuid references public.categories(id),
  created_at timestamptz not null default now()
);
create index expenses_user_month_idx on public.expenses(user_id, month);

create table public.extraordinary_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  name text not null,
  value numeric(14,2) not null default 0,
  paid boolean not null default false,
  category_id uuid references public.categories(id),
  payment_method text not null default 'pix' check (payment_method in ('pix','card')),
  bank_account_id uuid references public.bank_accounts(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index extraordinary_expenses_user_month_idx on public.extraordinary_expenses(user_id, month);

create table public.manual_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  direction text not null check (direction in ('entry','exit')),
  date date not null,
  description text not null,
  value numeric(14,2) not null,
  category_id uuid references public.categories(id),
  payment_method text not null default 'pix' check (payment_method in ('pix','boleto','ted','outros','card')),
  bank_account_id uuid references public.bank_accounts(id),
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);
create index manual_transactions_user_month_idx on public.manual_transactions(user_id, month, direction);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  type text not null check (type in ('CDB','Bitcoin')),
  description text,
  value numeric(14,2) not null,
  occurred_on date not null,
  action text not null check (action in ('deposit','withdraw','yield')),
  created_at timestamptz not null default now()
);
create index investments_user_month_idx on public.investments(user_id, month);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_value numeric(14,2) not null,
  purchased boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.card_bills enable row level security;
alter table public.income_entries enable row level security;
alter table public.extra_incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.extraordinary_expenses enable row level security;
alter table public.manual_transactions enable row level security;
alter table public.investments enable row level security;
alter table public.goals enable row level security;

create policy "card_bills_own" on public.card_bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_entries_own" on public.income_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "extra_incomes_own" on public.extra_incomes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "extraordinary_expenses_own" on public.extraordinary_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manual_transactions_own" on public.manual_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investments_own" on public.investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
