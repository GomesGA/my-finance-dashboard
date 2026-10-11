import { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  X, 
  Edit2, 
  Check, 
  Info, 
  Clock, 
  Landmark, 
  Calendar, 
  DollarSign, 
  FileText, 
  Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LedgerEntry, BankAccount, Category } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';
import { BankAccountField } from './BankAccountField';
import { CategoryField } from './CategoryField';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  title: string;
  entries: LedgerEntry[];
  type: 'income' | 'expense';
  bankAccounts?: BankAccount[];
  onAddBankAccount?: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  categories?: Category[];
  onAddCategory?: (name: string, color?: string) => Category;
  onAddManual?: (
    date: string, 
    description: string, 
    value: number, 
    paymentMethod: string, 
    bankAccountId?: string, 
    time?: string, 
    categoryId?: string, 
    observation?: string, 
    paidByOthers?: boolean
  ) => void;
  onRemoveEntry?: (id: string, source: string) => void;
  onEditEntry?: (
    id: string, 
    source: string, 
    date: string, 
    desc: string, 
    value: number,
    extra?: {
      time?: string;
      bankAccountId?: string;
      categoryId?: string;
      paymentMethod?: string;
      observation?: string;
      paidByOthers?: boolean;
    }
  ) => void;
}

const parseCurrencyInput = (val: string) => {
  if (val.includes(',')) return Number(val.replace(/\./g, '').replace(',', '.'));
  return Number(val);
};

const PAYMENT_METHODS = ['Pix', 'Boleto', 'TED', 'Outros', 'Cartão'];

const dbToPaymentMethod = (method?: string): string => {
  if (!method) return 'Pix';
  const m = method.toLowerCase();
  if (m === 'card' || m === 'cartão' || m === 'cartao') return 'Cartão';
  if (m === 'boleto') return 'Boleto';
  if (m === 'ted') return 'TED';
  if (m === 'outros') return 'Outros';
  return 'Pix';
};

const getSourceBadge = (source: string) => {
  switch (source) {
    case 'manual-exit':
    case 'manual-entry':
      return null;
    case 'recurring':
      return 'Despesa Recorrente';
    case 'subscription':
      return 'Assinatura';
    case 'installment':
      return 'Compra Parcelada';
    case 'card':
      return 'Fatura do Cartão';
    case 'salary':
      return 'Salário';
    case 'investment-deposit':
    case 'investment-withdraw':
    case 'investment-yield':
      return 'Investimento';
    case 'extra-income':
      return 'Renda Extra';
    case 'extraordinary':
      return 'Despesa Extraordinária';
    default:
      return null;
  }
};

