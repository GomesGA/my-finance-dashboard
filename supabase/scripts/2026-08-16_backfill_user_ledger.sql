-- ONE-SHOT: le o JSONB de user_ledger e povoa as tabelas normalizadas da Fase 1.
-- Nao re-executar depois que o app comecar a gravar direto nas tabelas novas.
-- Seguro rodar de novo antes disso: todo insert usa "on conflict ... do nothing".

begin;

-- 1. Cartoes (mestre) --------------------------------------------------------
insert into public.cards (id, user_id, name, due_day, start_month, end_month, created_at)
select (c->>'id')::uuid, ul.user_id, c->>'name', coalesce((c->>'dueDay')::int, 1),
       to_date((c->>'startMonth')||'-01', 'YYYY-MM-DD'),
       case when c->>'endMonth' is not null then to_date((c->>'endMonth')||'-01', 'YYYY-MM-DD') end,
       to_timestamp(coalesce((c->>'createdAt')::bigint, 0) / 1000.0)
from public.user_ledger ul, jsonb_array_elements(coalesce(ul.dados->'cards', '[]'::jsonb)) c
on conflict (id) do nothing;

-- 2. Metas --------------------------------------------------------------------
insert into public.goals (id, user_id, name, target_value, purchased, created_at)
select (g->>'id')::uuid, ul.user_id, g->>'name', (g->>'targetValue')::numeric,
       coalesce((g->>'purchased')::boolean, false),
       to_timestamp(coalesce((g->>'createdAt')::bigint, 0) / 1000.0)
from public.user_ledger ul, jsonb_array_elements(coalesce(ul.dados->'goals', '[]'::jsonb)) g
on conflict (id) do nothing;

-- 3. Despesas recorrentes (mestre) --------------------------------------------
insert into public.recurring_expenses (id, user_id, name, value, due_day, start_month, end_month, created_at)
select (re->>'id')::uuid, ul.user_id, re->>'name', (re->>'value')::numeric, coalesce((re->>'dueDay')::int, 1),
       to_date((re->>'startMonth')||'-01', 'YYYY-MM-DD'),
       case when re->>'endMonth' is not null then to_date((re->>'endMonth')||'-01', 'YYYY-MM-DD') end,
       to_timestamp(coalesce((re->>'createdAt')::bigint, 0) / 1000.0)
from public.user_ledger ul, jsonb_array_elements(coalesce(ul.dados->'recurringExpenses', '[]'::jsonb)) re
on conflict (id) do nothing;

-- 4. Assinaturas (mestre) — separa o campo paymentMethod sobrecarregado -------
insert into public.subscriptions (id, user_id, name, value, due_day, payment_method, card_id, start_month, end_month, created_at)
select (s->>'id')::uuid, ul.user_id, s->>'name', (s->>'value')::numeric, coalesce((s->>'dueDay')::int, 1),
       case when s->>'paymentMethod' is null or s->>'paymentMethod' = 'Pix' then 'pix'
            when s->>'paymentMethod' = 'Free' then 'free'
            else 'card' end,
       case when s->>'paymentMethod' is not null and s->>'paymentMethod' not in ('Pix', 'Free')
            then (s->>'paymentMethod')::uuid end,
       to_date((s->>'startMonth')||'-01', 'YYYY-MM-DD'),
       case when s->>'endMonth' is not null then to_date((s->>'endMonth')||'-01', 'YYYY-MM-DD') end,
       to_timestamp(coalesce((s->>'createdAt')::bigint, 0) / 1000.0)
from public.user_ledger ul, jsonb_array_elements(coalesce(ul.dados->'subscriptions', '[]'::jsonb)) s
on conflict (id) do nothing;

-- 5. Parcelas: compra (mestre) + uma linha por parcela ------------------------
do $$
declare
  u record;
  inst jsonb;
  purchase_id uuid;
  start_m date;
  i int;
  month_i date;
  paid_b boolean;
begin
  for u in select user_id, dados from public.user_ledger loop
    for inst in select * from jsonb_array_elements(coalesce(u.dados->'installments', '[]'::jsonb)) loop
      purchase_id := (inst->>'id')::uuid;
      start_m := to_date((inst->>'startDate')||'-01', 'YYYY-MM-DD');

      insert into public.installment_purchases
        (id, user_id, name, monthly_value, total_months, start_month, due_day, payment_method, card_id, created_at)
      values (
        purchase_id, u.user_id, inst->>'name', (inst->>'monthlyValue')::numeric, (inst->>'totalMonths')::int, start_m,
        coalesce((inst->>'dueDay')::int, 1),
        case when inst->>'paymentMethod' is null or inst->>'paymentMethod' = 'Pix' then 'pix' else 'card' end,
        case when inst->>'paymentMethod' is not null and inst->>'paymentMethod' <> 'Pix'
             then (inst->>'paymentMethod')::uuid end,
        to_timestamp(coalesce((inst->>'createdAt')::bigint, 0) / 1000.0)
      )
      on conflict (id) do nothing;

      for i in 1..(inst->>'totalMonths')::int loop
        month_i := start_m + ((i - 1) || ' months')::interval;
        paid_b := exists (
          select 1 from jsonb_array_elements_text(coalesce(inst->'paidMonths', '[]'::jsonb)) pm
          where pm.value = to_char(month_i, 'YYYY-MM')
        );
        insert into public.installment_items
          (user_id, installment_purchase_id, month, sequence_number, amount, paid, paid_at)
        values (u.user_id, purchase_id, month_i, i, (inst->>'monthlyValue')::numeric, paid_b, case when paid_b then now() end)
        on conflict (installment_purchase_id, month) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- 6. Dados por mes: salario, faturas, extras, avulsas, investimentos,
