import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, X, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LedgerEntry, BankAccount, Category } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';
import { BankAccountField } from './BankAccountField';
import { CategoryField } from './CategoryField';

interface Props {
  title: string;
  entries: LedgerEntry[];
  type: 'income' | 'expense';
  bankAccounts?: BankAccount[];
  onAddBankAccount?: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  categories?: Category[];
  onAddCategory?: (name: string, color?: string) => Category;
  onAddManual?: (date: string, description: string, value: number, paymentMethod: string, bankAccountId?: string, time?: string, categoryId?: string, observation?: string, paidByOthers?: boolean) => void;
  onRemoveEntry?: (id: string, source: string) => void;
  onEditEntry?: (id: string, source: string, date: string, desc: string, value: number) => void;
}

const parseCurrencyInput = (val: string) => {
  if (val.includes(',')) return Number(val.replace(/\./g, '').replace(',', '.'));
  return Number(val);
};

const PAYMENT_METHODS = ['Pix', 'Boleto', 'TED', 'Outros', 'Cartão'];

export function LedgerTable({ title, entries, type, bankAccounts = [], onAddBankAccount, categories = [], onAddCategory, onAddManual, onRemoveEntry, onEditEntry }: Props) {
  const total = entries.filter(e => !e.paidByOthers).reduce((a, c) => a + c.value, 0);
  const isIncome = type === 'income';
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({ date: '', description: '', value: '', paymentMethod: 'Pix', bankAccountId: '', time: '', categoryId: '', observation: '', paidByOthers: false });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', description: '', value: '' });

  const formatTextToComma = (raw: string) => {
    let val = raw.replace('.', ',');
    val = val.replace(/[^0-9,]/g, '');
    if ((val.match(/,/g) || []).length > 1) val = val.substring(0, val.lastIndexOf(','));
    return val;
  };

  const handleSubmit = () => {
    if (!form.date || !form.description || !form.value) return;
    const numericValue = parseCurrencyInput(form.value);
    if (isNaN(numericValue)) return;
    const isCard = form.paymentMethod === 'Cartão';
    
    onAddManual?.(
      form.date, form.description, numericValue, form.paymentMethod, 
      isCard ? undefined : form.bankAccountId, isCard ? undefined : form.time, 
      isIncome ? undefined : (form.categoryId || undefined),
      form.observation, form.paidByOthers
    );
    
    setForm({ date: '', description: '', value: '', paymentMethod: 'Pix', bankAccountId: '', time: '', categoryId: '', observation: '', paidByOthers: false });
    setShowForm(false);
  };

  const startEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setEditForm({ date: entry.date, description: entry.description, value: String(entry.value).replace('.', ',') });
  };

  const saveEdit = (entry: LedgerEntry) => {
    const numericValue = parseCurrencyInput(editForm.value);
    if (isNaN(numericValue)) return;
    onEditEntry?.(entry.id, entry.source, editForm.date, editForm.description, numericValue);
    setEditingId(null);
  };

  return (
    <section className="ledger-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          {isIncome ? <ArrowDownLeft size={18} className="text-success" /> : <ArrowUpRight size={18} className="text-destructive" />}
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(total)}
          </span>
          {onAddManual && (
            <button onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1 text-xs">
              <Plus size={12} /> Nova
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-5 border-b border-border bg-muted/30">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-foreground">{isIncome ? 'Adicionar Nova Entrada' : 'Adicionar Nova Saída'}</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input type="date" className="ledger-input w-full" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              <input type="text" placeholder="Descrição" className="ledger-input w-full sm:col-span-2" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input type="text" inputMode="decimal" placeholder="0,00" className="ledger-input w-full font-mono pl-8" value={form.value} onChange={e => setForm(f => ({ ...f, value: formatTextToComma(e.target.value) }))} required />
              </div>
            </div>

            <div className={`grid grid-cols-1 ${form.paymentMethod !== 'Cartão' ? 'sm:grid-cols-2' : ''} gap-4 mt-4`}>
              <select className="ledger-input w-full min-w-0 bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
              </select>
              {form.paymentMethod !== 'Cartão' && (
                <input type="time" className="ledger-input w-full min-w-0" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} title="Horário" />
              )}
            </div>

            {(form.paymentMethod !== 'Cartão' && onAddBankAccount) || (!isIncome && onAddCategory) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {form.paymentMethod !== 'Cartão' && onAddBankAccount && (
                  <div className="min-w-0">
                    <BankAccountField value={form.bankAccountId} onChange={bankAccountId => setForm(f => ({ ...f, bankAccountId }))} bankAccounts={bankAccounts} onAddBankAccount={onAddBankAccount} label="Banco" />
                  </div>
                )}
                {!isIncome && onAddCategory && (
                  <div className="min-w-0">
                    <CategoryField value={form.categoryId} onChange={categoryId => setForm(f => ({ ...f, categoryId }))} categories={categories} onAddCategory={onAddCategory} />
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-border/50 pt-4">
              <input 
                type="text" 
                placeholder="Observação detalhada (opcional)" 
                className="ledger-input w-full min-w-0" 
                value={form.observation} 
                onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} 
              />
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none bg-background border border-border px-3 py-2 rounded-md hover:border-primary/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary" 
                  checked={form.paidByOthers} 
                  onChange={e => setForm(f => ({ ...f, paidByOthers: e.target.checked }))} 
                />
                Pago por terceiros (não afeta saldo)
              </label>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={handleSubmit} className="ledger-btn-primary px-6 py-2 text-sm shadow-sm">Confirmar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-14 text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
              <th className="w-14 text-center px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map(entry => {
                const isEditing = editingId === entry.id;
                
                const cat = categories?.find(c => c.id === entry.categoryId);
                const bank = bankAccounts?.find(b => b.id === entry.bankAccountId);

                return isEditing ? (
                  <tr key={`edit-${entry.id}`} className="border-b border-border bg-muted/20">
                    <td className="px-2 py-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="ledger-input w-full text-xs px-2 py-1" /></td>
                    <td className="px-2 py-2"><input type="text" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="ledger-input w-full text-xs px-2 py-1" /></td>
                    <td className="px-2 py-2"><input type="text" inputMode="decimal" value={editForm.value} onChange={e => setEditForm({...editForm, value: formatTextToComma(e.target.value)})} className="ledger-input w-full text-xs px-2 py-1 text-right font-mono" /></td>
                    <td className="px-2 py-2 flex gap-1 justify-center">
                      <button onClick={() => saveEdit(entry)} className="p-1.5 text-success hover:bg-success/20 rounded transition-colors"><Check size={14}/></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"><X size={14}/></button>
                    </td>
                  </tr>
                ) : (
                  <motion.tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap align-top">
                      <div className="flex flex-col leading-tight mt-0.5">
                        <span>{entry.date.slice(5).split('-').reverse().join('/')}</span>
                        {entry.time && <span className="text-[10px] text-muted-foreground/60">{entry.time}</span>}
                      </div>
                    </td>
                    
                    <td className="px-3 py-3 text-foreground">
                      <div className="flex flex-col gap-1">
                        {/* Linha principal: Apenas a descrição e o selo de terceiros */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium ${entry.paidByOthers ? 'line-through text-muted-foreground' : ''}`}>
                            {entry.description}
                          </span>
                          
                          {entry.paidByOthers && (
                            <span className="text-[10px] bg-secondary/50 text-muted-foreground px-1.5 py-0.5 rounded font-medium flex items-center gap-1" title="Valor não contabilizado no saldo final">
                              🤝 Terceiros
                            </span>
                          )}
                        </div>
                        
                        {/* Linha secundária: Categoria, Banco e Observação agrupados */}
                        {(cat || bank || entry.observation) && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground pt-1">
                            {cat && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-medium bg-muted/40 border border-border text-muted-foreground whitespace-nowrap" title={cat.name}>
                                <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cat.color || '#ccc' }} />
                                {cat.name}
                              </span>
                            )}
                            {bank && <span className="px-1.5 py-0.5 bg-background border border-border rounded shadow-sm font-medium">{bank.name}</span>}
                            {entry.observation && <span className="italic text-muted-foreground/80 truncate max-w-[200px]" title={entry.observation}>Obs: {entry.observation}</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className={`px-3 py-3 text-right font-mono font-semibold whitespace-nowrap align-top pt-3.5 ${entry.paidByOthers ? 'text-muted-foreground opacity-50' : (isIncome ? 'text-success' : 'text-destructive')}`}>
                      {isIncome ? '+' : '-'} {formatCurrency(entry.value)}
                    </td>

                    <td className="px-2 py-3 align-top pt-3">
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(entry)} className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Editar"><Edit2 size={14} /></button>
                        <button onClick={() => onRemoveEntry?.(entry.id, entry.source)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Apagar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {entries.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-muted-foreground italic">Nenhum registro encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}