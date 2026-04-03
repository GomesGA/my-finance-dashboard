import { useState } from 'react';
import { Tv, Plus, Trash2, X, CreditCard, Edit2, Check, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subscription, MonthData, Card } from '@/types/ledger';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';

interface Props {
  subscriptions: Subscription[]; monthData: MonthData; cards: Card[];
  onAdd: (name: string, value: number, dueDay: number, paymentMethod: string) => void;
  onEdit: (id: string, name: string, value: number, dueDay: number, paymentMethod: string) => void;
  onSoftDelete: (id: string) => void; onTogglePaid: (id: string) => void; onUpdateValue: (id: string, value: number) => void;
}

export function SubscriptionsSection({ subscriptions, monthData, cards, onAdd, onEdit, onSoftDelete, onTogglePaid }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: 0, dueDay: '', paymentMethod: 'Pix' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', value: 0, dueDay: '', paymentMethod: 'Pix' });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!form.name || !form.value) return; onAdd(form.name, form.value, Number(form.dueDay) || 1, form.paymentMethod); setForm({ name: '', value: 0, dueDay: '', paymentMethod: 'Pix' }); setShowForm(false); };
  const startEdit = (sub: Subscription) => { setEditingId(sub.id); setEditForm({ name: sub.name, value: sub.value, dueDay: String(sub.dueDay || 1), paymentMethod: sub.paymentMethod || 'Pix' }); };
  const saveEdit = (id: string) => { onEdit(id, editForm.name, editForm.value, Number(editForm.dueDay) || 1, editForm.paymentMethod); setEditingId(null); };

  return (
    <section className="ledger-card p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground"><Tv size={18} className="text-muted-foreground" /> Assinaturas e Serviços</h2>
        <button type="button" onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1"><Plus size={14} /> Adicionar</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="mb-4 p-4 bg-muted rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm font-semibold text-foreground">Nova Assinatura</span><button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
            <input type="text" placeholder="Nome (ex: Netflix)" className="ledger-input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <select className="ledger-input w-full bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}><option value="Pix">Pix / Boleto (Debita do Saldo)</option><option value="Free">Gratuito / Emprestado / Incluso</option>{cards.map(c => <option key={c.id} value={c.id}>Cartão: {c.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-3">
              <div className={`relative ${form.paymentMethod !== 'Pix' ? 'col-span-2' : ''}`}><span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span><CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={form.value} onChange={val => setForm(f => ({ ...f, value: val }))} /></div>
              {form.paymentMethod === 'Pix' && <input type="number" placeholder="Dia do Pag." className="ledger-input w-full" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />}
            </div>
            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-2 flex-1">
        <AnimatePresence initial={false}>
          {subscriptions.map(sub => {
            const isEditing = editingId === sub.id;
            const isPaid = monthData.subscriptionPaidState[sub.id] || false;
            const currentValue = monthData.subscriptionValueOverrides[sub.id] ?? sub.value;
            const isFree = sub.paymentMethod === 'Free';
            const isPix = !sub.paymentMethod || sub.paymentMethod === 'Pix';
            const cardName = isFree ? 'Incluso' : (isPix ? 'Pix' : (cards.find(c => c.id === sub.paymentMethod)?.name || 'Cartão'));

            if (isEditing) {
              return (
                <motion.div key={sub.id} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2"><input type="text" className="ledger-input w-full text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /><select className="ledger-input w-full text-xs bg-background" value={editForm.paymentMethod} onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}><option value="Pix">Pix / Boleto</option><option value="Free">Gratuito / Emprestado / Incluso</option>{cards.map(c => <option key={c.id} value={c.id}>Cartão: {c.name}</option>)}</select><div className="flex gap-2"><CurrencyInput className="ledger-input w-full font-mono text-xs" value={editForm.value} onChange={val => setEditForm(f => ({ ...f, value: val }))} />{editForm.paymentMethod === 'Pix' && <input type="number" className="ledger-input w-16 text-xs text-center" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: e.target.value }))} placeholder="Dia" />}</div><div className="flex gap-2 mt-2"><button onClick={() => saveEdit(sub.id)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button><button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button></div></motion.div>
              );
            }

            return (
              <motion.div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-4 flex items-center justify-center shrink-0">
                    {isPix ? <input type="checkbox" checked={isPaid} onChange={() => onTogglePaid(sub.id)} className="ledger-checkbox" /> : (isFree ? <Gift size={14} className="text-muted-foreground/50" /> : <CreditCard size={14} className="text-muted-foreground/50" />)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${(isPaid && isPix) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sub.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{isPix && `Pagamento: dia ${sub.dueDay} • `}{cardName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(currentValue || 0)}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button type="button" onClick={() => startEdit(sub)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => onSoftDelete(sub.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {subscriptions.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhuma assinatura ativa.</p>}
      </div>
    </section>
  );
}