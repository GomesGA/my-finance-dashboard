import { useState } from 'react';
import { Target, Plus, Trash2, Check, X, Calendar, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function GoalsTab({ ledger }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', value: '' });

  // Estado para o modal de conclusão da meta
  const [finishingGoalId, setFinishingGoalId] = useState<string | null>(null);
  const [finishForm, setFinishForm] = useState({ actualValue: '', paymentDate: new Date().toISOString().split('T')[0] });

  const formatTextToComma = (raw: string) => {
    let val = raw.replace('.', ',');
    val = val.replace(/[^0-9,]/g, '');
    if ((val.match(/,/g) || []).length > 1) val = val.substring(0, val.lastIndexOf(','));
    return val;
  };

  const parseCurrencyInput = (val: string) => {
    if (val.includes(',')) return Number(val.replace(/\./g, '').replace(',', '.'));
    return Number(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    ledger.addGoal(form.name, Number(form.value));
    setForm({ name: '', value: '' });
    setShowForm(false);
  };

  const handleFinishGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingGoalId || !finishForm.actualValue || !finishForm.paymentDate) return;
    
    const numericValue = parseCurrencyInput(finishForm.actualValue);
    if (isNaN(numericValue)) return;

    ledger.markGoalPurchased(finishingGoalId, numericValue, finishForm.paymentDate);
    setFinishingGoalId(null);
    setFinishForm({ actualValue: '', paymentDate: new Date().toISOString().split('T')[0] });
  };

  const goals = ledger.data.goals;
  const totalGoals = goals.filter(g => !g.purchased).reduce((a, c) => a + c.targetValue, 0);
  const purchased = goals.filter(g => g.purchased).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 relative">
      {/* Modal de Conclusão sobreposto à tela */}
      <AnimatePresence>
        {finishingGoalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-lg rounded-xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Check size={18} className="text-success" />
                  Meta Concluída! 🎉
                </h3>
                <button onClick={() => setFinishingGoalId(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Por quanto você comprou e em qual data? Esse valor não afetará seu saldo principal.</p>
              
              <form onSubmit={handleFinishGoal} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Valor Real Pago</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      className="ledger-input w-full pl-8 font-mono" 
                      placeholder="0,00"
                      value={finishForm.actualValue} 
                      onChange={e => setFinishForm(f => ({ ...f, actualValue: formatTextToComma(e.target.value) }))} 
                      required 
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Data da Compra</label>
                  <input 
                    type="date" 
                    className="ledger-input w-full" 
                    value={finishForm.paymentDate} 
                    onChange={e => setFinishForm(f => ({ ...f, paymentDate: e.target.value }))} 
                    required 
                  />
                </div>
                <button type="submit" className="ledger-btn-primary w-full mt-2">Salvar Conquista</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target size={22} className="text-primary" />
            Metas de Compra
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {goals.length} meta{goals.length !== 1 ? 's' : ''} · {purchased} comprada{purchased !== 1 ? 's' : ''} · {formatCurrency(totalGoals)} restante
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      {/* Form de Nova Meta */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="ledger-card p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Nova Meta</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nome do produto (ex: iPhone 16)"
              className="ledger-input w-full"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
              <input
                type="number"
                placeholder="Valor alvo"
                className="ledger-input w-full font-mono pl-8"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <button type="submit" className="ledger-btn-primary w-full text-center">
              Adicionar Meta
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Goals list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {goals.map(goal => {
            // Calcula diferença se tiver comprado
            const diff = goal.purchased && goal.actualPaidValue ? goal.targetValue - goal.actualPaidValue : 0;
            const hasDiff = goal.purchased && goal.actualPaidValue && diff !== 0;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="ledger-card p-4 flex flex-col gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        if (goal.purchased) {
                          ledger.toggleGoalPurchased(goal.id); // Desmarca
                        } else {
                          setFinishForm(f => ({ ...f, actualValue: String(goal.targetValue).replace('.', ',') }));
                          setFinishingGoalId(goal.id); // Abre o modal
                        }
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        goal.purchased
                          ? 'bg-success border-success text-success-foreground'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {goal.purchased && <Check size={14} />}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${goal.purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {goal.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-sm font-semibold ${goal.purchased ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                      {formatCurrency(goal.targetValue)}
                    </span>
                    <button
                      onClick={() => ledger.removeGoal(goal.id)}
                      className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Exibição dos Detalhes da Compra Realizada */}
                {goal.purchased && goal.actualPaidValue && goal.paymentDate && (
                  <div className="pl-9 pr-8">
                    <div className="bg-muted/40 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border/50">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={14} className="text-primary/70" />
                          <span>Valor Real: <strong className="text-foreground font-mono">{formatCurrency(goal.actualPaidValue)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary/70" />
                          <span>Comprado em: <strong className="text-foreground">{goal.paymentDate.split('-').reverse().join('/')}</strong></span>
                        </div>
                      </div>
                      
                      {hasDiff && (
                        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {diff > 0 ? 'Economizou ' : 'Gastou a mais '}
                          {formatCurrency(Math.abs(diff))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {goals.length === 0 && (
          <div className="ledger-card p-8 text-center">
            <Target size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione desejos de compra para acompanhar.</p>
          </div>
        )}
      </div>
    </div>
  );
}