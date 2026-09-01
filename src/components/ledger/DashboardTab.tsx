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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-6">
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
          incomeTime={ledger.currentMonthData.incomeTime}
          incomeBankAccountId={ledger.currentMonthData.incomeBankAccountId}
          monthKey={ledger.monthKey}
          bankAccounts={ledger.bankAccounts}
          onAddBankAccount={ledger.addBankAccount}
          onChange={ledger.setIncome}
        />

        <InvestmentWidget onAdd={ledger.addInvestment} />

        <InstallmentsSection
          installments={ledger.activeInstallments}
          monthKey={ledger.monthKey}
          cards={ledger.data.cards}
          bankAccounts={ledger.bankAccounts}
          categories={ledger.categories}
          getNumber={ledger.getInstallmentNumber}
          onAdd={ledger.addInstallment}
          onEdit={ledger.editInstallment}
          onRemove={ledger.removeInstallment}
          onPay={ledger.payInstallment}
          onUnpay={ledger.unpayInstallment}
          onAddBankAccount={ledger.addBankAccount}
          onAddCategory={ledger.addCategory}
        />
      </div>

      {/* Coluna 2: Meio (Entradas e Saídas - O Livro-Razão) */}
      <div className="space-y-6">
        <LedgerTable
          title="Entradas"
          entries={ledger.computedEntries}
          type="income"
          bankAccounts={ledger.bankAccounts}
          onAddBankAccount={ledger.addBankAccount}
          onAddManual={ledger.addManualEntry}
          onRemoveEntry={ledger.removeLedgerEntry}
          onEditEntry={ledger.editLedgerEntry}
        />

        <LedgerTable
          title="Saídas"
          entries={ledger.computedExits}
          type="expense"
          bankAccounts={ledger.bankAccounts}
          onAddBankAccount={ledger.addBankAccount}
          categories={ledger.categories}
          onAddCategory={ledger.addCategory}
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
          bankAccounts={ledger.bankAccounts}
          categories={ledger.categories}
          onAdd={ledger.addRecurringExpense}
          onEdit={ledger.editRecurringExpense}
          onSoftDelete={ledger.softDeleteRecurringExpense}
          onPay={ledger.payRecurringExpense}
          onUnpay={ledger.unpayRecurringExpense}
          onUpdateValue={ledger.updateRecurringValue}
          onToggleActive={ledger.toggleRecurringActive}
          onAddBankAccount={ledger.addBankAccount}
          onAddCategory={ledger.addCategory}
        />

        <CardBillsSection
          cards={ledger.computedCardBills}
          bankAccounts={ledger.bankAccounts}
          categories={ledger.categories}
          onAdd={ledger.addCard}
          onUpdate={ledger.updateCard}
          onEdit={ledger.editCard}
          onRemove={ledger.removeCard}
          onAddBankAccount={ledger.addBankAccount}
          onAddCategory={ledger.addCategory}
        />

        <SubscriptionsSection
          subscriptions={ledger.activeSubscriptions}
          monthData={ledger.currentMonthData}
          cards={ledger.data.cards}
          bankAccounts={ledger.bankAccounts}
          categories={ledger.categories}
          onAdd={ledger.addSubscription}
          onEdit={ledger.editSubscription}
          onSoftDelete={ledger.softDeleteSubscription}
          onPay={ledger.paySubscription}
          onUnpay={ledger.unpaySubscription}
          onUpdateValue={ledger.updateSubscriptionValue}
          onAddBankAccount={ledger.addBankAccount}
          onAddCategory={ledger.addCategory}
        />

      </div>
    </div>
  );
}