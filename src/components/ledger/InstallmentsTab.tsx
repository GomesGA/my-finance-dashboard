import { ShoppingBag, CreditCard, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
  onGoToDashboard: () => void;
}

export function InstallmentsPurchasesTab({ ledger, onGoToDashboard }: Props) {
  const installments = ledger.data.installments;
  const cards = ledger.data.cards;

  const totalGeral = installments.reduce((acc, inst) => acc + inst.monthlyValue * inst.totalMonths, 0);
  const totalPagoGeral = installments.reduce((acc, inst) => acc + inst.monthlyValue * inst.paidMonths.length, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag size={22} className="text-primary" />
            Compras Parceladas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {installments.length} compra{installments.length !== 1 ? 's' : ''} · {formatCurrency(totalPagoGeral)} pago de {formatCurrency(totalGeral)}
          </p>
        </div>
        <button onClick={onGoToDashboard} className="ledger-btn-outline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Ir para pagamentos
        </button>
      </div>

      <div className="space-y-3">
        {installments.map(inst => {
          const isPix = !inst.paymentMethod || inst.paymentMethod === 'Pix';
          const cardName = isPix ? 'Pix' : (cards.find(c => c.id === inst.paymentMethod)?.name || 'Cartão');
          const totalValue = inst.monthlyValue * inst.totalMonths;
          const paidCount = inst.paidMonths.length;
          const percent = inst.totalMonths > 0 ? Math.min(100, Math.round((paidCount / inst.totalMonths) * 100)) : 0;
          const isDone = paidCount >= inst.totalMonths;

          return (
            <div key={inst.id} className="ledger-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isPix ? <ShoppingBag size={16} className="text-muted-foreground shrink-0" /> : <CreditCard size={16} className="text-muted-foreground shrink-0" />}
                  <span className="font-medium text-foreground truncate">{inst.name}</span>
                </div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 ${isDone ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                  {isDone ? 'Concluída' : `${cardName}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {paidCount}/{inst.totalMonths} parcelas · {formatCurrency(inst.monthlyValue)}/mês
                </span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(totalValue)}</span>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{percent}% pago</span>
                  <span>{formatCurrency(inst.monthlyValue * paidCount)} pago</span>
                </div>
              </div>
            </div>
          );
        })}
        {installments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground italic py-10">Nenhuma compra parcelada cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
