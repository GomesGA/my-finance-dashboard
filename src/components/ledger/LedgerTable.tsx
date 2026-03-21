import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, X, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LedgerEntry } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';

interface Props {
  title: string;
  entries: LedgerEntry[];
  type: 'income' | 'expense';
  onAddManual?: (date: string, description: string, value: number) => void;
  onRemoveEntry?: (id: string, source: string) => void;
  onEditEntry?: (id: string, source: string, date: string, desc: string, value: number) => void;
}

export function LedgerTable({ title, entries, type, onAddManual, onRemoveEntry, onEditEntry }: Props) {
  const total = entries.reduce((a, c) => a + c.value, 0);
  const isIncome = type === 'income';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', description: '', value: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', description: '', value: '' });

  const handleSubmit = () => {
    if (!form.date || !form.description || !form.value) return;
    onAddManual?.(form.date, form.description, Number(form.value));
    setForm({ date: '', description: '', value: '' });
    setShowForm(false);
  };

  const startEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setEditForm({ date: entry.date, description: entry.description, value: String(entry.value) });
  };

  const saveEdit = (entry: LedgerEntry) => {
    onEditEntry?.(entry.id, entry.source, editForm.date, editForm.description, Number(editForm.value));
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 border-b border-border bg-muted/30"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-foreground">
                {isIncome ? 'Adicionar Nova Entrada' : 'Adicionar Nova Saída'}
              </span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {/* Novo Layout do Formulário: Grid adaptável e botão elegante */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input type="date" className="ledger-input w-full" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              
              <input type="text" placeholder="Descrição" className="ledger-input w-full sm:col-span-2" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input type="number" placeholder="Valor" className="ledger-input w-full font-mono pl-8" value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button type="button" onClick={handleSubmit} className="ledger-btn-primary px-6 py-2 text-sm shadow-sm">
                Confirmar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
              <th className="w-16 text-center px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map(entry => {
                const isEditing = editingId === entry.id;
                return isEditing ? (
                  <tr key={`edit-${entry.id}`} className="border-b border-border bg-muted/20">
                    <td className="px-2 py-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="ledger-input w-full text-xs px-2 py-1" /></td>
                    <td className="px-2 py-2"><input type="text" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="ledger-input w-full text-xs px-2 py-1" /></td>
                    <td className="px-2 py-2"><input type="number" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} className="ledger-input w-full text-xs px-2 py-1 text-right font-mono" /></td>
                    <td className="px-2 py-2 flex gap-1 justify-center">
                      <button onClick={() => saveEdit(entry)} className="p-1.5 text-success hover:bg-success/20 rounded transition-colors"><Check size={14}/></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"><X size={14}/></button>
                    </td>
                  </tr>
                ) : (
                  <motion.tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{entry.date.split('-').reverse().join('/')}</td>
                    <td className="px-5 py-3 text-foreground">{entry.description}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${isIncome ? 'text-success' : 'text-destructive'}`}>
                      {isIncome ? '+' : '-'} {formatCurrency(entry.value)}
                    </td>
                    <td className="px-2 py-3">
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
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-xs text-muted-foreground italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}