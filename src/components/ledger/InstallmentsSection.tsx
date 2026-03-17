import { useState } from 'react';
import { ShoppingBag, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Installment } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';

interface Props {
  installments: Installment[];
  monthKey: string;
  getNumber: (inst: Installment) => number;
  onAdd: (name: string, value: number, total: number) => void;
  onRemove: (id: string) => void;
}

export function InstallmentsSection({ installments, monthKey, getNumber, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: '', total: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value || !form.total) return;
    onAdd(form.name, Number(form.value), Number(form.total));
    setForm({ name: '', value: '', total: '' });
    setShowForm(false);
  };

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-semibold flex items-center gap-2 text-foreground">
            <ShoppingBag size={18} className="text-muted-foreground" />
            Compras Parceladas
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Apenas visualização — não afeta o saldo</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Nova Compra
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-5 p-4 bg-muted rounded-lg border border-border space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Compra Parcelada</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nome da compra (ex: Geladeira)"
              className="ledger-input w-full"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input type="number" placeholder="Valor da parcela" className="ledger-input w-full font-mono pl-7"
                  value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <input type="number" placeholder="Nº de parcelas" className="ledger-input w-full"
                value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
            </div>
            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {installments.map(inst => {
            const num = getNumber(inst);
            return (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{inst.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                    Parcela {num} de {inst.totalMonths}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {formatCurrency(inst.monthlyValue)}
                  </span>
                  <button onClick={() => onRemove(inst.id)}
                    className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {installments.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Nenhuma compra parcelada ativa neste mês.</p>
        )}
      </div>
    </section>
  );
}
