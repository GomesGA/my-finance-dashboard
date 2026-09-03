import { useState } from 'react';
import { Repeat, Plus, Trash2, X, Edit2, Check, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecurringExpense, MonthData, BankAccount, Category } from '@/types/ledger';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';
import { PaymentModal } from './PaymentModal';
import { CategoryField } from './CategoryField';

interface Props {
  recurring: RecurringExpense[]; monthData: MonthData; bankAccounts: BankAccount[]; categories: Category[];
  onAdd: (name: string, value: number, dueDay: number, categoryId?: string) => void;
  onEdit: (id: string, name: string, dueDay: number, categoryId?: string) => void;
  onSoftDelete: (id: string) => void;
  onPay: (id: string, bankAccountId: string, paidAtIso: string) => void;
  onUnpay: (id: string) => void;
  onUpdateValue: (id: string, value: number) => void;
  onToggleActive: (id: string) => void;
  onAddBankAccount: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  onAddCategory: (name: string, color?: string) => Category;
}

export function RecurringExpensesSection({ recurring, monthData, bankAccounts, categories, onAdd, onEdit, onSoftDelete, onPay, onUnpay, onUpdateValue, onToggleActive, onAddBankAccount, onAddCategory }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: 0, dueDay: '', categoryId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', dueDay: '', categoryId: '' });
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!form.name || !form.value) return; onAdd(form.name, form.value, Number(form.dueDay) || 1, form.categoryId || undefined); setForm({ name: '', value: 0, dueDay: '', categoryId: '' }); setShowForm(false); };
  const startEdit = (re: RecurringExpense) => { setEditingId(re.id); setEditForm({ name: re.name, dueDay: String(re.dueDay), categoryId: re.categoryId || '' }); };
  const saveEdit = (id: string) => { onEdit(id, editForm.name, Number(editForm.dueDay) || 1, editForm.categoryId || undefined); setEditingId(null); };

  const total = recurring.reduce((acc, re) => {
    if (monthData.recurringActiveState?.[re.id] === false) return acc;
    return acc + (monthData.recurringValueOverrides[re.id] ?? 0);
  }, 0);

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground"><Repeat size={18} className="text-muted-foreground" /> Despesas Recorrentes</h2>
        <button type="button" onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1"><Plus size={14} /> Adicionar</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="mb-4 p-4 bg-muted rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm font-semibold text-foreground">Nova Despesa Fixa</span><button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
            <input type="text" placeholder="Nome (ex: Aluguel)" className="ledger-input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <div className="grid grid-cols-2 gap-3"><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span><CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={form.value} onChange={val => setForm(f => ({ ...f, value: val }))} /></div><input type="number" placeholder="Pagamento" className="ledger-input w-full" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} /></div>
            <CategoryField value={form.categoryId} onChange={categoryId => setForm(f => ({ ...f, categoryId }))} categories={categories} onAddCategory={onAddCategory} />
            <button type="submit" className="ledger-btn-primary w-full text-center">Confirmar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {recurring.map(re => {
            const isEditing = editingId === re.id;
            const isPaid = monthData.recurringPaidState[re.id] || false;
            const isActive = monthData.recurringActiveState?.[re.id] ?? true;
            const currentValue = monthData.recurringValueOverrides[re.id] ?? 0;
            const category = categories.find(c => c.id === re.categoryId);

            if (isEditing) {
              return (
                <motion.div key={re.id} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                  <input type="text" className="ledger-input w-full text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  <input type="number" className="ledger-input w-20 text-xs text-center" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: e.target.value }))} placeholder="Dia" />
                  <CategoryField value={editForm.categoryId} onChange={categoryId => setEditForm(f => ({ ...f, categoryId }))} categories={categories} onAddCategory={onAddCategory} label="" />
                  <div className="flex gap-2 mt-2"><button onClick={() => saveEdit(re.id)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button><button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button></div>
                </motion.div>
              );
            }

            if (!isActive) {
              return (
                <motion.div key={re.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-dashed border-border group mb-2 opacity-60">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate text-muted-foreground">{re.name}</span>
                    <span className="text-[10px] text-muted-foreground italic">Pausada neste mês</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => onToggleActive(re.id)} className="ledger-btn-outline flex items-center gap-1 text-xs py-1 px-2"><Play size={12} /> Reativar</button>
                    <button type="button" onClick={() => onSoftDelete(re.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div key={re.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-4 flex items-center justify-center shrink-0">
                    <input type="checkbox" checked={isPaid} onChange={() => isPaid ? onUnpay(re.id) : setPayingId(re.id)} className="ledger-checkbox" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{re.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      Vencimento: dia {re.dueDay}
                      {category && <span className="flex items-center gap-1">· <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <div className="relative w-24">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">R$</span>
                    <CurrencyInput className="ledger-input w-full font-mono text-xs pl-5 py-1" value={currentValue} onChange={val => onUpdateValue(re.id, val)} />
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button type="button" onClick={() => onToggleActive(re.id)} className="p-1.5 text-muted-foreground hover:text-primary" title="Pausar este mês"><Pause size={14} /></button>
                    <button type="button" onClick={() => startEdit(re)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => onSoftDelete(re.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {recurring.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhuma despesa recorrente ativa.</p>}
      </div>

      {recurring.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">Total Fixo:</span>
          <span className="font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      )}

      <PaymentModal
        open={!!payingId}
        onClose={() => setPayingId(null)}
        onConfirm={(bankAccountId, paidAtIso) => payingId && onPay(payingId, bankAccountId, paidAtIso)}
        bankAccounts={bankAccounts}
        onAddBankAccount={onAddBankAccount}
      />
    </section>
  );
}