--    e o estado (pago/override) de recorrentes e assinaturas ------------------
do $$
declare
  u record;
  mkey text;
  m jsonb;
  month_d date;
  item jsonb;
  re_id text;
  sub_id text;
  inv_date date;
begin
  for u in select user_id, dados from public.user_ledger loop
    for mkey, m in select * from jsonb_each(coalesce(u.dados->'monthlyData', '{}'::jsonb)) loop
      month_d := to_date(mkey || '-01', 'YYYY-MM-DD');

      -- salario do mes
      if (m->>'income') is not null and (m->>'income')::numeric <> 0 then
        insert into public.income_entries (user_id, month, value, income_date)
        values (u.user_id, month_d, (m->>'income')::numeric,
                case when m->>'incomeDate' is not null then (m->>'incomeDate')::date end)
        on conflict (user_id, month) do nothing;
      end if;

      -- faturas de cartao
      for item in select * from jsonb_array_elements(coalesce(m->'cardBills', '[]'::jsonb)) loop
        insert into public.card_bills (user_id, card_id, month, value, paid, payment_date)
        values (u.user_id, (item->>'id')::uuid, month_d, (item->>'value')::numeric,
                coalesce((item->>'paid')::boolean, false),
                case when item->>'paymentDate' is not null then (item->>'paymentDate')::date end)
        on conflict (card_id, month) do nothing;
      end loop;

      -- extras (renda extra)
      for item in select * from jsonb_array_elements(coalesce(m->'extraIncomes', '[]'::jsonb)) loop
        insert into public.extra_incomes (id, user_id, month, description, value)
        values ((item->>'id')::uuid, u.user_id, month_d, item->>'description', (item->>'value')::numeric)
        on conflict (id) do nothing;
      end loop;

      -- despesas variaveis (hoje sem uso na UI, mantidas por paridade)
      for item in select * from jsonb_array_elements(coalesce(m->'variableExpenses', '[]'::jsonb)) loop
        insert into public.expenses (id, user_id, month, name, value, paid, due_day)
        values ((item->>'id')::uuid, u.user_id, month_d, item->>'name', (item->>'value')::numeric,
                coalesce((item->>'paid')::boolean, false),
                case when item->>'dueDay' is not null then (item->>'dueDay')::int end)
        on conflict (id) do nothing;
      end loop;

      -- despesas extraordinarias
      for item in select * from jsonb_array_elements(coalesce(m->'extraordinaryExpenses', '[]'::jsonb)) loop
        insert into public.extraordinary_expenses (id, user_id, month, name, value, paid)
        values ((item->>'id')::uuid, u.user_id, month_d, item->>'name', (item->>'value')::numeric,
                coalesce((item->>'paid')::boolean, false))
        on conflict (id) do nothing;
      end loop;

      -- entradas manuais
      for item in select * from jsonb_array_elements(coalesce(m->'manualEntries', '[]'::jsonb)) loop
        insert into public.manual_transactions (id, user_id, month, direction, date, description, value)
        values ((item->>'id')::uuid, u.user_id, month_d, 'entry', (item->>'date')::date,
                item->>'description', (item->>'value')::numeric)
        on conflict (id) do nothing;
      end loop;

      -- saidas manuais
      for item in select * from jsonb_array_elements(coalesce(m->'manualExits', '[]'::jsonb)) loop
        insert into public.manual_transactions (id, user_id, month, direction, date, description, value)
        values ((item->>'id')::uuid, u.user_id, month_d, 'exit', (item->>'date')::date,
                item->>'description', (item->>'value')::numeric)
        on conflict (id) do nothing;
      end loop;

      -- investimentos (defesa contra o legado que gravava so "YYYY-MM" quando faltava data)
      for item in select * from jsonb_array_elements(coalesce(m->'investments', '[]'::jsonb)) loop
        inv_date := case when length(item->>'date') = 7 then to_date((item->>'date')||'-01', 'YYYY-MM-DD')
                         else (item->>'date')::date end;
        insert into public.investments (id, user_id, month, type, description, value, occurred_on, action)
        values ((item->>'id')::uuid, u.user_id, month_d, item->>'type', item->>'description',
                (item->>'value')::numeric, inv_date, item->>'action')
        on conflict (id) do nothing;
      end loop;

      -- recorrentes: estado de pago + overrides -> uma linha por mes tocado
      for re_id in select jsonb_object_keys(coalesce(m->'recurringPaidState', '{}'::jsonb)) loop
        insert into public.recurring_expense_months (user_id, recurring_expense_id, month, paid, value_override, date_override)
        values (u.user_id, re_id::uuid, month_d,
                coalesce((m->'recurringPaidState'->>re_id)::boolean, false),
                (m->'recurringValueOverrides'->>re_id)::numeric,
                case when m->'recurringDateOverrides'->>re_id is not null then (m->'recurringDateOverrides'->>re_id)::date end)
        on conflict (recurring_expense_id, month) do nothing;
      end loop;

      -- assinaturas: mesmo padrao
      for sub_id in select jsonb_object_keys(coalesce(m->'subscriptionPaidState', '{}'::jsonb)) loop
        insert into public.subscription_months (user_id, subscription_id, month, paid, value_override, date_override)
        values (u.user_id, sub_id::uuid, month_d,
                coalesce((m->'subscriptionPaidState'->>sub_id)::boolean, false),
                (m->'subscriptionValueOverrides'->>sub_id)::numeric,
                case when m->'subscriptionDateOverrides'->>sub_id is not null then (m->'subscriptionDateOverrides'->>sub_id)::date end)
        on conflict (subscription_id, month) do nothing;
      end loop;

    end loop;
  end loop;
end $$;

commit;
