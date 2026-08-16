import { Wallet } from 'lucide-react';
import { CurrencyInput } from '@/components/CurrencyInput';
import { BankAccountField } from './BankAccountField';
import type { BankAccount } from '@/types/ledger';

interface Props {
  income: number;
  incomeDate?: string;
  incomeTime?: string;
  incomeBankAccountId?: string;
  monthKey: string;
  bankAccounts: BankAccount[];
  onAddBankAccount: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  onChange: (value: number, date?: string, time?: string, bankAccountId?: string) => void;
}

export function IncomeSection({ income, incomeDate, incomeTime, incomeBankAccountId, monthKey, bankAccounts, onAddBankAccount, onChange }: Props) {
  const date = incomeDate || `${monthKey}-01`;

  return (
    <section className="ledger-card p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
        <Wallet size={18} className="text-muted-foreground" />
        Salário do Mês
      </h2>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="date"
            className="ledger-input w-32 shrink-0 text-xs px-2"
            value={date}
            onChange={e => onChange(income, e.target.value, incomeTime, incomeBankAccountId)}
            title="Data de Recebimento"
          />
          <input
            type="time"
            className="ledger-input w-24 shrink-0 text-xs px-2"
            value={incomeTime || ''}
            onChange={e => onChange(income, date, e.target.value, incomeBankAccountId)}
            title="Horário de Recebimento"
          />
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <CurrencyInput
              placeholder="0,00"
              className="ledger-input w-full font-mono pl-8 text-lg"
              value={income}
              onChange={val => onChange(val, date, incomeTime, incomeBankAccountId)}
            />
          </div>
        </div>
        <BankAccountField
          value={incomeBankAccountId || ''}
          onChange={bankAccountId => onChange(income, date, incomeTime, bankAccountId)}
          bankAccounts={bankAccounts}
          onAddBankAccount={onAddBankAccount}
        />
      </div>
    </section>
  );
}
