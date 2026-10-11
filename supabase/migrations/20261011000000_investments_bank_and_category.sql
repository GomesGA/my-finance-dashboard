-- Adiciona vínculo de conta bancária e categoria aos investimentos
alter table public.investments
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null,
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists investments_bank_account_idx on public.investments(bank_account_id);
create index if not exists investments_category_idx on public.investments(category_id);
