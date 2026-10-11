-- Criação da tabela de compras detalhadas da fatura do cartão (compra por compra)
CREATE TABLE IF NOT EXISTS public.card_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  month date NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_invoice_items_user_month_idx ON public.card_invoice_items(user_id, month);
CREATE INDEX IF NOT EXISTS card_invoice_items_card_month_idx ON public.card_invoice_items(card_id, month);

ALTER TABLE public.card_invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'card_invoice_items' AND policyname = 'card_invoice_items_own'
  ) THEN
    CREATE POLICY "card_invoice_items_own" ON public.card_invoice_items
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
