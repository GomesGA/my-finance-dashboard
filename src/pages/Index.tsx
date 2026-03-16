import { useLedgerData } from '@/hooks/useLedgerData';
import { useTheme } from '@/hooks/useTheme';
import { MonthSelector } from '@/components/ledger/MonthSelector';
import { SummaryCards } from '@/components/ledger/SummaryCards';
import { IncomeSection } from '@/components/ledger/IncomeSection';
import { ExtraIncomeSection } from '@/components/ledger/ExtraIncomeSection';
import { CardBillsSection } from '@/components/ledger/CardBillsSection';
import { ExpensesSection } from '@/components/ledger/ExpensesSection';
import { ExtraordinaryExpensesSection } from '@/components/ledger/ExtraordinaryExpensesSection';
import { InstallmentsSection } from '@/components/ledger/InstallmentsSection';
import { InvestmentsSection } from '@/components/ledger/InvestmentsSection';

const Index = () => {
  const ledger = useLedgerData();
  const theme = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <MonthSelector
        currentDate={ledger.currentDate}
        onPrev={ledger.goPrevMonth}
        onNext={ledger.goNextMonth}
        dark={theme.dark}
        onToggleTheme={theme.toggle}
      />

      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-6">
        <SummaryCards
          income={ledger.totalIncome}
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
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 space-y-6">
            <ExpensesSection
              expenses={ledger.currentMonthData.variableExpenses}
              onAdd={ledger.addExpense}
              onUpdate={ledger.updateExpense}
              onRemove={ledger.removeExpense}
            />
            <ExtraordinaryExpensesSection
              expenses={ledger.currentMonthData.extraordinaryExpenses || []}
              onAdd={ledger.addExtraordinaryExpense}
              onUpdate={ledger.updateExtraordinaryExpense}
              onRemove={ledger.removeExtraordinaryExpense}
            />
            <InstallmentsSection
              installments={ledger.activeInstallments}
              monthKey={ledger.monthKey}
              getNumber={ledger.getInstallmentNumber}
              onAdd={ledger.addInstallment}
              onTogglePaid={ledger.toggleInstallmentPaid}
              onRemove={ledger.removeInstallment}
            />
            <InvestmentsSection
              investments={ledger.currentMonthData.investments || []}
              allData={ledger.data}
              onAdd={ledger.addInvestment}
              onRemove={ledger.removeInvestment}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
