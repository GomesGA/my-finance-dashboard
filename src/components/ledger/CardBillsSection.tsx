import { useState } from 'react';
import { CreditCard, Plus, Trash2, X, Edit2, Check, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardBill, BankAccount, Category } from '@/types/ledger';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';
import { PaymentModal } from './PaymentModal';
import { CategoryField } from './CategoryField';

interface Props {
  cards: CardBill[]; 
  bankAccounts: BankAccount[]; 
  categories: Category[];
  onAdd: (name?: string, dueDay?: number) => string | void;
  onUpdate: (id: string, patch: Partial<CardBill>) => void;
  onEdit: (id: string, name: string, value: number, dueDay: number, categoryId?: string, details?: string) => void;
  onRemove: (id: string) => void;
  onAddBankAccount: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  onAddCategory: (name: string, color?: string) => Category;
}

export function CardBillsSection({ cards, bankAccounts, categories, onAdd, onUpdate, onEdit, onRemove, onAddBankAccount, onAddCategory }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', dueDay: '10', value: 0, categoryId: '', details: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', value: 0, dueDay: '', categoryId: '', details: '' });
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cardName = addForm.name.trim();
    if (!cardName) return;

    const dueDay = Number(addForm.dueDay) || 1;
    const newCardId = onAdd(cardName, dueDay);

    if (newCardId && (addForm.value > 0 || addForm.categoryId || addForm.details)) {
      onUpdate(newCardId, {
        value: addForm.value || 0,
        categoryId: addForm.categoryId || undefined,
        details: addForm.details || undefined,
      });
    }

    setAddForm({ name: '', dueDay: '10', value: 0, categoryId: '', details: '' });
    setShowAddForm(false);
  };

  const startEdit = (card: CardBill) => { 
    setEditingId(card.id); 
    setEditForm({ 
      name: card.name, 
      value: card.value, 
      dueDay: String(card.dueDay || 1), 
      categoryId: card.categoryId || '',
      details: card.details || '' 
    }); 
  };
  
  const saveEdit = (id: string) => { 
    onEdit(id, editForm.name, editForm.value, Number(editForm.dueDay) || 1, editForm.categoryId || undefined, editForm.details); 
    setEditingId(null); 
  };

  const total = cards.reduce((acc, card) => acc + card.value, 0);

  return (
    <section className="ledger-card p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          <CreditCard size={18} className="text-muted-foreground" /> Faturas de Cartão
        </h2>
        <button type="button" onClick={() => setShowAddForm(true)} className="ledger-btn-outline flex items-center gap-1">
          <Plus size={14} /> Novo Cartão
        </button>
      </div>

      {/* Formulário animado para cadastrar novo cartão */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateCard}
            className="mb-4 p-4 bg-muted rounded-lg border border-border space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Novo Cartão de Crédito</span>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Nome do cartão (ex: Nubank, Inter)"
              className="ledger-input w-full"
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              required
            />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <CurrencyInput
                  placeholder="Fatura atual"
                  className="ledger-input w-full font-mono pl-7"
                  value={addForm.value}
                  onChange={val => setAddForm(f => ({ ...f, value: val }))}
                />
              </div>
              <input
                type="number"
                placeholder="Dia Venc."
                className="ledger-input w-full text-center"
                min={1}
                max={31}
                value={addForm.dueDay}
                onChange={e => setAddForm(f => ({ ...f, dueDay: e.target.value }))}
                required
              />
            </div>

            <CategoryField
              value={addForm.categoryId}
              onChange={categoryId => setAddForm(f => ({ ...f, categoryId }))}
              categories={categories}
              onAddCategory={onAddCategory}
              label="Categoria (opcional)"
            />

            <textarea
              placeholder="Rascunho de gastos (opcional, ex: Uber 25, Ifood 60)..."
              className="ledger-input w-full text-xs min-h-[50px] resize-y font-mono"
              value={addForm.details}
              onChange={e => setAddForm(f => ({ ...f, details: e.target.value }))}
            />

            <button type="submit" className="ledger-btn-primary w-full text-center">
              Confirmar Cartão
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {cards.map(card => {
            const isEditing = editingId === card.id;

            if (isEditing) {
              return (
                <motion.div key={card.id} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                  <input type="text" placeholder="Nome do Cartão" className="ledger-input w-full text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  
                  <div className="flex gap-2">
                    <CurrencyInput placeholder="Valor da Fatura" className="ledger-input w-full font-mono text-xs" value={editForm.value} onChange={val => setEditForm(f => ({ ...f, value: val }))} />
                    <input type="number" placeholder="Venc." className="ledger-input w-16 text-xs text-center" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: e.target.value }))} />
                  </div>
                  
                  <CategoryField value={editForm.categoryId} onChange={categoryId => setEditForm(f => ({ ...f, categoryId }))} categories={categories} onAddCategory={onAddCategory} label="" />
                  
                  {/* Campo de rascunho para anotações livres da fatura */}
                  <textarea 
                    placeholder="Rascunho de gastos (ex: Uber 20, Ifood 50)..." 
                    className="ledger-input w-full text-xs min-h-[60px] resize-y font-mono" 
                    value={editForm.details} 
                    onChange={e => setEditForm(f => ({ ...f, details: e.target.value }))} 
                  />

                  <div className="flex gap-2 mt-2">
                    <button onClick={() => saveEdit(card.id)} className="flex-1 ledger-btn-primary py-1.5 text-xs flex justify-center items-center gap-1"><Check size={14} /> Salvar</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 ledger-btn-outline py-1.5 text-xs flex justify-center items-center gap-1"><X size={14} /> Cancelar</button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div key={card.id} className="flex flex-col p-3 bg-muted/50 rounded-lg border border-border group mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-4 flex items-center justify-center shrink-0">
                      <input type="checkbox" checked={card.paid} onChange={e => e.target.checked ? setPayingId(card.id) : onUpdate(card.id, { paid: false })} className="ledger-checkbox" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium truncate ${card.paid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{card.name || 'Novo Cartão'}</span>
                      <span className="text-[10px] text-muted-foreground">Pagamento: dia {card.dueDay || 1}</span>
                      
                      {/* Botão para exibir o detalhamento se houver algo anotado */}
                      {card.details && (
                        <button onClick={() => setExpandedId(expandedId === card.id ? null : card.id)} className="text-[10px] text-primary flex items-center gap-1 mt-0.5 hover:underline w-max">
                          <AlignLeft size={10} /> {expandedId === card.id ? 'Ocultar rascunho' : 'Ver rascunho'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(card.value || 0)}</span>
                    <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-1">
                      <button type="button" onClick={() => startEdit(card)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                      <button type="button" onClick={() => onRemove(card.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
                
                {/* Área expandida do rascunho */}
                {expandedId === card.id && card.details && (
                  <div className="mt-3 p-2 bg-background border border-border rounded text-[11px] text-muted-foreground whitespace-pre-wrap font-mono ml-7">
                    {card.details}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {cards.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Nenhum cartão cadastrado.</p>}
      </div>

      {cards.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">Total Faturas:</span>
          <span className="font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      )}

      <PaymentModal
        open={!!payingId}
        onClose={() => setPayingId(null)}
        onConfirm={(bankAccountId, paidAtIso) => payingId && onUpdate(payingId, { paid: true, paymentDate: paidAtIso.slice(0, 10), bankAccountId, paidAt: paidAtIso })}
        bankAccounts={bankAccounts}
        onAddBankAccount={onAddBankAccount}
        title="Confirmar Pagamento da Fatura"
      />
    </section>
  );
}