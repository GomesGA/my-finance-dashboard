import { useState, useMemo } from 'react';
import { Target, Plus, Trash2, Check, X, Calendar, DollarSign, Edit2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/format';
import { CurrencyInput } from '@/components/CurrencyInput';
import type { useLedgerData } from '@/hooks/useLedgerData';
import type { Goal } from '@/types/ledger';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function GoalsTab({ ledger }: Props) {
  const goals = ledger.data.goals;

  // Estado para o formulário de nova meta
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    targetValue: 0,
    actualPaidValue: 0,
  });

  // Estado para o modal de conclusão rápida
  const [finishingGoalId, setFinishingGoalId] = useState<string | null>(null);
  const [finishForm, setFinishForm] = useState({
    actualValue: 0,
    paymentDate: new Date().toISOString().split('T')[0],
  });

  // Estado para o modal de edição completa
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    targetValue: 0,
    actualPaidValue: 0,
    paymentDate: '',
    purchased: false,
  });

  // Submissão de nova meta
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || addForm.targetValue <= 0) return;
    const initialPaid = addForm.actualPaidValue > 0 ? addForm.actualPaidValue : undefined;
    ledger.addGoal(addForm.name.trim(), addForm.targetValue, initialPaid);
    setAddForm({ name: '', targetValue: 0, actualPaidValue: 0 });
    setShowAddForm(false);
  };

  // Conclusão rápida
  const handleFinishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingGoalId || finishForm.actualValue < 0 || !finishForm.paymentDate) return;
    ledger.markGoalPurchased(finishingGoalId, finishForm.actualValue, finishForm.paymentDate);
    setFinishingGoalId(null);
    setFinishForm({ actualValue: 0, paymentDate: new Date().toISOString().split('T')[0] });
  };

  // Iniciar edição
  const startEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditForm({
      name: goal.name,
      targetValue: goal.targetValue,
      actualPaidValue: goal.actualPaidValue ?? 0,
      paymentDate: goal.paymentDate || new Date().toISOString().split('T')[0],
      purchased: goal.purchased,
    });
  };

  // Salvar edição
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editForm.name.trim() || editForm.targetValue <= 0) return;
    const actualPaid = editForm.actualPaidValue > 0 ? editForm.actualPaidValue : undefined;
    ledger.editGoal(editingGoal.id, {
      name: editForm.name.trim(),
      targetValue: editForm.targetValue,
      actualPaidValue: actualPaid,
      paymentDate: editForm.purchased ? editForm.paymentDate : undefined,
      purchased: editForm.purchased,
    });
    setEditingGoal(null);
  };

  // KPIs
  const summary = useMemo(() => {
    const totalTarget = goals.reduce((a, c) => a + c.targetValue, 0);
    const totalPaid = goals.reduce((a, c) => a + (c.actualPaidValue ?? (c.purchased ? c.targetValue : 0)), 0);
    const completedCount = goals.filter(g => g.purchased).length;
    const pendingCount = goals.length - completedCount;
    const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalPaid / totalTarget) * 100)) : 0;
    return {
      totalTarget,
      totalPaid,
      remaining: Math.max(0, totalTarget - totalPaid),
      completedCount,
      pendingCount,
      overallProgress,
    };
  }, [goals]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target size={22} className="text-primary" />
            Metas de Compra & Objetivos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o valor desejado, o valor pago e o progresso de cada conquista
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="ledger-btn-primary flex items-center justify-center gap-1.5 self-start sm:self-auto text-xs py-2 px-3.5"
        >
          <Plus size={15} />
          Nova Meta
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Desejado</p>
          <p className="font-mono font-bold text-lg text-foreground">{formatCurrency(summary.totalTarget)}</p>
          <p className="text-[10px] text-muted-foreground">{goals.length} meta{goals.length !== 1 ? 's' : ''} no total</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Já Pago</p>
          <p className="font-mono font-bold text-lg text-success">{formatCurrency(summary.totalPaid)}</p>
          <p className="text-[10px] text-muted-foreground">{summary.completedCount} concluída{summary.completedCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Restante</p>
          <p className="font-mono font-bold text-lg text-primary">{formatCurrency(summary.remaining)}</p>
          <p className="text-[10px] text-muted-foreground">{summary.pendingCount} pendente{summary.pendingCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="ledger-card p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Progresso Geral</p>
          <p className="font-mono font-bold text-lg text-foreground">{summary.overallProgress}%</p>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
            <div className="bg-success h-full rounded-full transition-all duration-500" style={{ width: `${summary.overallProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Modal de Conclusão Rápida */}
      <AnimatePresence>
        {finishingGoalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-xl rounded-xl p-5 sm:p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-success" />
                  Meta Concluída! 🎉
                </h3>
                <button
                  type="button"
                  onClick={() => setFinishingGoalId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Informe o valor real pago e a data da conquista.
              </p>

              <form onSubmit={handleFinishSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Valor Real Pago</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                    <CurrencyInput
                      className="ledger-input w-full pl-8 font-mono text-sm"
                      placeholder="0,00"
                      value={finishForm.actualValue}
                      onChange={val => setFinishForm(f => ({ ...f, actualValue: val }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Data da Compra</label>
                  <input
                    type="date"
                    className="ledger-input w-full text-xs"
                    value={finishForm.paymentDate}
                    onChange={e => setFinishForm(f => ({ ...f, paymentDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFinishingGoalId(null)}
                    className="flex-1 ledger-btn-outline py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 ledger-btn-primary py-2 text-xs font-medium">
                    Salvar Conquista
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição Completa */}
      <AnimatePresence>
        {editingGoal && (
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
                  Editar Meta
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Nome do Objetivo</label>
                  <input
                    type="text"
                    className="ledger-input w-full text-sm"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: iPhone, Viagem, Curso..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor Desejado (Alvo)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        className="ledger-input w-full pl-7 font-mono text-xs"
                        value={editForm.targetValue}
                        onChange={val => setEditForm(f => ({ ...f, targetValue: val }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor Pago / Guardado</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        className="ledger-input w-full pl-7 font-mono text-xs"
                        value={editForm.actualPaidValue}
                        onChange={val => setEditForm(f => ({ ...f, actualPaidValue: val }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit-purchased"
                    checked={editForm.purchased}
                    onChange={e => setEditForm(f => ({ ...f, purchased: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="edit-purchased" className="text-xs text-foreground cursor-pointer font-medium">
                    Marcar como meta concluída / comprada
                  </label>
                </div>

                {editForm.purchased && (
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Data da Compra / Conclusão</label>
                    <input
                      type="date"
                      className="ledger-input w-full text-xs"
                      value={editForm.paymentDate}
                      onChange={e => setEditForm(f => ({ ...f, paymentDate: e.target.value }))}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingGoal(null)}
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

      {/* Formulário de Nova Meta */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddSubmit}
            className="ledger-card p-5 space-y-4 overflow-hidden border border-primary/20"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Cadastrar Nova Meta
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-foreground mb-1 block">Nome do Objetivo</label>
                <input
                  type="text"
                  placeholder="Ex: Novo Smartphone"
                  className="ledger-input w-full text-xs"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Valor Desejado (Alvo)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                  <CurrencyInput
                    placeholder="0,00"
                    className="ledger-input w-full font-mono text-xs pl-8"
                    value={addForm.targetValue}
                    onChange={val => setAddForm(f => ({ ...f, targetValue: val }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Valor Já Pago / Guardado (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                  <CurrencyInput
                    placeholder="0,00"
                    className="ledger-input w-full font-mono text-xs pl-8"
                    value={addForm.actualPaidValue}
                    onChange={val => setAddForm(f => ({ ...f, actualPaidValue: val }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="ledger-btn-outline py-2 px-4 text-xs"
              >
                Cancelar
              </button>
              <button type="submit" className="ledger-btn-primary py-2 px-6 text-xs font-medium">
                Criar Meta
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista de Metas */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {goals.map(goal => {
            const paidVal = goal.actualPaidValue ?? (goal.purchased ? goal.targetValue : 0);
            const progress = goal.targetValue > 0 ? Math.min(100, Math.round((paidVal / goal.targetValue) * 100)) : 0;
            const diff = goal.purchased && goal.actualPaidValue ? goal.targetValue - goal.actualPaidValue : 0;
            const hasDiff = goal.purchased && goal.actualPaidValue && diff !== 0;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="ledger-card p-5 space-y-3.5 group hover:border-border/80 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        if (goal.purchased) {
                          ledger.toggleGoalPurchased(goal.id);
                        } else {
                          setFinishForm({
                            actualValue: goal.actualPaidValue || goal.targetValue,
                            paymentDate: new Date().toISOString().split('T')[0],
                          });
                          setFinishingGoalId(goal.id);
                        }
                      }}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        goal.purchased
                          ? 'bg-success border-success text-success-foreground'
                          : 'border-border hover:border-primary text-transparent'
                      }`}
                      title={goal.purchased ? 'Marcar como não concluída' : 'Marcar como concluída'}
                    >
                      <Check size={15} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-base font-semibold truncate ${goal.purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {goal.name}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            goal.purchased
                              ? 'bg-success/15 text-success'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {goal.purchased ? 'Concluída' : 'Em Andamento'}
                        </span>
                      </div>

                      {goal.paymentDate && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> Conquistado em {goal.paymentDate.split('-').reverse().join('/')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(goal)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      title="Editar meta"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => ledger.removeGoal(goal.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      title="Excluir meta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Exibição Clara: Valor Desejado vs Valor Pago */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                      🎯 Valor Desejado
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {formatCurrency(goal.targetValue)}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                      💰 Valor Pago
                    </span>
                    <span className={`font-mono font-bold text-sm ${paidVal > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {formatCurrency(paidVal)}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end">
                    {hasDiff ? (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${diff > 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                        {diff > 0 ? `Economizou ${formatCurrency(diff)}` : `Excedeu ${formatCurrency(Math.abs(diff))}`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {goal.purchased ? 'Meta quitada' : `${progress}% alcançado`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${goal.purchased ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${goal.purchased ? 100 : progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{progress}% concluído</span>
                    <span>Restante: {formatCurrency(Math.max(0, goal.targetValue - paidVal))}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {goals.length === 0 && (
          <div className="ledger-card p-12 text-center space-y-3">
            <Target size={36} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Nenhuma meta cadastrada.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Adicione sonhos e compras futuras com valor desejado e valor pago para acompanhar sua evolução financeira.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="ledger-btn-primary text-xs py-2 px-4 mx-auto inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Cadastrar Primeira Meta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}