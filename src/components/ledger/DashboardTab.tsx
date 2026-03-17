import { SummaryCards } from './SummaryCards';
import { IncomeSection } from './IncomeSection';
import { CardBillsSection } from './CardBillsSection';
import { InvestmentWidget } from './InvestmentWidget';
import { RecurringExpensesSection } from './RecurringExpensesSection';
import { LedgerTable } from './LedgerTable';
import { InstallmentsSection } from './InstallmentsSection';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function DashboardTab({ ledger }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna 1: Esquerda (Resumo, Salário, Investimentos e Parcelas) */}
      <div className="space-y-6">
        <SummaryCards
          income={ledger.totalIncome}
          totalExpenses={ledger.totalExpenses}
          balance={ledger.balance}
        />

        <IncomeSection
          income={ledger.currentMonthData.income}
          onChange={ledger.setIncome}
        />

        <InvestmentWidget onAdd={ledger.addInvestment} />

        <InstallmentsSection
          installments={ledger.activeInstallments}
          monthKey={ledger.monthKey}
          getNumber={ledger.getInstallmentNumber}
          onAdd={ledger.addInstallment}
          onRemove={ledger.removeInstallment}
        />
      </div>

      {/* Coluna 2: Meio (Entradas e Saídas - O Livro-Razão) */}
      <div className="space-y-6">
        <LedgerTable
          title="Entradas"
          entries={ledger.computedEntries}
          type="income"
          onAddManual={ledger.addManualEntry}
          onRemoveManual={ledger.removeManualEntry}
        />
        
        <LedgerTable
          title="Saídas"
          entries={ledger.computedExits}
          type="expense"
          onAddManual={ledger.addManualExit}
          onRemoveManual={ledger.removeManualExit}
        />
      </div>

      {/* Coluna 3: Direita (Despesas Recorrentes e Faturas de Cartão) */}
      <div className="space-y-6">
        <RecurringExpensesSection
          recurring={ledger.activeRecurringExpenses}
          monthData={ledger.currentMonthData}
          onAdd={ledger.addRecurringExpense}
          onSoftDelete={ledger.softDeleteRecurringExpense}
          onTogglePaid={ledger.toggleRecurringPaid}
          onUpdateValue={ledger.updateRecurringValue}
        />

        <CardBillsSection
          cards={ledger.currentMonthData.cardBills}
          onAdd={ledger.addCard}
          onUpdate={ledger.updateCard}
          onRemove={ledger.removeCard}
        />
      </div>
    </div>
  );
}