import { useState } from 'react';
import { ShoppingBag, Plus, Trash2, X, Banknote, CreditCard, Edit2, Check } from 'lucide-react';
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
  onEdit: (id: string, name: string, value: number, total: number, paymentMethod: string) => void;
  onRemove: (id: string) => void;
}

export function InstallmentsSection({ installments, monthKey, cards, getNumber, onAdd, onEdit, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: 0, total: '', paymentMethod: 'Pix' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', value: 0, total: '', paymentMethod: 'Pix' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value || !form.total) return;
    onAdd(form.name, form.value, Number(form.total), form.paymentMethod);
    setForm({ name: '', value: 0, total: '', paymentMethod: 'Pix' });
    setShowForm(false);
  };

  const startEdit = (inst: Installment) => {
    setEditingId(inst.id);
    setEditForm({ name: inst.name, value: inst.monthlyValue, total: String(inst.totalMonths), paymentMethod: inst.paymentMethod || 'Pix' });
  };

  const saveEdit = (id: string) => {
    onEdit(id, editForm.name, editForm.value, Number(editForm.total), editForm.paymentMethod);
    setEditingId(null);
  };

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-semibold flex items-center gap-2 text-foreground"><ShoppingBag size={18} className="text-muted-foreground" /> Compras Parceladas</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Apenas visualização — não afeta o saldo</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1"><Plus size={14} /> Nova Compra</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="mb-5 p-4 bg-muted rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Compra</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <input type="text" placeholder="Nome" className="ledger-input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={form.value} onChange={val => setForm(f => ({ ...f, value: val }))} />
              </div>
              <input type="number" placeholder="Nº parcelas" className="ledger-input w-full" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
            </div>
            <select className="ledger-input w-full bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="Pix">Pix / Boleto</option>
              {cards.map(c => <option key={c.id} value={c.id}>Cartão: {c.name || 'Sem nome'}</option>)}
            </select>
            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {installments.map(inst => {
            const isEditing = editingId === inst.id;
            const num = getNumber(inst);
            const isPix = !inst.paymentMethod || inst.paymentMethod === 'Pix';
            const cardName = isPix ? 'Pix' : (cards.find(c => c.id === inst.paymentMethod)?.name || 'Cartão');

            if (isEditing) {
              return (
                <motion.div key={inst.id} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                  <input type="text" className="ledger-input w-full text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  <div className="flex gap-2">
                    <CurrencyInput className="ledger-input w-full font-mono text-xs" value={editForm.value} onChange={val => setEditForm(f => ({ ...f, value: val }))} />
                    <input type="number" className="ledger-input w-20 text-xs text-center" value={editForm.total} onChange={e => setEditForm(f => ({ ...f, total: e.target.value }))} placeholder="Meses" />
                  </div>
                  <select className="ledger-input w-full text-xs bg-background" value={editForm.paymentMethod} onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="Pix">Pix / Boleto</option>
                    {cards.map(c => <option key={c.id} value={c.id}>Cartão: {c.name}</option>)}
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => saveEdit(inst.id)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div key={inst.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group">
                <div>
                  <p className="text-sm font-medium text-foreground">{inst.name}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-tight mt-0.5">
                    {isPix ? <Banknote size={10} /> : <CreditCard size={10} />}
                    {cardName} • Parcela {num}/{inst.totalMonths}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm font-semibold text-foreground mr-2">{formatCurrency(inst.monthlyValue)}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => startEdit(inst)} className="p-1 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => onRemove(inst.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
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