import { useLedgerData } from '@/hooks/useLedgerData';
import { MonthSelector } from '@/components/ledger/MonthSelector';
import { SummaryCards } from '@/components/ledger/SummaryCards';
import { IncomeSection } from '@/components/ledger/IncomeSection';
import { CardBillsSection } from '@/components/ledger/CardBillsSection';
import { ExpensesSection } from '@/components/ledger/ExpensesSection';
import { InstallmentsSection } from '@/components/ledger/InstallmentsSection';

const Index = () => {
  const ledger = useLedgerData();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <MonthSelector
        currentDate={ledger.currentDate}
        onPrev={ledger.goPrevMonth}
        onNext={ledger.goNextMonth}
      />

      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-6">
        <SummaryCards
          income={ledger.currentMonthData.income}
          totalExpenses={ledger.totalExpenses}
          balance={ledger.balance}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-6">
            <IncomeSection
              income={ledger.currentMonthData.income}
              onChange={ledger.setIncome}
            />
            <CardBillsSection
              cards={ledger.currentMonthData.cardBills}
              onAdd={ledger.addCard}
              onUpdate={ledger.updateCard}
              onRemove={ledger.removeCard}
            />
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 space-y-6">
            <ExpensesSection
              expenses={ledger.currentMonthData.variableExpenses}
              onAdd={ledger.addExpense}
              onUpdate={ledger.updateExpense}
              onRemove={ledger.removeExpense}
            />
            <InstallmentsSection
              installments={ledger.activeInstallments}
              monthKey={ledger.monthKey}
              getNumber={ledger.getInstallmentNumber}
              onAdd={ledger.addInstallment}
              onTogglePaid={ledger.toggleInstallmentPaid}
              onRemove={ledger.removeInstallment}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
