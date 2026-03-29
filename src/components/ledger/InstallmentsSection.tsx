import { useState } from 'react';
import { ShoppingBag, Plus, Trash2, X, Banknote, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Installment, Card } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  installments: Installment[];
  monthKey: string;
  cards: Card[];
  getNumber: (inst: Installment) => number;
  onAdd: (name: string, value: number, total: number, paymentMethod: string) => void;
  onRemove: (id: string) => void;
}

export function InstallmentsSection({ installments, monthKey, cards, getNumber, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: 0, total: '', paymentMethod: 'Pix' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value || !form.total) return;
    onAdd(form.name, form.value, Number(form.total), form.paymentMethod);
    setForm({ name: '', value: 0, total: '', paymentMethod: 'Pix' });
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
        <button type="button" onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} /> Nova Compra
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="mb-5 p-4 bg-muted rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Compra</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <input type="text" placeholder="Nome (ex: Geladeira)" className="ledger-input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={form.value} onChange={val => setForm(f => ({ ...f, value: val }))} />
              </div>
              <input type="number" placeholder="Nº parcelas" className="ledger-input w-full" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
            </div>

            <select className="ledger-input w-full bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="Pix">Pix / Boleto</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>Cartão: {c.name || 'Sem nome'}</option>
              ))}
            </select>

            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {installments.map(inst => {
            const num = getNumber(inst);
            const isPix = !inst.paymentMethod || inst.paymentMethod === 'Pix';
            const cardName = isPix ? 'Pix' : (cards.find(c => c.id === inst.paymentMethod)?.name || 'Cartão');

            return (
              <motion.div key={inst.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group">
                <div>
                  <p className="text-sm font-medium text-foreground">{inst.name}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-tight mt-0.5">
                    {isPix ? <Banknote size={10} /> : <CreditCard size={10} />}
                    {cardName} • Parcela {num}/{inst.totalMonths}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(inst.monthlyValue)}</span>
                  <button type="button" onClick={() => onRemove(inst.id)} className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {installments.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhuma compra parcelada ativa.</p>}
      </div>
    </section>
  );
}