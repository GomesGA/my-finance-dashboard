-- Adiciona suporte a status de cartão cancelado
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
