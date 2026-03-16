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
      <div className="ledger-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-success" />
          <span className="ledger-label !mb-0">Receita</span>
        </div>
        <p className="text-2xl font-bold font-mono tracking-tighter text-success">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="ledger-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={14} className="text-destructive" />
          <span className="ledger-label !mb-0">Despesas (pagas)</span>
        </div>
        <p className="text-2xl font-bold font-mono tracking-tighter text-destructive">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="ledger-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={14} className="text-primary" />
          <span className="ledger-label !mb-0">Saldo</span>
        </div>
        <p className={`text-2xl font-bold font-mono tracking-tighter ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  );
}
