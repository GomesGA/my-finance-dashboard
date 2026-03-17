import { useState } from 'react';
import { Target, Plus, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function GoalsTab({ ledger }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    ledger.addGoal(form.name, Number(form.value));
    setForm({ name: '', value: '' });
    setShowForm(false);
  };

  const goals = ledger.data.goals;
  const totalGoals = goals.filter(g => !g.purchased).reduce((a, c) => a + c.targetValue, 0);
  const purchased = goals.filter(g => g.purchased).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target size={22} className="text-primary" />
            Metas de Compra
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {goals.length} meta{goals.length !== 1 ? 's' : ''} · {purchased} comprada{purchased !== 1 ? 's' : ''} · {formatCurrency(totalGoals)} restante
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="ledger-card p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Meta</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nome do produto (ex: iPhone 16)"
              className="ledger-input w-full"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <input
                type="number"
                placeholder="Valor alvo"
                className="ledger-input w-full font-mono pl-7"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <button type="submit" className="ledger-btn-primary w-full text-center">
              Adicionar Meta
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Goals list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {goals.map(goal => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="ledger-card p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => ledger.toggleGoalPurchased(goal.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    goal.purchased
                      ? 'bg-success border-success text-success-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {goal.purchased && <Check size={14} />}
                </button>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${goal.purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {goal.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-mono text-sm font-semibold ${goal.purchased ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {formatCurrency(goal.targetValue)}
                </span>
                <button
                  onClick={() => ledger.removeGoal(goal.id)}
                  className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {goals.length === 0 && (
          <div className="ledger-card p-8 text-center">
            <Target size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione desejos de compra para acompanhar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