export function LedgerTable({ 
  title, 
  entries, 
  type, 
  bankAccounts = [], 
  onAddBankAccount, 
  categories = [], 
  onAddCategory, 
  onAddManual, 
  onRemoveEntry, 
  onEditEntry 
}: Props) {
  const total = entries.filter(e => !e.paidByOthers).reduce((a, c) => a + c.value, 0);
  const isIncome = type === 'income';
  const [showForm, setShowForm] = useState(false);
  
  // Formulário de Nova Entrada/Saída
  const [form, setForm] = useState({ 
    date: '', 
    description: '', 
    value: '', 
    paymentMethod: 'Pix', 
    bankAccountId: '', 
    time: '', 
    categoryId: '', 
    observation: '', 
    paidByOthers: false 
  });

  // Modal de Edição Completa
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    description: '',
    value: 0,
    time: '',
    paymentMethod: 'Pix',
    bankAccountId: '',
    categoryId: '',
    observation: '',
    paidByOthers: false,
  });

  // Fechar modal no Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingEntry) {
        setEditingEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingEntry]);

  const formatTextToComma = (raw: string) => {
    let val = raw.replace('.', ',');
    val = val.replace(/[^0-9,]/g, '');
    if ((val.match(/,/g) || []).length > 1) val = val.substring(0, val.lastIndexOf(','));
    return val;
  };

  const handleSubmit = () => {
    if (!form.date || !form.description || !form.value) return;
    const numericValue = parseCurrencyInput(form.value);
    if (isNaN(numericValue) || numericValue <= 0) return;
    const isCard = form.paymentMethod === 'Cartão';
    
    onAddManual?.(
      form.date, 
      form.description, 
      numericValue, 
      form.paymentMethod, 
      isCard ? undefined : form.bankAccountId, 
      isCard ? undefined : form.time, 
      form.categoryId || undefined,
      form.observation, 
      form.paidByOthers
    );
    
    setForm({ 
      date: '', 
      description: '', 
      value: '', 
      paymentMethod: 'Pix', 
      bankAccountId: '', 
      time: '', 
      categoryId: '', 
      observation: '', 
      paidByOthers: false 
    });
    setShowForm(false);
  };

  const startEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date,
      description: entry.description,
      value: entry.value,
      time: entry.time || '',
      paymentMethod: dbToPaymentMethod(entry.paymentMethod),
      bankAccountId: entry.bankAccountId || '',
      categoryId: entry.categoryId || '',
      observation: entry.observation || '',
      paidByOthers: entry.paidByOthers ?? false,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (!editForm.date || !editForm.description) return;
    if (editForm.value <= 0) return;

    onEditEntry?.(
      editingEntry.id,
      editingEntry.source,
      editForm.date,
      editForm.description,
      editForm.value,
      {
        time: editForm.time.trim() || undefined,
        bankAccountId: editForm.bankAccountId || undefined,
        categoryId: editForm.categoryId || undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        observation: editForm.observation.trim() || undefined,
        paidByOthers: editForm.paidByOthers,
      }
    );

    setEditingEntry(null);
  };

  return (
    <section className="ledger-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          {isIncome ? <ArrowDownLeft size={18} className="text-success" /> : <ArrowUpRight size={18} className="text-destructive" />}
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(total)}
          </span>
          {onAddManual && (
            <button 
              onClick={() => setShowForm(prev => !prev)} 
              className="ledger-btn-outline flex items-center gap-1 text-xs"
            >
              <Plus size={12} /> Nova
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Criação Rápida */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }} 
            className="p-5 border-b border-border bg-muted/30"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-foreground">
                {isIncome ? 'Adicionar Nova Entrada' : 'Adicionar Nova Saída'}
              </span>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input 
                type="date" 
                className="ledger-input w-full bg-background" 
                value={form.date} 
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
                required 
              />
              <input 
                type="text" 
                placeholder="Descrição" 
                className="ledger-input w-full sm:col-span-2" 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                required 
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono font-medium">R$</span>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  placeholder="0,00" 
                  className="ledger-input w-full font-mono pl-8" 
                  value={form.value} 
                  onChange={e => setForm(f => ({ ...f, value: formatTextToComma(e.target.value) }))} 
                  required 
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 ${form.paymentMethod !== 'Cartão' ? 'sm:grid-cols-2' : ''} gap-4 mt-4`}>
              <select 
                className="ledger-input w-full min-w-0 bg-background" 
                value={form.paymentMethod} 
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
              </select>
              {form.paymentMethod !== 'Cartão' && (
                <input 
                  type="time" 
                  className="ledger-input w-full min-w-0 bg-background" 
                  value={form.time} 
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} 
                  title="Horário" 
                />
              )}
            </div>

            {(form.paymentMethod !== 'Cartão' && onAddBankAccount) || onAddCategory ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {form.paymentMethod !== 'Cartão' && onAddBankAccount && (
                  <div className="min-w-0">
                    <BankAccountField 
                      value={form.bankAccountId} 
                      onChange={bankAccountId => setForm(f => ({ ...f, bankAccountId }))} 
                      bankAccounts={bankAccounts} 
                      onAddBankAccount={onAddBankAccount} 
                      label="Conta Bancária / Banco" 
                    />
                  </div>
                )}
                {onAddCategory && (
                  <div className="min-w-0">
                    <CategoryField 
                      value={form.categoryId} 
                      onChange={categoryId => setForm(f => ({ ...f, categoryId }))} 
                      categories={categories} 
                      onAddCategory={onAddCategory} 
                      label="Categoria"
                    />
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-border/50 pt-4">
              <input 
                type="text" 
                placeholder="Observação detalhada (opcional)" 
                className="ledger-input w-full min-w-0" 
                value={form.observation} 
                onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} 
              />
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none bg-background border border-border px-3 py-2 rounded-md hover:border-primary/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary accent-primary" 
                  checked={form.paidByOthers} 
                  onChange={e => setForm(f => ({ ...f, paidByOthers: e.target.checked }))} 
                />
                Pago por terceiros (não afeta saldo)
              </label>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="ledger-btn-primary px-6 py-2 text-sm shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela de Lançamentos */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-16 text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
              <th className="w-16 text-center px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map(entry => {
                const cat = categories?.find(c => c.id === entry.categoryId);
                const bank = bankAccounts?.find(b => b.id === entry.bankAccountId);

                return (
                  <motion.tr 
                    key={entry.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap align-top">
                      <div className="flex flex-col leading-tight mt-0.5">
                        <span className="font-semibold text-foreground/90">
                          {entry.date.slice(5).split('-').reverse().join('/')}
                        </span>
                        {entry.time && (
                          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                            <Clock size={10} className="inline opacity-70" />
                            {entry.time}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-3 py-3 text-foreground">
                      <div className="flex flex-col gap-1.5">
                        {/* Linha principal: Descrição e selos */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium ${entry.paidByOthers ? 'line-through text-muted-foreground opacity-80' : ''}`}>
                            {entry.description}
                          </span>
                          
                          {entry.paidByOthers && (
                            <span 
                              className="text-[10px] bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-border/50" 
                              title="Valor pago por outra pessoa (não contabilizado no saldo)"
                            >
                              🤝 Terceiros
                            </span>
                          )}

                          {getSourceBadge(entry.source) && (
                            <span className="text-[9px] bg-muted text-muted-foreground/80 px-1.5 py-0.5 rounded font-medium border border-border/40">
                              {getSourceBadge(entry.source)}
                            </span>
                          )}
                        </div>
                        
                        {/* Linha secundária: Categoria, Banco, Forma de Pagamento e Observação */}
                        {(cat || bank || entry.observation || entry.paymentMethod) && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                            {cat && (
                              <span 
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-muted/60 border border-border text-foreground/80 whitespace-nowrap shadow-2xs" 
                                title={`Categoria: ${cat.name}`}
                              >
                                <span 
                                  className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                                  style={{ backgroundColor: cat.color || '#ccc' }} 
                                />
                                {cat.name}
                              </span>
                            )}
                            
                            {bank && (
                              <span 
                                className="flex items-center gap-1 px-2 py-0.5 bg-background border border-border rounded-full shadow-2xs font-medium text-foreground/80" 
                                title={`Conta: ${bank.name} (${bank.kind})`}
                              >
                                <Landmark size={11} className="text-primary/70 shrink-0" />
                                {bank.name}
                              </span>
                            )}

                            {entry.paymentMethod && entry.paymentMethod !== 'Pix' && (
                              <span className="px-1.5 py-0.5 bg-muted/40 border border-border/40 rounded text-muted-foreground font-mono">
                                {dbToPaymentMethod(entry.paymentMethod)}
                              </span>
                            )}

                            {entry.observation && (
                              <span 
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-help transition-colors" 
                                title={`Observação: ${entry.observation}`}
                              >
                                <Info size={13} className="text-primary/70" />
                                <span className="max-w-[150px] truncate text-[10px] italic opacity-80">
                                  {entry.observation}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className={`px-3 py-3 text-right font-mono font-semibold whitespace-nowrap align-top pt-3.5 ${
                      entry.paidByOthers 
                        ? 'text-muted-foreground opacity-50 line-through' 
                        : (isIncome ? 'text-success' : 'text-destructive')
                    }`}>
                      {isIncome ? '+' : '-'} {formatCurrency(entry.value)}
                    </td>

                    <td className="px-2 py-3 align-top pt-3">
                      <div className="flex gap-1 justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(entry)} 
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title={`Editar ${isIncome ? 'entrada' : 'saída'}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => onRemoveEntry?.(entry.id, entry.source)} 
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" 
                          title="Apagar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-foreground italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Moderno e Completo de Edição */}
      <AnimatePresence>
        {editingEntry && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
            onClick={e => {
              if (e.target === e.currentTarget) setEditingEntry(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-card border border-border shadow-2xl rounded-2xl p-5 sm:p-6 w-full max-w-lg my-auto space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                    isIncome ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  }`}>
                    {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground leading-tight">
                      {isIncome ? 'Editar Entrada' : 'Editar Saída'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Altere valores, data, horário, categoria e conta bancária
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulário do Modal */}
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* 1. Descrição */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText size={13} className="text-muted-foreground" />
                    Descrição
                  </label>
                  <input
                    type="text"
                    className="ledger-input w-full text-sm font-medium"
                    placeholder="Ex: Supermercado, Almoço..."
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                {/* 2. Valor e Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-muted-foreground" />
                      Valor
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs font-semibold">
                        R$
                      </span>
                      <CurrencyInput
                        className="ledger-input w-full font-mono text-sm font-semibold pl-9"
                        value={editForm.value}
                        onChange={val => setEditForm(f => ({ ...f, value: val }))}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" />
                      Data
                    </label>
                    <input
                      type="date"
                      className="ledger-input w-full text-sm bg-background"
                      value={editForm.date}
                      onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 3. Horário e Forma de Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-muted-foreground" />
                      Horário
                    </label>
                    <input
                      type="time"
                      className="ledger-input w-full text-sm bg-background"
                      value={editForm.time}
                      onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Opcional (ex: 14:30)
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Forma de Pagamento
                    </label>
                    <select
                      className="ledger-input w-full text-sm bg-background"
                      value={editForm.paymentMethod}
                      onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    >
                      {PAYMENT_METHODS.map(pm => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Categoria e Banco */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="min-w-0">
                    <CategoryField
                      value={editForm.categoryId}
                      onChange={categoryId => setEditForm(f => ({ ...f, categoryId }))}
                      categories={categories}
                      onAddCategory={onAddCategory || ((name, color) => ({ id: crypto.randomUUID(), name, color }))}
                      label="Categoria"
                    />
                  </div>

                  <div className="min-w-0">
                    <BankAccountField
                      value={editForm.bankAccountId}
                      onChange={bankAccountId => setEditForm(f => ({ ...f, bankAccountId }))}
                      bankAccounts={bankAccounts}
                      onAddBankAccount={onAddBankAccount || ((name, kind) => ({ id: crypto.randomUUID(), name, kind }))}
                      label="Conta Bancária / Banco"
                    />
                  </div>
                </div>

                {/* 5. Observação */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Info size={13} className="text-muted-foreground" />
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Detalhes ou anotações sobre este lançamento..."
                    className="ledger-input w-full text-xs"
                    value={editForm.observation}
                    onChange={e => setEditForm(f => ({ ...f, observation: e.target.value }))}
                  />
                </div>

                {/* 6. Pago por terceiros */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  editForm.paidByOthers
                    ? 'bg-primary/10 border-primary/40 shadow-xs'
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                }`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-input text-primary focus:ring-primary accent-primary"
                    checked={editForm.paidByOthers}
                    onChange={e => setEditForm(f => ({ ...f, paidByOthers: e.target.checked }))}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Pago por terceiros
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Marca como despesa paga por outra pessoa (não afeta o saldo final nem gráficos de gastos).
                    </p>
                  </div>
                </label>

                {/* Rodapé do Modal */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="ledger-btn-outline px-4 py-2 text-xs font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!editForm.description || editForm.value <= 0}
                    className="ledger-btn-primary px-5 py-2 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    <Check size={14} />
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}