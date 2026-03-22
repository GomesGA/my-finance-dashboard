import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  onAdd: (type: 'CDB' | 'Bitcoin', description: string, value: number, action: 'deposit' | 'withdraw', date: string) => void;
}

export function InvestmentWidget({ onAdd }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'CDB' as 'CDB' | 'Bitcoin',
    description: '',
    value: 0,
    action: 'deposit' as 'deposit' | 'withdraw',
    date: new Date().toISOString().split('T')[0], // Puxa a data de hoje automaticamente
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value || form.value <= 0 || !form.date) return;
    onAdd(form.type, form.description, form.value, form.action, form.date);
    setForm({ type: 'CDB', description: '', value: 0, action: 'deposit', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp size={18} className="text-muted-foreground" />
          Investimentos
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setForm(f => ({ ...f, action: 'deposit' })); setShowForm(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
        >
          <ArrowUpRight size={14} className="text-destructive" />
          Aportar
        </button>
        <button
          type="button"
          onClick={() => { setForm(f => ({ ...f, action: 'withdraw' })); setShowForm(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
        >
          <ArrowDownLeft size={14} className="text-success" />
          Resgatar
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="p-4 bg-muted rounded-lg border border-border space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">
                {form.action === 'deposit' ? 'Novo Aporte' : 'Novo Resgate'}
              </span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {(['CDB', 'Bitcoin'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                    form.type === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                className="ledger-input w-36 shrink-0 text-xs px-2"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                className="ledger-input w-full"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
              <CurrencyInput
                placeholder="0,00"
                className="ledger-input w-full font-mono pl-7"
                value={form.value}
                onChange={val => setForm(f => ({ ...f, value: val }))}
              />
            </div>
            
            <button type="submit" className="ledger-btn-primary w-full text-center">
              Confirmar
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}