import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface Props {
  income: number;
  totalExpenses: number;
  balance: number;
}

export function SummaryCards({ income, totalExpenses, balance }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="ledger-card p-3 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          <TrendingUp size={14} className="text-success shrink-0" />
          <span className="ledger-label !mb-0 text-[10px] sm:text-xs truncate">Receita</span>
        </div>
        <p className="text-xs sm:text-base md:text-lg font-bold font-mono tracking-tight text-success truncate" title={formatCurrency(income)}>
          {formatCurrency(income)}
        </p>
      </div>
      <div className="ledger-card p-3 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          <TrendingDown size={14} className="text-destructive shrink-0" />
          <span className="ledger-label !mb-0 text-[10px] sm:text-xs truncate">Despesas</span>
        </div>
        <p className="text-xs sm:text-base md:text-lg font-bold font-mono tracking-tight text-destructive truncate" title={formatCurrency(totalExpenses)}>
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="ledger-card p-3 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          <Wallet size={14} className="text-primary shrink-0" />
          <span className="ledger-label !mb-0 text-[10px] sm:text-xs truncate">Saldo</span>
        </div>
        <p className={`text-xs sm:text-base md:text-lg font-bold font-mono tracking-tight truncate ${balance >= 0 ? 'text-primary' : 'text-destructive'}`} title={formatCurrency(balance)}>
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  );
}