import { useState } from 'react';
import { CreditCard, Plus, Trash2, X, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardBill } from '@/types/ledger';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';

interface Props { cards: CardBill[]; onAdd: () => void; onUpdate: (id: string, patch: Partial<CardBill>) => void; onEdit: (id: string, name: string, value: number, dueDay: number) => void; onRemove: (id: string) => void; }

export function CardBillsSection({ cards, onAdd, onUpdate, onEdit, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', value: 0, dueDay: '' });

  const startEdit = (card: CardBill) => { setEditingId(card.id); setEditForm({ name: card.name, value: card.value, dueDay: String(card.dueDay || 1) }); };
  const saveEdit = (id: string) => { onEdit(id, editForm.name, editForm.value, Number(editForm.dueDay) || 1); setEditingId(null); };

  const total = cards.reduce((acc, card) => acc + card.value, 0);

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground"><CreditCard size={18} className="text-muted-foreground" /> Faturas de Cartão</h2>
        <button type="button" onClick={onAdd} className="ledger-btn-outline flex items-center gap-1"><Plus size={14} /> Novo Cartão</button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {cards.map(card => {
            const isEditing = editingId === card.id;

            if (isEditing) {
              return (
                <motion.div key={card.id} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2"><input type="text" placeholder="Nome do Cartão" className="ledger-input w-full text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /><div className="flex gap-2"><CurrencyInput placeholder="Valor da Fatura" className="ledger-input w-full font-mono text-xs" value={editForm.value} onChange={val => setEditForm(f => ({ ...f, value: val }))} /><input type="number" placeholder="Venc." className="ledger-input w-16 text-xs text-center" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: e.target.value }))} /></div><div className="flex gap-2 mt-2"><button onClick={() => saveEdit(card.id)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button><button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button></div></motion.div>
              );
            }

            return (
              <motion.div key={card.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-4 flex items-center justify-center shrink-0">
                    <input type="checkbox" checked={card.paid} onChange={e => onUpdate(card.id, { paid: e.target.checked })} className="ledger-checkbox" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${card.paid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{card.name || 'Novo Cartão'}</span>
                    <span className="text-[10px] text-muted-foreground">Pagamento: dia {card.dueDay || 1}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(card.value || 0)}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button type="button" onClick={() => startEdit(card)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => onRemove(card.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {cards.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhum cartão cadastrado.</p>}
      </div>

      {cards.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">Total Faturas:</span>
          <span className="font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      )}
    </section>
  );
}