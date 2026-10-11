import { useState, useMemo } from 'react';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Tags,
  Plus,
  Landmark,
  PieChart as PieChartIcon,
  TrendingUp,
  Percent,
  Wallet,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

export function BankDashboardTab({ ledger }: Props) {
  const {
    computedExits,
    computedEntries,
    bankAccounts,
    totalExpenses,
    totalIncome,
    balance,
    categories,
  } = ledger;

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newBankName, setNewBankName] = useState('');
  const [newBankKind, setNewBankKind] = useState<'PF' | 'PJ'>('PF');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    ledger.addCategory(newCatName, newCatColor);
    setNewCatName('');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    ledger.addBankAccount(newBankName, newBankKind);
    setNewBankName('');
  };

  // 1. Dados de Despesas por Categoria para o Gráfico de Rosca
  const categoryData = useMemo(() => {
    const list = categories.map((cat, idx) => {
      const total = computedExits
        .filter(e => e.categoryId === cat.id && !e.paidByOthers)
        .reduce((acc, curr) => acc + curr.value, 0);
      return {
        id: cat.id,
        name: cat.name,
        value: total,
        color: cat.color || PALETTE[idx % PALETTE.length],
      };
    }).filter(c => c.value > 0);

    const withoutCat = computedExits
      .filter(e => !e.categoryId && !e.paidByOthers)
      .reduce((acc, curr) => acc + curr.value, 0);

    if (withoutCat > 0) {
      list.push({
        id: 'no-cat',
        name: 'Sem Categoria',
        value: withoutCat,
        color: '#94a3b8',
      });
    }

    return list.sort((a, b) => b.value - a.value);
  }, [categories, computedExits]);

  // 2. Dados de Saídas por Banco para o Gráfico de Rosca
  const bankExpenseData = useMemo(() => {
    const list = bankAccounts.map((bank, idx) => {
      const total = computedExits
        .filter(e => e.bankAccountId === bank.id && !e.paidByOthers)
        .reduce((acc, curr) => acc + curr.value, 0);
      return {
        id: bank.id,
        name: `${bank.name} (${bank.kind})`,
        value: total,
        color: PALETTE[idx % PALETTE.length],
      };
    }).filter(b => b.value > 0);

    const withoutBank = computedExits
      .filter(e => !e.bankAccountId && !e.paidByOthers)
      .reduce((acc, curr) => acc + curr.value, 0);

    if (withoutBank > 0) {
      list.push({
        id: 'no-bank',
        name: 'Sem Banco Definido',
        value: withoutBank,
        color: '#64748b',
      });
    }

    return list.sort((a, b) => b.value - a.value);
  }, [bankAccounts, computedExits]);

  // 3. Comparativo de Entradas vs Saídas por Banco
  const bankFlowData = useMemo(() => {
    return bankAccounts.map(bank => {
      const entries = computedEntries
        .filter(e => e.bankAccountId === bank.id && !e.paidByOthers)
        .reduce((acc, curr) => acc + curr.value, 0);
      const exits = computedExits
        .filter(e => e.bankAccountId === bank.id && !e.paidByOthers)
        .reduce((acc, curr) => acc + curr.value, 0);

      return {
        name: bank.name,
        kind: bank.kind,
        Entradas: entries,
        Saídas: exits,
        Saldo: entries - exits,
      };
    }).filter(b => b.Entradas > 0 || b.Saídas > 0);
  }, [bankAccounts, computedEntries, computedExits]);

  // KPIs
  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100));
  }, [totalIncome, totalExpenses]);

  const topCategory = categoryData[0];
  const topBank = bankExpenseData[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <PieChartIcon size={22} className="text-primary" />
            Dashboard Analítico & Bancos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Distribuição de gastos por categoria, fluxo de contas bancárias e indicadores do mês
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ledger-card p-4 space-y-1">
          <div className="flex justify-between items-center text-muted-foreground text-[11px] uppercase font-medium">
            <span>Receita do Mês</span>
            <ArrowDownLeft size={14} className="text-success" />
          </div>
          <p className="font-mono font-bold text-lg sm:text-xl text-success">{formatCurrency(totalIncome)}</p>
          <p className="text-[10px] text-muted-foreground">Entradas consolidadas</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <div className="flex justify-between items-center text-muted-foreground text-[11px] uppercase font-medium">
            <span>Despesas do Mês</span>
            <ArrowUpRight size={14} className="text-destructive" />
          </div>
          <p className="font-mono font-bold text-lg sm:text-xl text-destructive">{formatCurrency(totalExpenses)}</p>
          <p className="text-[10px] text-muted-foreground">Saídas e compromissos</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <div className="flex justify-between items-center text-muted-foreground text-[11px] uppercase font-medium">
            <span>Resultado Líquido</span>
            <Wallet size={14} className={balance >= 0 ? 'text-primary' : 'text-destructive'} />
          </div>
          <p className={`font-mono font-bold text-lg sm:text-xl ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {balance >= 0 ? 'Superávit no período' : 'Déficit no período'}
          </p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <div className="flex justify-between items-center text-muted-foreground text-[11px] uppercase font-medium">
            <span>Taxa de Poupança</span>
            <Percent size={14} className="text-primary" />
          </div>
          <p className="font-mono font-bold text-lg sm:text-xl text-primary">{savingsRate}%</p>
          <p className="text-[10px] text-muted-foreground">
            {topCategory ? `Maior gasto: ${topCategory.name}` : 'Sem despesas registradas'}
          </p>
        </div>
      </div>

      {/* Seção 1: Gráficos de Rosca (Donut Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rosca 1: Gastos por Categoria */}
        <div className="ledger-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                <PieChartIcon size={18} className="text-primary" />
                Despesas por Categoria (Gráfico de Rosca)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fatias proporcionais de cada centro de custo neste mês
              </p>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
              <div className="h-60 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={92}
                      paddingAngle={3}
                      strokeWidth={1}
                      stroke="hsl(var(--card))"
                    >
                      {categoryData.map(entry => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const pct = totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : 0;
                          return (
                            <div className="bg-card border border-border shadow-lg rounded-lg p-2.5 text-xs">
                              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                {data.name}
                              </div>
                              <p className="font-mono font-bold text-destructive mt-1 text-sm">
                                {formatCurrency(data.value)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{pct}% do total de saídas</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto central da Rosca */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Legenda Lateral com Percentual e Barras */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {categoryData.map(item => {
                  const pct = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                  return (
                    <div key={item.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-muted-foreground text-[11px]">{pct}%</span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">
              Nenhuma despesa categorizada neste mês.
            </div>
          )}
        </div>

        {/* Rosca 2: Saídas por Banco */}
        <div className="ledger-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                <Landmark size={18} className="text-primary" />
                Saídas por Conta Bancária (Gráfico de Rosca)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Concentração de débitos e pagamentos entre suas contas
              </p>
            </div>
          </div>

          {bankExpenseData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
              <div className="h-60 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bankExpenseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={92}
                      paddingAngle={3}
                      strokeWidth={1}
                      stroke="hsl(var(--card))"
                    >
                      {bankExpenseData.map(entry => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const pct = totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : 0;
                          return (
                            <div className="bg-card border border-border shadow-lg rounded-lg p-2.5 text-xs">
                              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                {data.name}
                              </div>
                              <p className="font-mono font-bold text-destructive mt-1 text-sm">
                                {formatCurrency(data.value)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{pct}% do total de saídas</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto central da Rosca */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {topBank ? 'Líder' : 'Contas'}
                  </span>
                  <span className="font-bold text-xs text-foreground truncate max-w-[100px]">
                    {topBank ? topBank.name.split(' ')[0] : '-'}
                  </span>
                </div>
              </div>

              {/* Legenda Lateral */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {bankExpenseData.map(item => {
                  const pct = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                  return (
                    <div key={item.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-muted-foreground text-[11px]">{pct}%</span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">
              Nenhuma saída vinculada a banco neste mês.
            </div>
          )}
        </div>
      </div>

      {/* Seção 2: Comparativo de Entradas vs Saídas por Banco */}
      <section className="ledger-card p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <BarChart3 size={18} className="text-primary" />
            Fluxo de Caixa por Conta Bancária (Entradas vs Saídas)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparação direta do volume movimentado em cada banco (PF e PJ)
          </p>
        </div>

        {bankFlowData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={v => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border shadow-lg rounded-lg p-3 text-xs space-y-1">
                          <p className="font-bold text-foreground">
                            {data.name} ({data.kind})
                          </p>
                          <p className="text-success font-mono">
                            Entradas: {formatCurrency(data.Entradas)}
                          </p>
                          <p className="text-destructive font-mono">
                            Saídas: {formatCurrency(data.Saídas)}
                          </p>
                          <p className={`font-mono font-bold pt-1 border-t border-border ${data.Saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            Saldo: {formatCurrency(data.Saldo)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground italic">
            Nenhuma movimentação bancária registrada neste mês.
          </div>
        )}
      </section>

      {/* Seção 3: Cadastros & Gerenciamento (Categorias e Contas Bancárias) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Gestão de Categorias */}
        <div className="ledger-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tags size={18} className="text-primary" /> Gerenciar Categorias
            </h3>
            <span className="text-xs text-muted-foreground">{categories.length} cadastradas</span>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                className="w-10 h-10 p-0 border border-border rounded-lg cursor-pointer shrink-0 bg-transparent"
                title="Escolha a cor da categoria"
              />
              <input
                type="text"
                placeholder="Nome da categoria (ex: Alimentação, Lazer)"
                className="ledger-input w-full text-xs"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="ledger-btn-primary w-full text-xs py-2 flex justify-center items-center gap-1.5"
            >
              <Plus size={15} /> Cadastrar Nova Categoria
            </button>
          </form>

          <div className="pt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {categories.map(c => (
              <span
                key={c.id}
                className="text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 bg-card text-foreground"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || '#3b82f6' }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Gestão de Contas Bancárias */}
        <div className="ledger-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 size={18} className="text-primary" /> Gerenciar Contas Bancárias
            </h3>
            <span className="text-xs text-muted-foreground">{bankAccounts.length} cadastradas</span>
          </div>

          <form onSubmit={handleAddBank} className="space-y-3">
            <div className="flex gap-2">
              <select
                className="ledger-input w-24 shrink-0 bg-background text-xs"
                value={newBankKind}
                onChange={e => setNewBankKind(e.target.value as 'PF' | 'PJ')}
              >
                <option value="PF">PF</option>
                <option value="PJ">PJ</option>
              </select>
              <input
                type="text"
                placeholder="Nome da conta (ex: Nubank, Inter, Itaú)"
                className="ledger-input w-full text-xs"
                value={newBankName}
                onChange={e => setNewBankName(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="ledger-btn-primary w-full text-xs py-2 flex justify-center items-center gap-1.5"
            >
              <Plus size={15} /> Cadastrar Nova Conta Bancária
            </button>
          </form>

          <div className="pt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {bankAccounts.map(b => (
              <span
                key={b.id}
                className="text-xs px-2.5 py-1 rounded-lg border border-border bg-card text-foreground flex items-center gap-1.5"
              >
                <Landmark size={12} className="text-primary" />
                <span className="font-medium">{b.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded font-mono">
                  {b.kind}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}