import { useState } from 'react';
import { TrendingUp, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Investment, LedgerData } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';

interface Props {
  investments: Investment[];
  allData: LedgerData;
  onAdd: (type: 'CDB' | 'Bitcoin', description: string, value: number) => void;
  onRemove: (id: string) => void;
}

export function InvestmentsSection({ investments, allData, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [form, setForm] = useState({ type: 'CDB' as 'CDB' | 'Bitcoin', description: '', value: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value) return;
    onAdd(form.type, form.description, Number(form.value));
    setForm({ type: 'CDB', description: '', value: '' });
    setShowForm(false);
  };

  // Calculate accumulated totals across all months
  const allInvestments = Object.values(allData.monthlyData).flatMap(m => m.investments || []);
  const totalCDB = allInvestments.filter(i => i.type === 'CDB').reduce((a, c) => a + Number(c.value), 0);
  const totalBitcoin = allInvestments.filter(i => i.type === 'Bitcoin').reduce((a, c) => a + Number(c.value), 0);

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp size={18} className="text-muted-foreground" />
          Investimentos
        </h2>
        <button onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Novo Aporte
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
              <span className="text-sm font-semibold text-foreground">Novo Aporte</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'CDB' }))}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${form.type === 'CDB' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}
              >
                CDB
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'Bitcoin' }))}
                className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${form.type === 'Bitcoin' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}
              >
                Bitcoin
              </button>
            </div>
            <input
              type="text"
              placeholder="Descrição (opcional)"
              className="ledger-input w-full"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <input
                type="number"
                placeholder="Valor do aporte"
                className="ledger-input w-full font-mono pl-7"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <button type="submit" className="ledger-btn-primary w-full text-center">
              Confirmar
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Current month investments list */}
      <div className="space-y-2 mb-4">
        <AnimatePresence initial={false}>
          {investments.map(inv => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${inv.type === 'CDB' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'}`}>
                  {inv.type}
                </span>
                <span className="text-sm text-foreground">{inv.description || inv.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatCurrency(inv.value)}
                </span>
                <button
                  onClick={() => onRemove(inv.id)}
                  className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {investments.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Nenhum aporte neste mês.</p>
        )}
      </div>

      {/* Evolution toggle */}
      <button
        onClick={() => setShowEvolution(v => !v)}
        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 border border-border rounded-lg transition-colors"
      >
        {showEvolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showEvolution ? 'Ocultar' : 'Mostrar'} Evolução
      </button>

      <AnimatePresence>
        {showEvolution && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-muted rounded-lg border border-border space-y-3"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Acumulado</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">CDB</p>
                <p className="font-mono font-bold text-lg text-primary">{formatCurrency(totalCDB)}</p>
              </div>
              <div className="p-3 bg-card rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Bitcoin</p>
                <p className="font-mono font-bold text-lg text-success">{formatCurrency(totalBitcoin)}</p>
              </div>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Total Investido</p>
              <p className="font-mono font-bold text-xl text-foreground">{formatCurrency(totalCDB + totalBitcoin)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
