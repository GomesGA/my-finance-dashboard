import { SummaryCards } from './SummaryCards';
import { IncomeSection } from './IncomeSection';
import { ExtraIncomeSection } from './ExtraIncomeSection';
import { ExpensesSection } from './ExpensesSection';
import { CardBillsSection } from './CardBillsSection';
import { ExtraordinaryExpensesSection } from './ExtraordinaryExpensesSection';
import { InstallmentsSection } from './InstallmentsSection';
import { InvestmentWidget } from './InvestmentWidget';
import { LedgerTable } from './LedgerTable';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function DashboardTab({ ledger }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left column: Summary + operational sections */}
      <div className="lg:col-span-4 space-y-6">
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
        <ExpensesSection
          expenses={ledger.currentMonthData.variableExpenses}
          onAdd={ledger.addExpense}
          onUpdate={ledger.updateExpense}
          onRemove={ledger.removeExpense}
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

      {/* Right column: Ledger tables + installments */}
      <div className="lg:col-span-8 space-y-6">
        <LedgerTable
          title="Entradas"
          entries={ledger.computedEntries}
          type="income"
        />
        <LedgerTable
          title="Saídas"
          entries={ledger.computedExits}
          type="expense"
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
