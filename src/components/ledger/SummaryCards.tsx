import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface Props {
  income: number;
  totalExpenses: number;
  balance: number;
}

export function SummaryCards({ income, totalExpenses, balance }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="ledger-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-success shrink-0" />
          <span className="ledger-label !mb-0 truncate">Receita</span>
        </div>
        {/* Fonte menor (text-lg) e sem o 'truncate' no valor */}
        <p className="text-lg font-bold font-mono tracking-tighter text-success">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="ledger-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={14} className="text-destructive shrink-0" />
          <span className="ledger-label !mb-0 truncate">Despesas</span>
        </div>
        <p className="text-lg font-bold font-mono tracking-tighter text-destructive">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="ledger-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={14} className="text-primary shrink-0" />
          <span className="ledger-label !mb-0 truncate">Saldo</span>
        </div>
        <p className={`text-lg font-bold font-mono tracking-tighter ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  );
}