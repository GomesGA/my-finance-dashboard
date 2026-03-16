import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtraIncome } from '@/types/ledger';

interface Props {
  items: ExtraIncome[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ExtraIncome>) => void;
  onRemove: (id: string) => void;
}

export function ExtraIncomeSection({ items, onAdd, onUpdate, onRemove }: Props) {
  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <DollarSign size={18} className="text-muted-foreground" />
          Rendas Extras
        </h2>
        <button onClick={onAdd} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 group"
            >
              <input
                type="text"
                placeholder="Descrição da renda"
                className="ledger-input flex-1 min-w-0"
                value={item.description}
                onChange={e => onUpdate(item.id, { description: e.target.value })}
              />
              <div className="relative shrink-0 w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input
                  type="number"
                  placeholder="0,00"
                  className="ledger-input w-full font-mono pl-7"
                  value={item.value || ''}
                  onChange={e => onUpdate(item.id, { value: Number(e.target.value) })}
                />
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="p-2 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Nenhuma renda extra registrada.</p>
        )}
      </div>
    </section>
  );
}
