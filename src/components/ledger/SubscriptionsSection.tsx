import { useState } from 'react';
import { Tv, Plus, Trash2, X, CreditCard, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subscription, MonthData, Card } from '@/types/ledger';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  subscriptions: Subscription[];
  monthData: MonthData;
  cards: Card[];
  onAdd: (name: string, value: number, dueDay: number, paymentMethod: string) => void;
  onSoftDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onUpdateValue: (id: string, value: number) => void;
}

export function SubscriptionsSection({ subscriptions, monthData, cards, onAdd, onSoftDelete, onTogglePaid, onUpdateValue }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: 0, dueDay: '', paymentMethod: 'Pix' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    onAdd(form.name, form.value, Number(form.dueDay) || 1, form.paymentMethod);
    setForm({ name: '', value: 0, dueDay: '', paymentMethod: 'Pix' });
    setShowForm(false);
  };

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <Tv size={18} className="text-muted-foreground" />
          Assinaturas e Serviços
        </h2>
        <button type="button" onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} /> Adicionar
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="mb-4 p-4 bg-muted rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Assinatura</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <input type="text" placeholder="Nome (ex: Netflix)" className="ledger-input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={form.value} onChange={val => setForm(f => ({ ...f, value: val }))} />
              </div>
              <input type="number" placeholder="Vencimento" className="ledger-input w-full" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />
            </div>

            <select className="ledger-input w-full bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="Pix">Pix / Boleto (Debita do Saldo)</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>Cartão: {c.name || 'Sem nome'}</option>
              ))}
            </select>

            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {subscriptions.map(sub => {
            const isPaid = monthData.subscriptionPaidState[sub.id] || false;
            const currentValue = monthData.subscriptionValueOverrides[sub.id] ?? sub.value;
            const isPix = !sub.paymentMethod || sub.paymentMethod === 'Pix';
            const cardName = isPix ? 'Pix' : (cards.find(c => c.id === sub.paymentMethod)?.name || 'Cartão');

            return (
              <motion.div key={sub.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 group min-w-0">
                <input type="checkbox" checked={isPaid} onChange={() => onTogglePaid(sub.id)} className="ledger-checkbox shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className={`text-sm truncate ${isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sub.name}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {isPix ? <Banknote size={10} /> : <CreditCard size={10} />}
                    {cardName} (Venc. {sub.dueDay})
                  </span>
                </div>
                <div className="relative shrink-0 w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                  <CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={currentValue || 0} onChange={val => onUpdateValue(sub.id, val)} />
                </div>
                <button type="button" onClick={() => onSoftDelete(sub.id)} className="p-1.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><Trash2 size={14} /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {subscriptions.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhuma assinatura ativa.</p>}
      </div>
    </section>
  );
}