import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, X, Trash2, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/format';
import { CurrencyInput } from '@/components/CurrencyInput';
import type { useLedgerData } from '@/hooks/useLedgerData';
import type { Investment } from '@/types/ledger';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function InvestmentsTab({ ledger }: Props) {
  const allInvestments = ledger.allInvestments;
  
  // Estados para o formulário de novo rendimento
  const [showYieldForm, setShowYieldForm] = useState(false);
  const [yieldDirection, setYieldDirection] = useState<'positive' | 'negative'>('positive');
  const [yieldForm, setYieldForm] = useState({ type: 'CDB' as 'CDB' | 'Bitcoin', value: 0 });

  // Estados para edição de movimentações existentes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', value: 0 });

  const handleYieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (yieldForm.value <= 0) return;
    const finalValue = yieldDirection === 'positive' ? yieldForm.value : -yieldForm.value;
    const desc = yieldDirection === 'positive' ? 'Lucro do mês' : 'Desvalorização';
    ledger.addInvestment(yieldForm.type, desc, finalValue, 'yield', `${ledger.monthKey}-01`);
    setYieldForm({ type: 'CDB', value: 0 });
    setYieldDirection('positive');
    setShowYieldForm(false);
  };

  const startEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setEditForm({ description: inv.description || '', value: Math.abs(inv.value) });
  };

  const saveEdit = (inv: Investment) => {
    // Mantém o sinal original do valor (positivo ou negativo)
    const finalValue = inv.value >= 0 ? editForm.value : -editForm.value;
    ledger.editLedgerEntry(`inv-${inv.id}`, `investment-${inv.action}`, inv.date, editForm.description, finalValue);
    setEditingId(null);
  };

  const totals = useMemo(() => {
    const cdb = allInvestments
      .filter(i => i.type === 'CDB')
      .reduce((a, c) => a + ((c.action === 'deposit' || c.action === 'yield') ? Number(c.value) : -Number(c.value)), 0);
    const btc = allInvestments
      .filter(i => i.type === 'Bitcoin')
      .reduce((a, c) => a + ((c.action === 'deposit' || c.action === 'yield') ? Number(c.value) : -Number(c.value)), 0);
    return { cdb: Math.max(0, cdb), btc: Math.max(0, btc), total: Math.max(0, cdb) + Math.max(0, btc) };
  }, [allInvestments]);

  const chartData = useMemo(() => {
    const monthMap: Record<string, { cdb: number; btc: number }> = {};
    allInvestments.forEach(inv => {
      if (!monthMap[inv.date]) monthMap[inv.date] = { cdb: 0, btc: 0 };
      const delta = (inv.action === 'deposit' || inv.action === 'yield') ? Number(inv.value) : -Number(inv.value);
      if (inv.type === 'CDB') monthMap[inv.date].cdb += delta;
      else monthMap[inv.date].btc += delta;
    });
    const sortedMonths = Object.keys(monthMap).sort();
    let accCdb = 0; let accBtc = 0;
    return sortedMonths.map(month => {
      accCdb += monthMap[month].cdb;
      accBtc += monthMap[month].btc;
      return { month, CDB: Math.max(0, accCdb), Bitcoin: Math.max(0, accBtc), Total: Math.max(0, accCdb) + Math.max(0, accBtc) };
    });
  }, [allInvestments]);

  const monthInvestments = ledger.currentMonthData.investments || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
         <button onClick={() => setShowYieldForm(true)} className="ledger-btn-outline flex items-center gap-2 hover:border-blue-500/50 hover:text-blue-500 bg-card">
           <RefreshCw size={14} /> Ajustar Rentabilidade
         </button>
      </div>

      <AnimatePresence>
        {showYieldForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleYieldSubmit} className="p-5 bg-muted rounded-lg border border-border space-y-4 overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                 <RefreshCw size={16} className="text-blue-500" /> Atualizar Rentabilidade do Mês
              </span>
              <button type="button" onClick={() => setShowYieldForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setYieldDirection('positive')} className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${yieldDirection === 'positive' ? 'bg-blue-500 text-white border-blue-500' : 'border-border text-foreground hover:bg-muted'}`}>Lucro (+)</button>
              <button type="button" onClick={() => setYieldDirection('negative')} className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${yieldDirection === 'negative' ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-foreground hover:bg-muted'}`}>Desvalorização (-)</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select className="ledger-input sm:w-1/3 bg-background" value={yieldForm.type} onChange={e => setYieldForm(f => ({ ...f, type: e.target.value as 'CDB' | 'Bitcoin' }))}>
                <option value="CDB">CDB</option>
                <option value="Bitcoin">Bitcoin</option>
              </select>
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <CurrencyInput placeholder="0,00" className="ledger-input w-full font-mono pl-7" value={yieldForm.value} onChange={val => setYieldForm(f => ({ ...f, value: val }))} />
              </div>
              <button type="submit" className="ledger-btn-primary px-8">Salvar</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Portfolio summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'CDB', value: totals.cdb, color: 'text-primary' },
          { label: 'Bitcoin', value: totals.btc, color: 'text-success' },
          { label: 'Total Investido', value: totals.total, color: 'text-foreground' },
        ].map(item => (
          <motion.div key={item.label} className="ledger-card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
            <p className={`font-mono font-bold text-xl ${item.color}`}>{formatCurrency(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <section className="ledger-card p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-muted-foreground" /> Evolução do Patrimônio
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="CDB" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bitcoin" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Faça aportes no Dashboard para visualizar a evolução.</div>
        )}
      </section>

      {/* Monthly movements with Edit/Delete */}
      <section className="ledger-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Movimentações do Mês</h2>
        </div>
        <div className="divide-y divide-border">
          {monthInvestments.map((inv: Investment) => {
            const isEditing = editingId === inv.id;
            const isLoss = inv.action === 'yield' && inv.value < 0;
            const isProfit = inv.action === 'yield' && inv.value >= 0;

            if (isEditing) {
              return (
                <div key={inv.id} className="p-4 bg-muted/30 space-y-3">
                  <div className="flex gap-2">
                    <input type="text" className="ledger-input flex-1 text-xs" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" />
                    <div className="relative w-32">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <CurrencyInput className="ledger-input w-full font-mono text-xs pl-7" value={editForm.value} onChange={val => setEditForm(f => ({ ...f, value: val }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(inv)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3">
                  {inv.action === 'deposit' ? (
                    <div className="p-2 bg-destructive/10 rounded-full"><ArrowUpRight size={14} className="text-destructive" /></div>
                  ) : inv.action === 'withdraw' ? (
                    <div className="p-2 bg-success/10 rounded-full"><ArrowDownLeft size={14} className="text-success" /></div>
                  ) : isProfit ? (
                    <div className="p-2 bg-blue-500/10 rounded-full"><TrendingUp size={14} className="text-blue-500" /></div>
                  ) : (
                    <div className="p-2 bg-orange-500/10 rounded-full"><TrendingDown size={14} className="text-orange-500" /></div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.description || inv.type}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {inv.type} · {inv.action === 'deposit' ? 'Aporte' : inv.action === 'withdraw' ? 'Resgate' : (isProfit ? 'Lucro' : 'Desvalorização')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-sm font-bold ${inv.action === 'withdraw' ? 'text-success' : inv.action === 'deposit' ? 'text-destructive' : (isProfit ? 'text-blue-500' : 'text-orange-500')}`}>
                    {inv.action === 'deposit' ? '-' : inv.action === 'withdraw' ? '+' : (isProfit ? '+' : '-')} {formatCurrency(Math.abs(inv.value))}
                  </span>
                  {/* Botões de Ação que aparecem no Hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(inv)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                    <button onClick={() => ledger.removeLedgerEntry(`inv-${inv.id}`, `investment-${inv.action}`)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {monthInvestments.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground italic">Nenhuma movimentação neste mês.</p>
          )}
        </div>
      </section>
    </div>
  );
}