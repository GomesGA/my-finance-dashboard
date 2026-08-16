-- Fase 1: compras parceladas (mestre + parcela a parcela)
create table public.installment_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_value numeric(14,2) not null,
  total_months int not null check (total_months > 0),
  start_month date not null,
  due_day int not null default 1 check (due_day between 1 and 31),
  payment_method text not null default 'pix' check (payment_method in ('pix','card')),
  card_id uuid references public.cards(id),
  category_id uuid references public.categories(id),
  created_at timestamptz not null default now()
);

create table public.installment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_purchase_id uuid not null references public.installment_purchases(id) on delete cascade,
  month date not null,
  sequence_number int not null,
  amount numeric(14,2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  bank_account_id uuid references public.bank_accounts(id),
  created_at timestamptz not null default now(),
  unique (installment_purchase_id, month)
);
create index installment_items_user_month_idx on public.installment_items(user_id, month);

alter table public.installment_purchases enable row level security;
alter table public.installment_items enable row level security;

create policy "installment_purchases_own" on public.installment_purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "installment_items_own" on public.installment_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
