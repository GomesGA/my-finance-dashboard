import { Calendar, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Expense } from '@/types/ledger';

interface Props {
  expenses: Expense[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Expense>) => void;
  onRemove: (id: string) => void;
}

export function ExpensesSection({ expenses, onAdd, onUpdate, onRemove }: Props) {
  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <Calendar size={18} className="text-muted-foreground" />
          Despesas Recorrentes
        </h2>
        <button onClick={onAdd} className="ledger-btn-primary flex items-center gap-1">
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {expenses.map(exp => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 group"
            >
              <input
                type="checkbox"
                checked={exp.paid}
                onChange={() => onUpdate(exp.id, { paid: !exp.paid })}
                className="ledger-checkbox"
              />
              <input
                type="text"
                placeholder="Nome da despesa"
                className={`ledger-input flex-1 ${exp.paid ? 'line-through text-muted-foreground' : ''}`}
                value={exp.name}
                onChange={e => onUpdate(exp.id, { name: e.target.value })}
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input
                  type="number"
                  placeholder="0,00"
                  className="ledger-input w-28 font-mono pl-7"
                  value={exp.value || ''}
                  onChange={e => onUpdate(exp.id, { value: Number(e.target.value) })}
                />
              </div>
              <button
                onClick={() => onRemove(exp.id)}
                className="p-2 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {expenses.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Nenhuma despesa registrada.</p>
        )}
      </div>
    </section>
  );
}
