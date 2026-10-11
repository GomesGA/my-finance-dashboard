import { useState, useMemo } from 'react';
import { CreditCard, Plus, Trash2, Edit2, Check, X, Calendar, RefreshCw, CheckCircle2, AlertCircle, ShoppingBag, Sparkles, Tag, ArrowUpRight, Ban, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import { CurrencyInput } from '@/components/CurrencyInput';
import { PaymentModal } from './PaymentModal';
import { CategoryField } from './CategoryField';
import type { useLedgerData } from '@/hooks/useLedgerData';
import type { CardInvoiceItem, CardBill, Card } from '@/types/ledger';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
  onGoToInstallments?: () => void;
}

export function CardsTab({ ledger, onGoToInstallments }: Props) {
  const cards = ledger.data.cards;
  const computedCardBills = ledger.computedCardBills;
  const cardInvoiceItems = ledger.cardInvoiceItems;
  const activeInstallments = ledger.activeInstallments;
  const activeSubscriptions = ledger.activeSubscriptions;
  const categories = ledger.categories;
  const bankAccounts = ledger.bankAccounts;
  const monthKey = ledger.monthKey;
  const currentDate = ledger.currentDate;

  // Cartão selecionado
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.id || null);

  // Se o cartão selecionado não existir mais, seleciona o primeiro
  const activeCardId = cards.some(c => c.id === selectedCardId) ? selectedCardId : (cards[0]?.id || null);

  // Modais de Criação de Cartão
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardForm, setAddCardForm] = useState({ name: '', dueDay: '10' });

  // Modal de Adicionar Compra na Fatura
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    description: '',
    value: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    cardId: activeCardId || '',
    categoryId: '',
    isInstallment: false,
    totalMonths: 2,
  });

  // Modal de Edição de Compra da Fatura
  const [editingPurchase, setEditingPurchase] = useState<CardInvoiceItem | null>(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    description: '',
    value: 0,
    date: '',
    cardId: '',
    categoryId: '',
  });

  // Modal de Pagamento de Fatura
  const [payingCardId, setPayingCardId] = useState<string | null>(null);

  // Cartão ativo selecionado e sua fatura correspondente no mês
  const activeCard = cards.find(c => c.id === activeCardId);
  const activeCardBill = computedCardBills.find(cb => cb.id === activeCardId);

  // Itens da fatura do cartão ativo
  const activeInvoiceItems = useMemo(() => {
    if (!activeCardId) return [];
    return cardInvoiceItems.filter(item => item.cardId === activeCardId);
  }, [cardInvoiceItems, activeCardId]);

  // Parcelas ativas deste cartão que caem neste mês
  const activeCardInstallments = useMemo(() => {
    if (!activeCardId) return [];
    return activeInstallments.filter(inst => {
      if (inst.paymentMethod !== activeCardId) return false;
      const [sYear, sMonth] = inst.startDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, 1);
      const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const diff = differenceInMonths(current, start);
      return diff >= 0 && diff < inst.totalMonths;
    });
  }, [activeInstallments, activeCardId, currentDate]);

  // Assinaturas ativas cobradas neste cartão
  const activeCardSubscriptions = useMemo(() => {
    if (!activeCardId) return [];
    return activeSubscriptions.filter(sub => sub.paymentMethod === activeCardId);
  }, [activeSubscriptions, activeCardId]);

  // Totais calculados da fatura do cartão ativo
  const totalInvoicePurchases = useMemo(
    () => activeInvoiceItems.reduce((acc, item) => acc + Number(item.value), 0),
    [activeInvoiceItems]
  );

  const totalInstallmentsThisMonth = useMemo(
    () => activeCardInstallments.reduce((acc, inst) => acc + Number(inst.monthlyValue), 0),
    [activeCardInstallments]
  );

  const totalSubscriptionsThisMonth = useMemo(
    () => activeCardSubscriptions.reduce((acc, sub) => {
      const val = ledger.currentMonthData.subscriptionValueOverrides[sub.id] ?? sub.value;
      return acc + Number(val);
    }, 0),
    [activeCardSubscriptions, ledger.currentMonthData.subscriptionValueOverrides]
  );

  const calculatedInvoiceTotal = totalInvoicePurchases + totalInstallmentsThisMonth + totalSubscriptionsThisMonth;

  // Handlers para Cartões
  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCardForm.name.trim()) return;
    const newId = ledger.addCard(addCardForm.name.trim(), Number(addCardForm.dueDay) || 1);
    if (newId) setSelectedCardId(newId);
    setAddCardForm({ name: '', dueDay: '10' });
    setShowAddCardModal(false);
  };

  // Handlers para Compras
  const openAddPurchaseModal = () => {
    const nonCancelledCard = cards.find(c => !c.isCancelled);
    setPurchaseForm({
      description: '',
      value: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      cardId: (!activeCard?.isCancelled ? activeCardId : nonCancelledCard?.id) || '',
      categoryId: '',
      isInstallment: false,
      totalMonths: 2,
    });
    setShowAddPurchaseModal(true);
  };

  const handleAddPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.description.trim() || purchaseForm.value <= 0 || !purchaseForm.cardId) return;

    if (purchaseForm.isInstallment) {
      // Cria como compra parcelada vinculada ao cartão
      ledger.addInstallment(
        purchaseForm.description.trim(),
        purchaseForm.value / Math.max(1, purchaseForm.totalMonths),
        Math.max(1, purchaseForm.totalMonths),
        purchaseForm.cardId,
        purchaseForm.categoryId || undefined
      );
    } else {
      // Cria como compra avulsa na fatura do mês
      ledger.addCardInvoiceItem(
        purchaseForm.cardId,
        purchaseForm.description.trim(),
        purchaseForm.value,
        purchaseForm.date,
        purchaseForm.categoryId || undefined
      );
    }

    // Auto sincroniza o valor da fatura do cartão
    setTimeout(() => {
      ledger.syncCardBillValue(purchaseForm.cardId);
    }, 100);

    setShowAddPurchaseModal(false);
  };

  const startEditPurchase = (item: CardInvoiceItem) => {
    setEditingPurchase(item);
    setEditPurchaseForm({
      description: item.description,
      value: item.value,
      date: item.date,
      cardId: item.cardId,
      categoryId: item.categoryId || '',
    });
  };

  const handleEditPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || !editPurchaseForm.description.trim() || editPurchaseForm.value <= 0) return;

    ledger.editCardInvoiceItem(
      editingPurchase.id,
      editPurchaseForm.cardId,
      editPurchaseForm.description.trim(),
      editPurchaseForm.value,
      editPurchaseForm.date,
      editPurchaseForm.categoryId || undefined
    );

    setTimeout(() => {
      ledger.syncCardBillValue(editPurchaseForm.cardId);
    }, 100);

    setEditingPurchase(null);
  };

  const handleRemovePurchase = (id: string, cardId: string) => {
    ledger.removeCardInvoiceItem(id);
    setTimeout(() => {
      ledger.syncCardBillValue(cardId);
    }, 100);
  };

  const handleSyncBill = () => {
    if (activeCardId) {
      ledger.syncCardBillValue(activeCardId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard size={22} className="text-primary" />
            Faturas dos Cartões de Crédito
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lance compra por compra na fatura, acompanhe parcelas do mês e quite o cartão de forma integrada
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={openAddPurchaseModal}
            disabled={cards.filter(c => !c.isCancelled).length === 0}
            className="ledger-btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={cards.filter(c => !c.isCancelled).length === 0 ? 'Não há cartões ativos para lançar compras' : undefined}
          >
            <Plus size={15} /> Nova Compra no Cartão
          </button>

          <button
            onClick={() => setShowAddCardModal(true)}
            className="ledger-btn-outline flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Plus size={14} /> Novo Cartão
          </button>
        </div>
      </div>

      {/* Carrossel / Grid de Cartões */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map(c => {
            const bill = computedCardBills.find(cb => cb.id === c.id);
            const isSelected = c.id === activeCardId;
            const isPaid = bill?.paid;
            const currentBillValue = bill?.value || 0;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-card shadow-md'
                    : 'border-border bg-card/60 hover:bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">Vencimento: dia {c.dueDay}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {c.isCancelled && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 bg-destructive/15 text-destructive border border-destructive/20">
                        Cancelado
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        isPaid
                          ? 'bg-success/15 text-success'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isPaid ? 'Paga' : 'Aberta'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Fatura Atual</span>
                    <p className="font-mono font-bold text-base text-foreground">
                      {formatCurrency(currentBillValue)}
                    </p>
                  </div>

                  <span className={`text-xs font-medium flex items-center gap-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isSelected ? 'Selecionado' : 'Ver Fatura'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ledger-card p-10 text-center space-y-3">
          <CreditCard size={36} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Nenhum cartão de crédito cadastrado.</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cadastre o seu primeiro cartão para começar a detalhar as compras da fatura e sincronizar com compras parceladas.
          </p>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="ledger-btn-primary text-xs py-2 px-4 mx-auto inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Cadastrar Meu Primeiro Cartão
          </button>
        </div>
      )}

      {/* Painel da Fatura do Cartão Selecionado */}
      {activeCard && (
        <div className="space-y-6">
          {/* Banner de Cartão Cancelado se for o caso */}
          {activeCard.isCancelled && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <div className="flex items-center gap-2.5">
                <Ban size={20} className="shrink-0" />
                <div className="text-xs">
                  <span className="font-bold mr-1">Cartão Cancelado:</span>
                  Este cartão foi marcado como cancelado. Novas compras estão bloqueadas, mas a fatura e parcelas continuam listadas para quitação contábil.
                </div>
              </div>
              <button
                type="button"
                onClick={() => ledger.toggleCancelCard(activeCard.id)}
                className="ledger-btn-outline text-xs py-1.5 px-3 bg-background hover:bg-muted text-foreground shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RotateCcw size={13} /> Reativar Cartão
              </button>
            </div>
          )}

          {/* Card de Destaque da Fatura */}
          <div className="ledger-card p-5 sm:p-6 space-y-5 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg font-bold text-foreground">
                    Fatura {activeCard.name}
                  </h3>
                  {activeCard.isCancelled && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20">
                      Cancelado
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    ({format(currentDate, 'MMMM yyyy', { locale: ptBR })})
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      activeCardBill?.paid
                        ? 'bg-success/15 text-success'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {activeCardBill?.paid ? 'Fatura Paga' : 'Fatura em Aberto'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vencimento no dia {activeCard.dueDay} • Registre suas compras e acompanhe a soma automática da fatura
                </p>
              </div>

              {/* Ações de Pagamento e Cancelamento */}
              <div className="flex items-center gap-2 flex-wrap">
                {!activeCard.isCancelled ? (
                  <button
                    type="button"
                    onClick={() => ledger.toggleCancelCard(activeCard.id)}
                    title="Marcar este cartão como cancelado"
                    className="ledger-btn-outline text-muted-foreground hover:text-destructive hover:border-destructive/30 flex items-center gap-1.5 text-xs py-2 px-3"
                  >
                    <Ban size={13} /> Cancelar Cartão
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => ledger.toggleCancelCard(activeCard.id)}
                    title="Reativar este cartão para novas compras"
                    className="ledger-btn-outline text-muted-foreground hover:text-success hover:border-success/30 flex items-center gap-1.5 text-xs py-2 px-3"
                  >
                    <RotateCcw size={13} /> Reativar Cartão
                  </button>
                )}

                {activeCardBill?.paid ? (
                  <button
                    type="button"
                    onClick={() => ledger.updateCard(activeCard.id, { paid: false })}
                    className="ledger-btn-outline text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center gap-1.5 text-xs py-2 px-3.5"
                  >
                    <X size={14} /> Desmarcar Pagamento
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPayingCardId(activeCard.id)}
                    className="ledger-btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
                  >
                    <CheckCircle2 size={15} /> Pagar Fatura
                  </button>
                )}
              </div>
            </div>

            {/* KPI Cards da Fatura */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total da Fatura</span>
                <p className="font-mono font-bold text-lg sm:text-xl text-foreground mt-0.5">
                  {formatCurrency(activeCardBill?.value || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {activeCardBill?.paid ? 'Valor pago registrado' : 'Soma em tempo real (em aberto)'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Compras À Vista</span>
                <p className="font-mono font-bold text-lg sm:text-xl text-primary mt-0.5">
                  {formatCurrency(totalInvoicePurchases)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeInvoiceItems.length} compras avulsas</p>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Parcelas no Mês</span>
                <p className="font-mono font-bold text-lg sm:text-xl text-indigo-500 mt-0.5">
                  {formatCurrency(totalInstallmentsThisMonth)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeCardInstallments.length} compras parceladas</p>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Assinaturas no Cartão</span>
                <p className="font-mono font-bold text-lg sm:text-xl text-teal-500 mt-0.5">
                  {formatCurrency(totalSubscriptionsThisMonth)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeCardSubscriptions.length} assinaturas</p>
              </div>
            </div>
          </div>

          {/* Seção 1: Compras da Fatura (Item por Item) */}
          <div className="ledger-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                  <Tag size={17} className="text-primary" />
                  Compras Lançadas na Fatura (À Vista)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Gastos individuais registrados diretamente nesta fatura de {activeCard.name}
                </p>
              </div>

              <button
                type="button"
                onClick={openAddPurchaseModal}
                disabled={activeCard.isCancelled}
                className="ledger-btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                title={activeCard.isCancelled ? 'Cartão cancelado. Não é possível lançar novas compras.' : undefined}
              >
                <Plus size={14} /> Adicionar Compra
              </button>
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {activeInvoiceItems.map(item => {
                  const category = categories.find(c => c.id === item.categoryId);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border group hover:border-border/80 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-background text-primary shrink-0 border border-border/50">
                          <Tag size={14} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">{item.description}</span>
                            {category && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border/60 text-foreground/80">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color || 'var(--primary)' }} />
                                {category.name}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                            <Calendar size={11} /> {item.date ? item.date.split('-').reverse().join('/') : 'Data não informada'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {formatCurrency(item.value)}
                        </span>
                        <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-1">
                          <button
                            type="button"
                            onClick={() => startEditPurchase(item)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-background"
                            title="Editar compra"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePurchase(item.id, activeCard.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-background"
                            title="Remover compra"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {activeInvoiceItems.length === 0 && (
                <div className="p-8 text-center rounded-lg border border-dashed border-border/70 space-y-2">
                  <Tag size={28} className="mx-auto text-muted-foreground/30" />
                  <p className="text-xs font-medium text-muted-foreground">Nenhuma compra avulsa lançada nesta fatura.</p>
                  <button
                    onClick={openAddPurchaseModal}
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Lançar primeira compra
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Compras Parceladas Cobradas nesta Fatura */}
          {activeCardInstallments.length > 0 && (
            <div className="ledger-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                    <ShoppingBag size={17} className="text-indigo-500" />
                    Parcelas do Cartão Cobradas neste Mês
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Compras parceladas cujo vencimento cai na fatura deste mês. Ao pagar o cartão, essas parcelas são quitadas automaticamente.
                  </p>
                </div>

                {onGoToInstallments && (
                  <button
                    type="button"
                    onClick={onGoToInstallments}
                    className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Ver na aba Parcelas <ArrowUpRight size={13} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeCardInstallments.map(inst => {
                  const num = ledger.getInstallmentNumber(inst);
                  const isPaid = activeCardBill?.paid || inst.paidMonths.includes(monthKey);
                  const category = categories.find(c => c.id === inst.categoryId);

                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isPaid ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isPaid ? <Check size={11} className="stroke-[3]" /> : <CreditCard size={11} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold truncate ${isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {inst.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground">
                              Parc. {num} de {inst.totalMonths}
                            </span>
                            {category && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border/60 text-foreground/80">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color || 'var(--primary)' }} />
                                {category.name}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground mt-0.5 block">
                            {isPaid ? (
                              <span className="text-success font-medium">✓ Paga nesta fatura de {activeCard.name}</span>
                            ) : (
                              <span>Aguardando pagamento da fatura</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {formatCurrency(inst.monthlyValue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção 3: Assinaturas Recorrentes no Cartão */}
          {activeCardSubscriptions.length > 0 && (
            <div className="ledger-card p-5 sm:p-6 space-y-4">
              <div>
                <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                  <Sparkles size={17} className="text-teal-500" />
                  Assinaturas Cobradas neste Cartão
                </h4>
                <p className="text-xs text-muted-foreground">
                  Serviços recorrentes programados para serem debitados nesta fatura
                </p>
              </div>

              <div className="space-y-2">
                {activeCardSubscriptions.map(sub => {
                  const val = ledger.currentMonthData.subscriptionValueOverrides[sub.id] ?? sub.value;
                  const isPaid = activeCardBill?.paid || ledger.currentMonthData.subscriptionPaidState[sub.id];

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-background text-teal-500 shrink-0 border border-border/50">
                          <Sparkles size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate block">{sub.name}</span>
                          <span className="text-[11px] text-muted-foreground">Vencimento dia {sub.dueDay}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {formatCurrency(val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nova Compra no Cartão */}
      <AnimatePresence>
        {showAddPurchaseModal && (
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
                  Nova Compra no Cartão
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddPurchaseSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cartão</label>
                  <select
                    value={purchaseForm.cardId}
                    onChange={e => setPurchaseForm(f => ({ ...f, cardId: e.target.value }))}
                    className="ledger-input w-full text-xs bg-background"
                    required
                  >
                    {cards.filter(c => !c.isCancelled).map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Venc. dia {c.dueDay})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição da Compra</label>
                  <input
                    type="text"
                    placeholder="Ex: Supermercado, Uber, Restaurante..."
                    className="ledger-input w-full text-xs"
                    value={purchaseForm.description}
                    onChange={e => setPurchaseForm(f => ({ ...f, description: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        placeholder="0,00"
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={purchaseForm.value}
                        onChange={val => setPurchaseForm(f => ({ ...f, value: val }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Data da Compra</label>
                    <input
                      type="date"
                      className="ledger-input w-full text-xs bg-background"
                      value={purchaseForm.date}
                      onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <CategoryField
                  value={purchaseForm.categoryId}
                  onChange={categoryId => setPurchaseForm(f => ({ ...f, categoryId }))}
                  categories={categories}
                  onAddCategory={ledger.addCategory}
                  label="Categoria (opcional)"
                />

                {/* Opção de Compra Parcelada */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={purchaseForm.isInstallment}
                      onChange={e => setPurchaseForm(f => ({ ...f, isInstallment: e.target.checked }))}
                      className="ledger-checkbox"
                    />
                    <span className="text-xs font-medium text-foreground">
                      Esta compra foi parcelada no cartão?
                    </span>
                  </label>

                  {purchaseForm.isInstallment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-muted/40 rounded-lg space-y-2 border border-border"
                    >
                      <label className="text-xs font-medium text-foreground block">Número de Parcelas</label>
                      <input
                        type="number"
                        min={2}
                        max={48}
                        className="ledger-input w-full text-xs font-mono"
                        value={purchaseForm.totalMonths}
                        onChange={e => setPurchaseForm(f => ({ ...f, totalMonths: Math.max(2, Number(e.target.value)) }))}
                        required
                      />
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {purchaseForm.totalMonths}x de {formatCurrency(purchaseForm.value / Math.max(1, purchaseForm.totalMonths))} / mês
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchaseModal(false)}
                    className="flex-1 ledger-btn-outline text-xs py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 ledger-btn-primary text-xs py-2"
                  >
                    Adicionar Compra
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Compra da Fatura */}
      <AnimatePresence>
        {editingPurchase && (
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
                  Editar Compra da Fatura
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditPurchaseSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição da Compra</label>
                  <input
                    type="text"
                    className="ledger-input w-full text-xs"
                    value={editPurchaseForm.description}
                    onChange={e => setEditPurchaseForm(f => ({ ...f, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Valor</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                      <CurrencyInput
                        className="ledger-input w-full font-mono text-xs pl-8"
                        value={editPurchaseForm.value}
                        onChange={val => setEditPurchaseForm(f => ({ ...f, value: val }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Data da Compra</label>
                    <input
                      type="date"
                      className="ledger-input w-full text-xs bg-background"
                      value={editPurchaseForm.date}
                      onChange={e => setEditPurchaseForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <CategoryField
                  value={editPurchaseForm.categoryId}
                  onChange={categoryId => setEditPurchaseForm(f => ({ ...f, categoryId }))}
                  categories={categories}
                  onAddCategory={ledger.addCategory}
                  label="Categoria (opcional)"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPurchase(null)}
                    className="flex-1 ledger-btn-outline text-xs py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 ledger-btn-primary text-xs py-2"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Criar Novo Cartão */}
      <AnimatePresence>
        {showAddCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border shadow-xl rounded-xl p-5 sm:p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  Novo Cartão de Crédito
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Nome do Cartão</label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank Ultravioleta, Inter Black, Itaú..."
                    className="ledger-input w-full text-xs"
                    value={addCardForm.name}
                    onChange={e => setAddCardForm(f => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Dia de Vencimento da Fatura</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="ledger-input w-full text-xs font-mono"
                    value={addCardForm.dueDay}
                    onChange={e => setAddCardForm(f => ({ ...f, dueDay: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCardModal(false)}
                    className="flex-1 ledger-btn-outline text-xs py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 ledger-btn-primary text-xs py-2"
                  >
                    Criar Cartão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Confirmar Pagamento da Fatura */}
      <PaymentModal
        open={!!payingCardId}
        onClose={() => setPayingCardId(null)}
        initialValue={activeCardBill?.value ?? calculatedInvoiceTotal}
        onConfirm={(bankAccountId, paidAtIso, paidValue) => {
          if (payingCardId) {
            const finalVal = paidValue !== undefined ? paidValue : (activeCardBill?.value ?? calculatedInvoiceTotal);
            ledger.updateCard(payingCardId, {
              paid: true,
              paymentDate: paidAtIso.slice(0, 10),
              bankAccountId,
              paidAt: paidAtIso,
              value: finalVal,
            });
            setPayingCardId(null);
          }
        }}
        bankAccounts={bankAccounts}
        onAddBankAccount={ledger.addBankAccount}
        title="Confirmar Pagamento da Fatura"
      />
    </div>
  );
}
