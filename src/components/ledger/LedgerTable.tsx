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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
              <th className="w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 border-b border-border bg-muted/50 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">
                        {isIncome ? 'Nova Entrada' : 'Nova Saída'}
                      </span>
                      <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="date" className="ledger-input w-full" value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                      <input type="text" placeholder="Descrição" className="ledger-input w-full" value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                        <input type="number" placeholder="Valor" className="ledger-input w-full font-mono pl-7" value={form.value}
                          onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
                      </div>
                    </div>
                    {/* O onClick aqui agora é garantido de funcionar */}
                    <button type="button" onClick={handleSubmit} className="ledger-btn-primary w-full text-center">Confirmar</button>
                  </motion.div>
                )}
              </AnimatePresence>
          </tbody>
        </table>
      </div>
    </section>
  );
}