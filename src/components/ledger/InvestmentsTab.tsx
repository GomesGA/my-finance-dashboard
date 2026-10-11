import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  X,
  Trash2,
  Edit2,
  Check,
  Landmark,
  Tag,
  Plus,
  Calculator,
  Sparkles,
  Percent,
} from 'lucide-react';
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

  // Estados para o formulário de rendimento / calculadora automática
  const [showYieldForm, setShowYieldForm] = useState(false);
  const [yieldMode, setYieldMode] = useState<'auto-cdb' | 'manual'>('auto-cdb');
  
  // Parâmetros da Calculadora Automática CDB (% do CDI)
  const [cdbPercent, setCdbPercent] = useState<number>(() => {
    const saved = localStorage.getItem('finance_cdb_percent');
    return saved ? Number(saved) : 115;
  });
  const [cdiAnnualRate, setCdiAnnualRate] = useState<number>(() => {
    const saved = localStorage.getItem('finance_cdi_annual');
    return saved ? Number(saved) : 10.65;
  });
  const [irRate, setIrRate] = useState<number>(0);
  const [customCdbBase, setCustomCdbBase] = useState<number | null>(null);

  // Estados para o modo manual
  const [yieldDirection, setYieldDirection] = useState<'positive' | 'negative'>('positive');
  const [manualYieldForm, setManualYieldForm] = useState({
    type: 'CDB' as 'CDB' | 'Bitcoin',
    value: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    bankAccountId: '',
    categoryId: '',
  });

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

  // Salvar preferências no localStorage
  const handleCdbPercentChange = (val: number) => {
    setCdbPercent(val);
    localStorage.setItem('finance_cdb_percent', String(val));
  };

  const handleCdiRateChange = (val: number) => {
    setCdiAnnualRate(val);
    localStorage.setItem('finance_cdi_annual', String(val));
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

  // Cálculos da Calculadora Automática CDB
  const baseCdbBalance = customCdbBase !== null ? customCdbBase : totals.cdb;

  const monthlyCdiRate = useMemo(() => {
    const annual = (cdiAnnualRate || 10.65) / 100;
    return Math.pow(1 + annual, 1 / 12) - 1;
  }, [cdiAnnualRate]);

  const monthlyCdbRate = useMemo(() => {
    return monthlyCdiRate * ((cdbPercent || 100) / 100);
  }, [monthlyCdiRate, cdbPercent]);

  const calculatedGrossYield = useMemo(() => {
    return Math.round(baseCdbBalance * monthlyCdbRate * 100) / 100;
  }, [baseCdbBalance, monthlyCdbRate]);

  const calculatedNetYield = useMemo(() => {
    const tax = calculatedGrossYield * (irRate / 100);
    return Math.round((calculatedGrossYield - tax) * 100) / 100;
  }, [calculatedGrossYield, irRate]);

  // Submissão do Aporte ou Resgate
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

  // Submissão do Rendimento Automático CDB
  const handleApplyCdbYield = () => {
    const yieldValueToApply = irRate > 0 ? calculatedNetYield : calculatedGrossYield;
    if (yieldValueToApply <= 0) return;
    const irLabel = irRate > 0 ? ` (Líq. IR ${irRate}%)` : '';
    const desc = `Rendimento CDB ${cdbPercent}% CDI${irLabel}`;
    ledger.addInvestment('CDB', desc, yieldValueToApply, 'yield', `${ledger.monthKey}-01`);
    setShowYieldForm(false);
  };

  // Submissão de Rendimento Manual
  const handleManualYieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualYieldForm.value <= 0) return;
    const finalValue = yieldDirection === 'positive' ? manualYieldForm.value : -manualYieldForm.value;
    const defaultDesc = yieldDirection === 'positive' ? 'Lucro do mês' : 'Desvalorização';
    const desc = manualYieldForm.description.trim() || defaultDesc;
    const date = manualYieldForm.date || `${ledger.monthKey}-01`;
    ledger.addInvestment(
      manualYieldForm.type,
      desc,
      finalValue,
      'yield',
      date,
      manualYieldForm.bankAccountId || undefined,
      manualYieldForm.categoryId || undefined
    );
    setManualYieldForm({
      type: 'CDB',
      value: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      bankAccountId: '',
      categoryId: '',
    });
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
      {/* Botões superiores responsivos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={22} className="text-primary" />
            Carteira de Investimentos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Aportes, resgates, cálculo automático de rendimento CDB e acompanhamento patrimonial
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setMovementAction('deposit');
              setShowMovementForm(true);
              setShowYieldForm(false);
            }}
            className="ledger-btn-primary flex items-center gap-1.5 text-xs py-2 px-3 shrink-0"
          >
            <ArrowUpRight size={14} /> Novo Aporte
          </button>
          <button
            onClick={() => {
              setMovementAction('withdraw');
              setShowMovementForm(true);
              setShowYieldForm(false);
            }}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-success hover:text-success shrink-0"
          >
            <ArrowDownLeft size={14} className="text-success" /> Novo Resgate
          </button>
          <button
            onClick={() => {
              setYieldMode('manual');
              setShowYieldForm(true);
              setShowMovementForm(false);
            }}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-primary hover:text-primary bg-card shrink-0"
          >
            <RefreshCw size={14} className="text-primary" /> Ajuste Manual (+/-)
          </button>
          <button
            onClick={() => {
              setYieldMode('auto-cdb');
              setShowYieldForm(true);
              setShowMovementForm(false);
            }}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-blue-500/50 hover:text-blue-500 bg-card shrink-0"
          >
            <Calculator size={14} className="text-blue-500" /> Calcular CDB (% CDI)
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
            className="p-4 sm:p-5 bg-card rounded-xl border border-border shadow-sm space-y-4 overflow-hidden"
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
                className="text-muted-foreground hover:text-foreground p-1"
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
                Aporte (Saída da Conta)
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
                Resgate (Entrada na Conta)
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
                  placeholder="Ex: CDB 115% CDI, NuInvest..."
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
                  Conta Bancária
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

      {/* Formulário / Modal Inteligente de Rentabilidade com Calculadora de CDB */}
      <AnimatePresence>
        {showYieldForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-card rounded-xl border border-primary/30 shadow-md space-y-4 overflow-hidden"
          >
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                {yieldMode === 'manual' ? (
                  <>
                    <RefreshCw size={18} className="text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Ajuste Manual de Rentabilidade & Saldo
                    </h3>
                  </>
                ) : (
                  <>
                    <Calculator size={18} className="text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Cálculo Automático de Rendimento CDB (% do CDI)
                    </h3>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowYieldForm(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas do Modal: Manual vs Automático */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setYieldMode('manual')}
                className={`flex-1 text-xs py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  yieldMode === 'manual'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <RefreshCw size={14} /> ✏️ Ajuste Manual (Valor Livre)
              </button>
              <button
                type="button"
                onClick={() => setYieldMode('auto-cdb')}
                className={`flex-1 text-xs py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  yieldMode === 'auto-cdb'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <Sparkles size={14} /> ⚡ Cálculo Automático CDB (% do CDI)
              </button>
            </div>

            {yieldMode === 'auto-cdb' ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Saldo Aplicado em CDB
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        placeholder="0,00"
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={baseCdbBalance}
                        onChange={val => setCustomCdbBase(val)}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {customCdbBase === null ? 'Puxado do seu saldo atual' : 'Valor personalizado'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block flex items-center gap-1">
                      <Percent size={13} className="text-primary" /> Taxa do CDB (% do CDI)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        step="0.5"
                        value={cdbPercent}
                        onChange={e => handleCdbPercentChange(Number(e.target.value))}
                        className="ledger-input w-full font-mono text-xs pr-8"
                        placeholder="115"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Ex: 100%, 110%, 115%, 120%
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      CDI Anual (Referência)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="0.05"
                        value={cdiAnnualRate}
                        onChange={e => handleCdiRateChange(Number(e.target.value))}
                        className="ledger-input w-full font-mono text-xs pr-12"
                        placeholder="10.65"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">% a.a.</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Taxa anual atualizada
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Desconto de Imposto de Renda (Opcional)
                    </label>
                    <select
                      value={irRate}
                      onChange={e => setIrRate(Number(e.target.value))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="0">Bruto (Sem desconto de IR - 0%)</option>
                      <option value="22.5">22,5% (Até 180 dias de aplicação)</option>
                      <option value="20">20,0% (De 181 a 360 dias)</option>
                      <option value="17.5">17,5% (De 361 a 720 dias)</option>
                      <option value="15">15,0% (Acima de 720 dias)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Taxa Efetiva no Mês:</span>
                    <span className="font-bold text-primary">
                      {(monthlyCdbRate * 100).toFixed(3)}% ao mês
                    </span>
                  </div>
                </div>

                {/* Box de Resultado Calculado */}
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                      Rendimento Estimado para o Mês
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="font-mono font-bold text-2xl text-foreground">
                        +{formatCurrency(irRate > 0 ? calculatedNetYield : calculatedGrossYield)}
                      </span>
                      {irRate > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          (Bruto: {formatCurrency(calculatedGrossYield)} · IR: -{formatCurrency(calculatedGrossYield * (irRate / 100))})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Novo saldo estimado em CDB: <strong className="font-mono text-foreground">{formatCurrency(baseCdbBalance + (irRate > 0 ? calculatedNetYield : calculatedGrossYield))}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCdbYield}
                    disabled={baseCdbBalance <= 0 || (irRate > 0 ? calculatedNetYield : calculatedGrossYield) <= 0}
                    className="ledger-btn-primary py-2.5 px-5 text-xs font-semibold whitespace-nowrap self-stretch sm:self-auto flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={16} /> Lançar Rendimento no Mês
                  </button>
                </div>
              </div>
            ) : (
              /* Modo Manual de Rendimento / Ajuste */
              <form onSubmit={handleManualYieldSubmit} className="space-y-4 pt-1">
                {/* Tipo de Ajuste: Lucro vs Desvalorização */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Tipo de Ajuste</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setYieldDirection('positive')}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        yieldDirection === 'positive'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <TrendingUp size={14} /> Lucro / Rendimento (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setYieldDirection('negative')}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        yieldDirection === 'negative'
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <TrendingDown size={14} /> Desvalorização / Prejuízo (-)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Ativo</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border">
                      {(['CDB', 'Bitcoin'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setManualYieldForm(f => ({ ...f, type: t }))}
                          className={`text-xs py-1.5 rounded-md font-medium transition-colors ${
                            manualYieldForm.type === t
                              ? 'bg-card text-foreground shadow-sm font-semibold'
                              : 'text-muted-foreground hover:text-foreground'
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
                      value={manualYieldForm.date}
                      onChange={e => setManualYieldForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor do Ajuste</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        placeholder="0,00"
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={manualYieldForm.value}
                        onChange={val => setManualYieldForm(f => ({ ...f, value: val }))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição (opcional)</label>
                  <input
                    type="text"
                    placeholder={yieldDirection === 'positive' ? 'Ex: Rendimento do mês, Dividendos...' : 'Ex: Queda na cotação, Ajuste...'}
                    className="ledger-input w-full text-xs"
                    value={manualYieldForm.description}
                    onChange={e => setManualYieldForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Landmark size={13} className="text-muted-foreground" />
                      Conta Bancária (opcional)
                    </label>
                    <select
                      value={manualYieldForm.bankAccountId}
                      onChange={e => setManualYieldForm(f => ({ ...f, bankAccountId: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="">Nenhuma conta vinculada</option>
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
                      Categoria (opcional)
                    </label>
                    <select
                      value={manualYieldForm.categoryId}
                      onChange={e => setManualYieldForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="">Nenhuma categoria vinculada</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowYieldForm(false)}
                    className="ledger-btn-outline py-2 px-4 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={manualYieldForm.value <= 0}
                    className="ledger-btn-primary py-2 px-6 text-xs font-medium disabled:opacity-50"
                  >
                    Salvar Ajuste Manual
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card CDB com Taxa Configurada */}
        <motion.div className="ledger-card p-4 sm:p-5 relative overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">CDB / Renda Fixa</p>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full font-mono border border-primary/20">
              {cdbPercent}% do CDI
            </span>
          </div>
          <p className="font-mono font-bold text-xl sm:text-2xl text-primary">{formatCurrency(totals.cdb)}</p>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>Rende est. <strong className="text-foreground font-mono">+{formatCurrency(calculatedGrossYield)}</strong>/mês</span>
            <button
              onClick={() => {
                setYieldMode('auto-cdb');
                setShowYieldForm(true);
                setShowMovementForm(false);
              }}
              className="text-primary hover:underline font-semibold"
            >
              Lançar →
            </button>
          </div>
        </motion.div>

        {/* Card Bitcoin */}
        <motion.div className="ledger-card p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider mb-1">Bitcoin / Cripto</p>
          <p className="font-mono font-bold text-xl sm:text-2xl text-success">{formatCurrency(totals.btc)}</p>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            Acompanhe compras e cotação
          </p>
        </motion.div>

        {/* Card Total Investido */}
        <motion.div className="ledger-card p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider mb-1">Total em Carteira</p>
          <p className="font-mono font-bold text-xl sm:text-2xl text-foreground">{formatCurrency(totals.total)}</p>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            Patrimônio investido acumulado
          </p>
        </motion.div>
      </div>

      {/* Gráfico de Evolução */}
      <section className="ledger-card p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
          <TrendingUp size={18} className="text-muted-foreground" /> Evolução do Patrimônio
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="CDB" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bitcoin" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-xs sm:text-sm text-muted-foreground italic">
            Cadastre aportes para visualizar a evolução do patrimônio.
          </div>
        )}
      </section>

      {/* Movimentações do Mês com Edição e Exclusão */}
      <section className="ledger-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">Movimentações do Mês</h2>
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
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 sm:py-3.5 hover:bg-muted/30 transition-colors group gap-2 sm:gap-3"
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
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{inv.description || inv.type}</p>
                      
                      {bank && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-foreground/80 font-medium px-2 py-0.5 rounded-full border border-border/60">
                          <Landmark size={10} className="text-primary" />
                          {bank.name}
                        </span>
                      )}

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

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
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

                  {/* Botões visíveis no celular (opacity-100) e suaves no desktop */}
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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