import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

const NO_CATEGORY_COLOR = '#94a3b8';

export function CategoriesTab({ ledger }: Props) {
  const exits = ledger.computedExits;

  const totals = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; value: number }>();
    exits.forEach(entry => {
      const cat = entry.categoryId ? ledger.categories.find(c => c.id === entry.categoryId) : undefined;
      const key = cat?.id ?? '__none__';
      const current = map.get(key) ?? { id: key, name: cat?.name ?? 'Sem categoria', color: cat?.color ?? NO_CATEGORY_COLOR, value: 0 };
      current.value += entry.value;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [exits, ledger.categories]);

  const totalGasto = totals.reduce((acc, c) => acc + c.value, 0);
  const chartData = totals.map(c => ({ name: c.name, value: c.value, color: c.color }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Tag size={22} className="text-primary" />
          Gastos por Categoria
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {formatCurrency(totalGasto)} no mês · {totals.length} categoria{totals.length !== 1 ? 's' : ''}
        </p>
      </div>

      <section className="ledger-card p-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">Nenhum gasto categorizado neste mês.</div>
        )}
      </section>

      <section className="ledger-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Detalhamento</h3>
        </div>
        <div className="divide-y divide-border">
          {totals.map(cat => {
            const percent = totalGasto > 0 ? Math.round((cat.value / totalGasto) * 100) : 0;
            return (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-foreground">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{percent}%</span>
                  <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(cat.value)}</span>
                </div>
              </div>
            );
          })}
          {totals.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground italic">Nenhum gasto neste mês ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
