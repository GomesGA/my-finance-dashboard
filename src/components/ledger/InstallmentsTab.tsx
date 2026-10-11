import { useState, useMemo } from 'react';
import { ShoppingBag, CreditCard, ArrowLeft, Plus, Search, Filter, Edit2, Trash2, Calendar, CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { format, addMonths, differenceInMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import { CurrencyInput } from '@/components/CurrencyInput';
import type { useLedgerData } from '@/hooks/useLedgerData';
import type { Installment } from '@/types/ledger';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
  onGoToDashboard: () => void;
}

export function InstallmentsPurchasesTab({ ledger, onGoToDashboard }: Props) {
  const installments = ledger.data.installments;
  const cards = ledger.data.cards;
  const categories = ledger.categories;
  const currentDate = ledger.currentDate;
  const currentMonthKey = ledger.monthKey;

  // Estado para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Estado para cadastro de nova compra parcelada
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    monthlyValue: 0,
    totalMonths: 2,
    paymentMethod: 'Pix',
    categoryId: '',
  });

  // Estado para edição de compra parcelada
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    monthlyValue: 0,
    totalMonths: 2,
    paymentMethod: 'Pix',
    categoryId: '',
  });

  // KPIs
  const totalGeral = useMemo(
    () => installments.reduce((acc, inst) => acc + inst.monthlyValue * inst.totalMonths, 0),
    [installments]
  );

  const totalPagoGeral = useMemo(
    () => installments.reduce((acc, inst) => acc + inst.monthlyValue * inst.paidMonths.length, 0),
    [installments]
  );

  const totalRestanteGeral = Math.max(0, totalGeral - totalPagoGeral);

  // Comprometimento no mês atual
  const activeThisMonth = useMemo(() => {
    return installments.filter(inst => {
      const [sYear, sMonth] = inst.startDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, 1);
      const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const diff = differenceInMonths(current, start);
      return diff >= 0 && diff < inst.totalMonths;
    });
  }, [installments, currentDate]);

  const comprometimentoMensalAtual = useMemo(
    () => activeThisMonth.reduce((acc, inst) => acc + inst.monthlyValue, 0),
    [activeThisMonth]
  );

  // Projeção dos próximos 12 meses
  const projectionData = useMemo(() => {
    const list = [];
    const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    for (let i = 0; i < 12; i++) {
      const targetMonthDate = addMonths(baseDate, i);
      const targetMonthKey = format(targetMonthDate, 'yyyy-MM');
      const label = format(targetMonthDate, 'MMM/yy', { locale: ptBR });

      let monthTotal = 0;
      installments.forEach(inst => {
        const [sYear, sMonth] = inst.startDate.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, 1);
        const diff = differenceInMonths(targetMonthDate, start);
        if (diff >= 0 && diff < inst.totalMonths) {
          monthTotal += inst.monthlyValue;
        }
      });

      list.push({
        monthKey: targetMonthKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        valor: monthTotal,
      });
    }

    return list;
  }, [installments, currentDate]);

  // Lista filtrada
  const filteredInstallments = useMemo(() => {
    return installments.filter(inst => {
      const paidCount = inst.paidMonths.length;
      const isDone = paidCount >= inst.totalMonths;

      // Filtro de status
      if (statusFilter === 'active' && isDone) return false;
      if (statusFilter === 'done' && !isDone) return false;

      // Filtro de pagamento
      if (paymentFilter !== 'all') {
        const currentMethod = !inst.paymentMethod || inst.paymentMethod === 'Pix' ? 'Pix' : inst.paymentMethod;
        if (currentMethod !== paymentFilter) return false;
      }

      // Busca por nome
      if (searchTerm.trim() && !inst.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
        return false;
      }

      return true;
    });
  }, [installments, statusFilter, paymentFilter, searchTerm]);

  // Submissão do cadastro
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || addForm.monthlyValue <= 0 || addForm.totalMonths < 1) return;

    ledger.addInstallment(
      addForm.name.trim(),
      addForm.monthlyValue,
      addForm.totalMonths,
      addForm.paymentMethod,
      addForm.categoryId || undefined
    );

    setAddForm({
      name: '',
      monthlyValue: 0,
      totalMonths: 2,
      paymentMethod: 'Pix',
      categoryId: '',
    });
    setShowAddModal(false);
  };

  // Iniciar edição
  const startEdit = (inst: Installment) => {
    setEditingInstallment(inst);
    setEditForm({
      name: inst.name,
      monthlyValue: inst.monthlyValue,
      totalMonths: inst.totalMonths,
      paymentMethod: inst.paymentMethod || 'Pix',
      categoryId: inst.categoryId || '',
    });
  };

  // Salvar edição
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstallment || !editForm.name.trim() || editForm.monthlyValue <= 0 || editForm.totalMonths < 1) return;

    ledger.editInstallment(
      editingInstallment.id,
      editForm.name.trim(),
      editForm.monthlyValue,
      editForm.totalMonths,
      editForm.paymentMethod,
      editForm.categoryId || undefined
    );

    setEditingInstallment(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag size={22} className="text-primary" />
            Compras Parceladas & Financiamentos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o comprometimento mensal, projeção de quitação e histórico de parcelas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="ledger-btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus size={15} /> Nova Compra Parcelada
          </button>
          <button
            onClick={onGoToDashboard}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3 hover:border-primary"
          >
            <ArrowLeft size={14} /> Ver no Dashboard
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Contratado</p>
          <p className="font-mono font-bold text-lg sm:text-xl text-foreground">{formatCurrency(totalGeral)}</p>
          <p className="text-[10px] text-muted-foreground">{installments.length} compras cadastradas</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Quitado</p>
          <p className="font-mono font-bold text-lg sm:text-xl text-success">{formatCurrency(totalPagoGeral)}</p>
          <p className="text-[10px] text-muted-foreground">
            {totalGeral > 0 ? Math.round((totalPagoGeral / totalGeral) * 100) : 0}% amortizado
          </p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Restante</p>
          <p className="font-mono font-bold text-lg sm:text-xl text-destructive">{formatCurrency(totalRestanteGeral)}</p>
          <p className="text-[10px] text-muted-foreground">Falta quitar</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Neste Mês</p>
          <p className="font-mono font-bold text-lg sm:text-xl text-primary">{formatCurrency(comprometimentoMensalAtual)}</p>
          <p className="text-[10px] text-muted-foreground">{activeThisMonth.length} parcelas ativas</p>
        </div>
      </div>

      {/* Gráfico de Projeção Futura de Parcelas */}
      <section className="ledger-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Calendar size={18} className="text-primary" />
              Projeção de Desembolso Futuro (Próximos 12 Meses)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualize a curva de redução dos seus gastos conforme as parcelas forem sendo quitadas
            </p>
          </div>
        </div>

        {projectionData.some(d => d.valor > 0) ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
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
                        <div className="bg-card border border-border shadow-lg rounded-lg p-2.5 text-xs">
                          <p className="font-medium text-muted-foreground">{data.label}</p>
                          <p className="font-mono font-bold text-primary mt-0.5 text-sm">
                            {formatCurrency(data.valor)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {projectionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.7)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground italic">
            Nenhuma parcela futura projetada.
          </div>
        )}
      </section>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'active', 'done'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`text-xs py-1.5 px-3 rounded-lg border font-medium transition-colors ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {tab === 'all' && 'Todas'}
              {tab === 'active' && 'Em Aberto'}
              {tab === 'done' && 'Quitadas'}
            </button>
          ))}

          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="ledger-input text-xs py-1.5 px-2 bg-card"
          >
            <option value="all">Todas as Formas</option>
            <option value="Pix">Pix</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>
                Cartão: {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por compra..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="ledger-input w-full pl-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Lista de Compras Parceladas */}
      <div className="space-y-3">
        {filteredInstallments.map(inst => {
          const isPix = !inst.paymentMethod || inst.paymentMethod === 'Pix';
          const card = cards.find(c => c.id === inst.paymentMethod);
          const cardName = isPix ? 'Pix' : (card?.name || 'Cartão');
          const category = categories.find(c => c.id === inst.categoryId);
          const totalValue = inst.monthlyValue * inst.totalMonths;
          const paidCount = inst.paidMonths.length;
          const remainingCount = Math.max(0, inst.totalMonths - paidCount);
          const percent = inst.totalMonths > 0 ? Math.min(100, Math.round((paidCount / inst.totalMonths) * 100)) : 0;
          const isDone = paidCount >= inst.totalMonths;

          // Cálculo do mês de quitação
          const [sYear, sMonth] = inst.startDate.split('-').map(Number);
          const start = new Date(sYear, sMonth - 1, 1);
          const endMonthDate = addMonths(start, inst.totalMonths - 1);
          const endMonthLabel = format(endMonthDate, 'MMM/yyyy', { locale: ptBR });

          return (
            <div
              key={inst.id}
              className="ledger-card p-5 space-y-4 group hover:border-border/80 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${isPix ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}>
                    {isPix ? <ShoppingBag size={18} /> : <CreditCard size={18} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-base truncate">{inst.name}</span>
                      
                      {/* Badge da Forma de Pagamento */}
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
                        {cardName}
                      </span>

                      {/* Badge de Categoria */}
                      {category && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border/60 text-foreground/80">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color || 'var(--primary)' }} />
                          {category.name}
                        </span>
                      )}

                      {/* Badge de Status */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isDone
                            ? 'bg-success/15 text-success'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {isDone ? 'Quitada' : `${paidCount}/${inst.totalMonths} Pagas`}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Início: {inst.startDate.split('-').reverse().join('/')}</span>
                      <span>·</span>
                      <span>Término previsto: {endMonthLabel.charAt(0).toUpperCase() + endMonthLabel.slice(1)}</span>
                    </p>
                  </div>
                </div>

                {/* Valores & Ações */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-bold text-foreground text-base sm:text-lg">
                      {formatCurrency(totalValue)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {formatCurrency(inst.monthlyValue)} / mês
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(inst)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      title="Editar compra"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => ledger.removeInstallment(inst.id)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir compra"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono">
                  <span>
                    {percent}% amortizado ({formatCurrency(inst.monthlyValue * paidCount)} pagos)
                  </span>
                  <span>
                    {isDone ? '100% quitada' : `Faltam ${remainingCount} parcela${remainingCount !== 1 ? 's' : ''} (${formatCurrency(inst.monthlyValue * remainingCount)})`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredInstallments.length === 0 && (
          <div className="ledger-card p-12 text-center space-y-3">
            <ShoppingBag size={36} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Nenhuma compra parcelada encontrada.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre suas compras divididas no cartão ou Pix para gerenciar as parcelas futuras e previsão de quitação.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="ledger-btn-primary text-xs py-2 px-4 mx-auto inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Cadastrar Nova Compra
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criação de Compra Parcelada */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-xl rounded-xl p-5 sm:p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus size={16} className="text-primary" />
                  Nova Compra Parcelada
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição da Compra</label>
                  <input
                    type="text"
                    placeholder="Ex: Celular, Geladeira, Sofá..."
                    className="ledger-input w-full text-xs"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor da Parcela</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        placeholder="0,00"
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={addForm.monthlyValue}
                        onChange={val => setAddForm(f => ({ ...f, monthlyValue: val }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Nº de Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      className="ledger-input w-full text-xs font-mono"
                      value={addForm.totalMonths}
                      onChange={e => setAddForm(f => ({ ...f, totalMonths: Math.max(1, Number(e.target.value)) }))}
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg text-xs flex justify-between items-center">
                  <span className="text-muted-foreground">Valor Total Contratado:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(addForm.monthlyValue * addForm.totalMonths)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Forma de Pagamento</label>
                    <select
                      value={addForm.paymentMethod}
                      onChange={e => setAddForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="Pix">Pix / Conta</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>
                          Cartão: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Categoria (Opcional)</label>
                    <select
                      value={addForm.categoryId}
                      onChange={e => setAddForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 ledger-btn-outline py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 ledger-btn-primary py-2 text-xs font-medium">
                    Salvar Compra
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição de Compra Parcelada */}
      <AnimatePresence>
        {editingInstallment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-xl rounded-xl p-5 sm:p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Edit2 size={16} className="text-primary" />
                  Editar Compra Parcelada
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingInstallment(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição da Compra</label>
                  <input
                    type="text"
                    className="ledger-input w-full text-xs"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor da Parcela</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={editForm.monthlyValue}
                        onChange={val => setEditForm(f => ({ ...f, monthlyValue: val }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Nº de Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      className="ledger-input w-full text-xs font-mono"
                      value={editForm.totalMonths}
                      onChange={e => setEditForm(f => ({ ...f, totalMonths: Math.max(1, Number(e.target.value)) }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Forma de Pagamento</label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="Pix">Pix / Conta</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>
                          Cartão: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Categoria</label>
                    <select
                      value={editForm.categoryId}
                      onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="ledger-input w-full text-xs bg-background"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingInstallment(null)}
                    className="flex-1 ledger-btn-outline py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 ledger-btn-primary py-2 text-xs font-medium">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
