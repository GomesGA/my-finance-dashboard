import { SummaryCards } from './SummaryCards';
import { IncomeSection } from './IncomeSection';
import { CardBillsSection } from './CardBillsSection';
import { InvestmentWidget } from './InvestmentWidget';
import { RecurringExpensesSection } from './RecurringExpensesSection';
import { LedgerTable } from './LedgerTable';
import { SubscriptionsSection } from './SubscriptionsSection';
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
          incomeDate={ledger.currentMonthData.incomeDate}
          monthKey={ledger.monthKey}
          onChange={ledger.setIncome}
        />

        <InvestmentWidget onAdd={ledger.addInvestment} />

        <InstallmentsSection
          installments={ledger.activeInstallments}
          monthKey={ledger.monthKey}
          cards={ledger.data.cards}
          getNumber={ledger.getInstallmentNumber}
          onAdd={ledger.addInstallment}
          onEdit={ledger.editInstallment}
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
          onRemoveEntry={ledger.removeLedgerEntry}
          onEditEntry={ledger.editLedgerEntry}
        />
        
        <LedgerTable
          title="Saídas"
          entries={ledger.computedExits}
          type="expense"
          onAddManual={ledger.addManualExit}
          onRemoveEntry={ledger.removeLedgerEntry}
          onEditEntry={ledger.editLedgerEntry}
        />
      </div>

      {/* Coluna 3: Direita (Despesas Recorrentes e Faturas de Cartão) */}
      <div className="space-y-6">
        <RecurringExpensesSection
          recurring={ledger.activeRecurringExpenses}
          monthData={ledger.currentMonthData}
          onAdd={ledger.addRecurringExpense}
          onEdit={ledger.editRecurringExpense} 
          onSoftDelete={ledger.softDeleteRecurringExpense}
          onTogglePaid={ledger.toggleRecurringPaid}
          onUpdateValue={ledger.updateRecurringValue}
        />

        <CardBillsSection
          cards={ledger.computedCardBills}
          onAdd={ledger.addCard}
          onUpdate={ledger.updateCard}
          onEdit={ledger.editCard}
          onRemove={ledger.removeCard}
        />

        <SubscriptionsSection
          subscriptions={ledger.activeSubscriptions}
          monthData={ledger.currentMonthData}
          cards={ledger.data.cards}
          onAdd={ledger.addSubscription}
          onEdit={ledger.editSubscription}
          onSoftDelete={ledger.softDeleteSubscription}
          onTogglePaid={ledger.toggleSubscriptionPaid}
          onUpdateValue={ledger.updateSubscriptionValue}
        />
        
      </div>
    </div>
  );
}