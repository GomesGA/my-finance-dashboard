import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardBill } from '@/types/ledger';

interface Props {
  cards: CardBill[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CardBill>) => void;
  onRemove: (id: string) => void;
}

export function CardBillsSection({ cards, onAdd, onUpdate, onRemove }: Props) {
  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <CreditCard size={18} className="text-muted-foreground" />
          Faturas de Cartão
        </h2>
        <button onClick={onAdd} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {cards.map(card => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 group min-w-0"
            >
              <input
                type="checkbox"
                checked={card.paid}
                onChange={() => onUpdate(card.id, { paid: !card.paid })}
                className="ledger-checkbox shrink-0"
              />
              <input
                type="text"
                placeholder="Cartão"
                className={`ledger-input min-w-0 flex-1 ${card.paid ? 'line-through text-muted-foreground' : ''}`}
                value={card.name}
                onChange={e => onUpdate(card.id, { name: e.target.value })}
              />
              <div className="relative shrink-0 w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input
                  type="number"
                  placeholder="0,00"
                  className="ledger-input w-full font-mono pl-7"
                  value={card.value || ''}
                  onChange={e => onUpdate(card.id, { value: Number(e.target.value) })}
                />
              </div>
              <button
                onClick={() => onRemove(card.id)}
                className="p-1.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Nenhum cartão registrado.</p>
        )}
      </div>
    </section>
  );
}
