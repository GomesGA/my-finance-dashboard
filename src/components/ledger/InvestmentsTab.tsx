import { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, RefreshCw, X } from 'lucide-react';
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
  
  // Controle do Formulário de Rendimento
  const [showYieldForm, setShowYieldForm] = useState(false);
  const [yieldForm, setYieldForm] = useState({ type: 'CDB' as 'CDB' | 'Bitcoin', value: 0 });

  const handleYieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (yieldForm.value <= 0) return;
    // Lança automaticamente no dia 1º do mês que você estiver visualizando
    ledger.addInvestment(yieldForm.type, 'Rendimento mensal', yieldForm.value, 'yield', `${ledger.monthKey}-01`);
    setYieldForm({ type: 'CDB', value: 0 });
    setShowYieldForm(false);
  };

  // Calcula os totais por tipo (Aportes + Rendimentos - Resgates)
  const totals = useMemo(() => {
    const cdb = allInvestments
      .filter(i => i.type === 'CDB')
      .reduce((a, c) => a + ((c.action === 'deposit' || c.action === 'yield') ? Number(c.value) : -Number(c.value)), 0);
    const btc = allInvestments
      .filter(i => i.type === 'Bitcoin')
      .reduce((a, c) => a + ((c.action === 'deposit' || c.action === 'yield') ? Number(c.value) : -Number(c.value)), 0);
    return { cdb: Math.max(0, cdb), btc: Math.max(0, btc), total: Math.max(0, cdb) + Math.max(0, btc) };
  }, [allInvestments]);

  // Monta os dados do gráfico
  const chartData = useMemo(() => {
    const monthMap: Record<string, { cdb: number; btc: number }> = {};

    allInvestments.forEach(inv => {
      if (!monthMap[inv.date]) monthMap[inv.date] = { cdb: 0, btc: 0 };
      const delta = (inv.action === 'deposit' || inv.action === 'yield') ? Number(inv.value) : -Number(inv.value);
      if (inv.type === 'CDB') monthMap[inv.date].cdb += delta;
      else monthMap[inv.date].btc += delta;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    let accCdb = 0;
    let accBtc = 0;

    return sortedMonths.map(month => {
      accCdb += monthMap[month].cdb;
      accBtc += monthMap[month].btc;
      return { month, CDB: Math.max(0, accCdb), Bitcoin: Math.max(0, accBtc), Total: Math.max(0, accCdb) + Math.max(0, accBtc) };
    });
  }, [allInvestments]);

  const monthInvestments = ledger.currentMonthData.investments || [];

  return (
    <div className="space-y-6">
      
      {/* Botão de Ajuste no Topo */}
      <div className="flex justify-end">
         <button onClick={() => setShowYieldForm(true)} className="ledger-btn-outline flex items-center gap-2 hover:border-blue-500/50 hover:text-blue-500 bg-card">
           <RefreshCw size={14} /> Lançar Rendimento
         </button>
      </div>

      {/* Formulário de Lançamento de Rendimento */}
      <AnimatePresence>
        {showYieldForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleYieldSubmit} className="p-5 bg-muted rounded-lg border border-border space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                 <RefreshCw size={16} className="text-blue-500" /> Atualizar Rentabilidade do Mês
              </span>
              <button type="button" onClick={() => setShowYieldForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
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

      {/* Resumo do Portfólio */}
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

      {/* Gráfico */}
      <section className="ledger-card p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-muted-foreground" />
          Evolução do Patrimônio
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
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Faça aportes no Dashboard para visualizar a evolução.
          </div>
        )}
      </section>

      {/* Histórico de Movimentações */}
      <section className="ledger-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Movimentações do Mês</h2>
        </div>
        <div className="divide-y divide-border">
          {monthInvestments.map((inv: Investment) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {inv.action === 'deposit' ? (
                  <div className="p-2 bg-destructive/10 rounded-full"><ArrowUpRight size={14} className="text-destructive" /></div>
                ) : inv.action === 'withdraw' ? (
                  <div className="p-2 bg-success/10 rounded-full"><ArrowDownLeft size={14} className="text-success" /></div>
                ) : (
                  <div className="p-2 bg-blue-500/10 rounded-full"><RefreshCw size={14} className="text-blue-500" /></div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.description || inv.type}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {inv.type} · {inv.action === 'deposit' ? 'Aporte' : inv.action === 'withdraw' ? 'Resgate' : 'Rendimento'}
                  </p>
                </div>
              </div>
              <span className={`font-mono text-sm font-bold ${inv.action === 'withdraw' ? 'text-success' : inv.action === 'deposit' ? 'text-destructive' : 'text-blue-500'}`}>
                {inv.action === 'deposit' ? '-' : '+'} {formatCurrency(inv.value)}
              </span>
            </div>
          ))}
          {monthInvestments.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground italic">Nenhuma movimentação neste mês.</p>
          )}
        </div>
      </section>
    </div>
  );
}