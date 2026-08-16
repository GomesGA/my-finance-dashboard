-- Fase 1: tabelas de apoio (contas bancárias, categorias, cartões)
create extension if not exists pgcrypto;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('PF','PJ')),
  created_at timestamptz not null default now()
);
create index bank_accounts_user_id_idx on public.bank_accounts(user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);
create index categories_user_id_idx on public.categories(user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  due_day int not null default 1 check (due_day between 1 and 31),
  start_month date not null,
  end_month date,
  created_at timestamptz not null default now()
);
create index cards_user_id_idx on public.cards(user_id);

alter table public.bank_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.cards enable row level security;

create policy "bank_accounts_own" on public.bank_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cards_own" on public.cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
