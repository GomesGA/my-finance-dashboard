import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, X, Trash2, Edit2, Check, Landmark, Tag, Plus } from 'lucide-react';
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
  const { bankAccounts, categories } = ledger;

  // Estados para o formulário de nova movimentação (Aporte ou Resgate)
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementAction, setMovementAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [movementForm, setMovementForm] = useState({
    type: 'CDB' as 'CDB' | 'Bitcoin',
    description: '',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    bankAccountId: '',
    categoryId: '',
  });

  // Estados para o formulário de novo rendimento
  const [showYieldForm, setShowYieldForm] = useState(false);
  const [yieldDirection, setYieldDirection] = useState<'positive' | 'negative'>('positive');
  const [yieldForm, setYieldForm] = useState({ type: 'CDB' as 'CDB' | 'Bitcoin', value: 0 });

  // Estados para edição de movimentações existentes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    value: 0,
    date: '',
    bankAccountId: '',
    categoryId: '',
    type: 'CDB' as 'CDB' | 'Bitcoin',
  });

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (movementForm.value <= 0 || !movementForm.date) return;
    ledger.addInvestment(
      movementForm.type,
      movementForm.description,
      movementForm.value,
      movementAction,
      movementForm.date,
      movementForm.bankAccountId || undefined,
      movementForm.categoryId || undefined
    );
    setMovementForm({
      type: 'CDB',
      description: '',
      value: 0,
      date: new Date().toISOString().split('T')[0],
      bankAccountId: '',
      categoryId: '',
    });
    setShowMovementForm(false);
  };

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
    setEditForm({
      description: inv.description || '',
      value: Math.abs(inv.value),
      date: inv.date,
      bankAccountId: inv.bankAccountId || '',
      categoryId: inv.categoryId || '',
      type: inv.type,
    });
  };

  const saveEdit = (inv: Investment) => {
    const finalValue = inv.value >= 0 ? editForm.value : -editForm.value;
    ledger.editInvestment(inv.id, {
      description: editForm.description,
      value: finalValue,
      date: editForm.date,
      bankAccountId: editForm.bankAccountId || undefined,
      categoryId: editForm.categoryId || undefined,
      type: editForm.type,
    });
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
      {/* Botões superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={22} className="text-primary" />
            Carteira de Investimentos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie aportes, resgates, rentabilidade e acompanhe seu patrimônio
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setMovementAction('deposit');
              setShowMovementForm(true);
              setShowYieldForm(false);
            }}
            className="ledger-btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <ArrowUpRight size={14} /> Novo Aporte
          </button>
          <button
            onClick={() => {
              setMovementAction('withdraw');
              setShowMovementForm(true);
              setShowYieldForm(false);
            }}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-success hover:text-success"
          >
            <ArrowDownLeft size={14} className="text-success" /> Novo Resgate
          </button>
          <button
            onClick={() => {
              setShowYieldForm(true);
              setShowMovementForm(false);
            }}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-blue-500/50 hover:text-blue-500 bg-card"
          >
            <RefreshCw size={14} /> Ajustar Rentabilidade
          </button>
        </div>
      </div>

      {/* Formulário de Novo Aporte / Resgate */}
      <AnimatePresence>
        {showMovementForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleMovementSubmit}
            className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                {movementAction === 'deposit' ? (
                  <>
                    <ArrowUpRight size={16} className="text-destructive" /> Novo Aporte
                  </>
                ) : (
                  <>
                    <ArrowDownLeft size={16} className="text-success" /> Novo Resgate
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowMovementForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMovementAction('deposit')}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                  movementAction === 'deposit'
                    ? 'bg-destructive/15 text-destructive border-destructive/40'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                Aporte (Saída de Conta)
              </button>
              <button
                type="button"
                onClick={() => setMovementAction('withdraw')}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                  movementAction === 'withdraw'
                    ? 'bg-success/15 text-success border-success/40'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                Resgate (Entrada em Conta)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Tipo de Ativo</label>
                <div className="flex gap-1.5">
                  {(['CDB', 'Bitcoin'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMovementForm(f => ({ ...f, type: t }))}
                      className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                        movementForm.type === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Data</label>
                <input
                  type="date"
                  className="ledger-input w-full text-xs"
                  value={movementForm.date}
                  onChange={e => setMovementForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Valor</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                  <CurrencyInput
                    placeholder="0,00"
                    className="ledger-input w-full font-mono text-xs pl-8"
                    value={movementForm.value}
                    onChange={val => setMovementForm(f => ({ ...f, value: val }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Descrição (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Tesouro Selic, Corretora X"
                  className="ledger-input w-full text-xs"
                  value={movementForm.description}
                  onChange={e => setMovementForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Landmark size={13} className="text-muted-foreground" />
                  Conta Bancária de Origem/Destino
                </label>
                <select
                  value={movementForm.bankAccountId}
                  onChange={e => setMovementForm(f => ({ ...f, bankAccountId: e.target.value }))}
                  className="ledger-input w-full text-xs bg-background"
                >
                  <option value="">Nenhuma conta vinculada (opcional)</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Tag size={13} className="text-muted-foreground" />
                  Categoria do Lançamento
                </label>
                <select
                  value={movementForm.categoryId}
                  onChange={e => setMovementForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="ledger-input w-full text-xs bg-background"
                >
                  <option value="">Nenhuma categoria vinculada (opcional)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMovementForm(false)}
                className="ledger-btn-outline py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button type="submit" className="ledger-btn-primary py-2 px-6 text-xs font-medium">
                Confirmar Lançamento
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Formulário de Rentabilidade */}
      <AnimatePresence>
        {showYieldForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleYieldSubmit}
            className="p-5 bg-card rounded-xl border border-border shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <RefreshCw size={16} className="text-blue-500" /> Atualizar Rentabilidade do Mês
              </span>
              <button
                type="button"
                onClick={() => setShowYieldForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setYieldDirection('positive')}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                  yieldDirection === 'positive'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                Lucro (+)
              </button>
              <button
                type="button"
                onClick={() => setYieldDirection('negative')}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                  yieldDirection === 'negative'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                Desvalorização (-)
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="ledger-input sm:w-1/3 bg-background text-xs"
                value={yieldForm.type}
                onChange={e => setYieldForm(f => ({ ...f, type: e.target.value as 'CDB' | 'Bitcoin' }))}
              >
                <option value="CDB">CDB</option>
                <option value="Bitcoin">Bitcoin</option>
              </select>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                <CurrencyInput
                  placeholder="0,00"
                  className="ledger-input w-full font-mono text-xs pl-8"
                  value={yieldForm.value}
                  onChange={val => setYieldForm(f => ({ ...f, value: val }))}
                />
              </div>
              <button type="submit" className="ledger-btn-primary px-8 text-xs font-medium">Salvar</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'CDB / Renda Fixa', value: totals.cdb, color: 'text-primary' },
          { label: 'Bitcoin / Cripto', value: totals.btc, color: 'text-success' },
          { label: 'Total Investido Acumulado', value: totals.total, color: 'text-foreground' },
        ].map(item => (
          <motion.div key={item.label} className="ledger-card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider mb-1">{item.label}</p>
            <p className={`font-mono font-bold text-2xl ${item.color}`}>{formatCurrency(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Gráfico de Evolução */}
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
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Cadastre aportes para visualizar a evolução do patrimônio.
          </div>
        )}
      </section>

      {/* Movimentações do Mês com Edição e Exclusão */}
      <section className="ledger-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Movimentações do Mês</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {monthInvestments.length} movimentaç{monthInvestments.length === 1 ? 'ão' : 'ões'} registrada{monthInvestments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {monthInvestments.map((inv: Investment) => {
            const isEditing = editingId === inv.id;
            const isLoss = inv.action === 'yield' && inv.value < 0;
            const isProfit = inv.action === 'yield' && inv.value >= 0;
            const bank = bankAccounts.find(b => b.id === inv.bankAccountId);
            const category = categories.find(c => c.id === inv.categoryId);

            if (isEditing) {
              return (
                <div key={inv.id} className="p-4 bg-muted/40 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      className="ledger-input text-xs"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descrição"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={editForm.value}
                        onChange={val => setEditForm(f => ({ ...f, value: val }))}
                      />
                    </div>
                    <input
                      type="date"
                      className="ledger-input text-xs"
                      value={editForm.date}
                      onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={editForm.bankAccountId}
                      onChange={e => setEditForm(f => ({ ...f, bankAccountId: e.target.value }))}
                      className="ledger-input text-xs bg-background"
                    >
                      <option value="">Sem conta bancária</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.kind})
                        </option>
                      ))}
                    </select>

                    <select
                      value={editForm.categoryId}
                      onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="ledger-input text-xs bg-background"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(inv)}
                      className="flex-1 ledger-btn-primary py-2 text-xs flex justify-center items-center gap-1.5 font-medium"
                    >
                      <Check size={14} /> Salvar Alterações
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 ledger-btn-outline py-2 text-xs flex justify-center items-center gap-1.5"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 sm:py-3.5 hover:bg-muted/30 transition-colors group gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {inv.action === 'deposit' ? (
                    <div className="p-2 bg-destructive/10 text-destructive rounded-full shrink-0">
                      <ArrowUpRight size={16} />
                    </div>
                  ) : inv.action === 'withdraw' ? (
                    <div className="p-2 bg-success/10 text-success rounded-full shrink-0">
                      <ArrowDownLeft size={16} />
                    </div>
                  ) : isProfit ? (
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full shrink-0">
                      <TrendingUp size={16} />
                    </div>
                  ) : (
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-full shrink-0">
                      <TrendingDown size={16} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{inv.description || inv.type}</p>
                      
                      {/* Badge do Banco */}
                      {bank && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-foreground/80 font-medium px-2 py-0.5 rounded-full border border-border/60">
                          <Landmark size={10} className="text-primary" />
                          {bank.name}
                        </span>
                      )}

                      {/* Badge da Categoria */}
                      {category && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-foreground/80 font-medium px-2 py-0.5 rounded-full border border-border/60">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color || 'var(--primary)' }} />
                          {category.name}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
                      {inv.type} · {inv.action === 'deposit' ? 'Aporte' : inv.action === 'withdraw' ? 'Resgate' : (isProfit ? 'Lucro' : 'Desvalorização')} · {inv.date.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span
                    className={`font-mono text-sm font-bold ${
                      inv.action === 'withdraw'
                        ? 'text-success'
                        : inv.action === 'deposit'
                        ? 'text-destructive'
                        : isProfit
                        ? 'text-blue-500'
                        : 'text-orange-500'
                    }`}
                  >
                    {inv.action === 'deposit' ? '-' : inv.action === 'withdraw' ? '+' : (isProfit ? '+' : '-')} {formatCurrency(Math.abs(inv.value))}
                  </span>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(inv)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => ledger.removeInvestment(inv.id)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {monthInvestments.length === 0 && (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground italic">
              Nenhuma movimentação registrada neste mês.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}