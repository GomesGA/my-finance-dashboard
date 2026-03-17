import { useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';
import type { Investment } from '@/types/ledger';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function InvestmentsTab({ ledger }: Props) {
  const allInvestments = ledger.allInvestments;

  // Calculate totals by type
  const totals = useMemo(() => {
    const cdb = allInvestments
      .filter(i => i.type === 'CDB')
      .reduce((a, c) => a + (c.action === 'deposit' ? Number(c.value) : -Number(c.value)), 0);
    const btc = allInvestments
      .filter(i => i.type === 'Bitcoin')
      .reduce((a, c) => a + (c.action === 'deposit' ? Number(c.value) : -Number(c.value)), 0);
    return { cdb: Math.max(0, cdb), btc: Math.max(0, btc), total: Math.max(0, cdb) + Math.max(0, btc) };
  }, [allInvestments]);

  // Build chart data: accumulated per month
  const chartData = useMemo(() => {
    const monthMap: Record<string, { cdb: number; btc: number }> = {};

    allInvestments.forEach(inv => {
      if (!monthMap[inv.date]) monthMap[inv.date] = { cdb: 0, btc: 0 };
      const delta = inv.action === 'deposit' ? Number(inv.value) : -Number(inv.value);
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

  // Current month investments
  const monthInvestments = ledger.currentMonthData.investments || [];

  return (
    <div className="space-y-6">
      {/* Portfolio summary */}
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

      {/* Chart */}
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
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
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

      {/* Current month movements */}
      <section className="ledger-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Movimentações do Mês</h2>
        </div>
        <div className="divide-y divide-border">
          {monthInvestments.map((inv: Investment) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {inv.action === 'deposit' ? (
                  <ArrowUpRight size={16} className="text-destructive" />
                ) : (
                  <ArrowDownLeft size={16} className="text-success" />
                )}
                <div>
                  <p className="text-sm text-foreground">{inv.description || inv.type}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {inv.type} · {inv.action === 'deposit' ? 'Aporte' : 'Resgate'}
                  </p>
                </div>
              </div>
              <span className={`font-mono text-sm font-semibold ${inv.action === 'deposit' ? 'text-destructive' : 'text-success'}`}>
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
