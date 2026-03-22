import { Wallet } from 'lucide-react';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  income: number;
  incomeDate?: string;
  monthKey: string;
  onChange: (value: number, date?: string) => void;
}

export function IncomeSection({ income, incomeDate, monthKey, onChange }: Props) {
  return (
    <section className="ledger-card p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
        <Wallet size={18} className="text-muted-foreground" />
        Salário do Mês
      </h2>
      <div className="flex gap-2">
        <input
          type="date"
          className="ledger-input w-36 shrink-0 text-xs px-2"
          value={incomeDate || `${monthKey}-01`}
          onChange={e => onChange(income, e.target.value)}
          title="Data de Recebimento"
        />
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          <CurrencyInput
            placeholder="0,00"
            className="ledger-input w-full font-mono pl-8 text-lg"
            value={income}
            onChange={val => onChange(val, incomeDate || `${monthKey}-01`)}
          />
        </div>
      </div>
    </section>
  );
}