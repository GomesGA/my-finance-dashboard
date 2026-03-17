import { SummaryCards } from './SummaryCards';
import { IncomeSection } from './IncomeSection';
import { ExtraIncomeSection } from './ExtraIncomeSection';
import { CardBillsSection } from './CardBillsSection';
import { ExtraordinaryExpensesSection } from './ExtraordinaryExpensesSection';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left column ~40% */}
      <div className="lg:col-span-5 space-y-6">
        <SummaryCards
          income={ledger.totalIncome}
          totalExpenses={ledger.totalExpenses}
          balance={ledger.balance}
        />

        <IncomeSection
          income={ledger.currentMonthData.income}
          onChange={ledger.setIncome}
        />

        <ExtraIncomeSection
          items={ledger.currentMonthData.extraIncomes || []}
          onAdd={ledger.addExtraIncome}
          onUpdate={ledger.updateExtraIncome}
          onRemove={ledger.removeExtraIncome}
        />

        <CardBillsSection
          cards={ledger.currentMonthData.cardBills}
          onAdd={ledger.addCard}
          onUpdate={ledger.updateCard}
          onRemove={ledger.removeCard}
        />

        <ExtraordinaryExpensesSection
          expenses={ledger.currentMonthData.extraordinaryExpenses || []}
          onAdd={ledger.addExtraordinaryExpense}
          onUpdate={ledger.updateExtraordinaryExpense}
          onRemove={ledger.removeExtraordinaryExpense}
        />

        <InvestmentWidget onAdd={ledger.addInvestment} />
      </div>

      {/* Right column ~60% */}
      <div className="lg:col-span-7 space-y-6">
        <RecurringExpensesSection
          recurring={ledger.activeRecurringExpenses}
          monthData={ledger.currentMonthData}
          onAdd={ledger.addRecurringExpense}
          onSoftDelete={ledger.softDeleteRecurringExpense}
          onTogglePaid={ledger.toggleRecurringPaid}
          onUpdateValue={ledger.updateRecurringValue}
        />

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

        <InstallmentsSection
          installments={ledger.activeInstallments}
          monthKey={ledger.monthKey}
          getNumber={ledger.getInstallmentNumber}
          onAdd={ledger.addInstallment}
          onRemove={ledger.removeInstallment}
        />
      </div>
    </div>
  );
}
