import { useState } from 'react';
import { useLedgerData } from '@/hooks/useLedgerData';
import { useTheme } from '@/hooks/useTheme';
import { MonthSelector } from '@/components/ledger/MonthSelector';
import { DashboardTab } from '@/components/ledger/DashboardTab';
import { GoalsTab } from '@/components/ledger/GoalsTab';
import { InvestmentsTab } from '@/components/ledger/InvestmentsTab';

export type TabId = 'dashboard' | 'goals' | 'investments';

const Index = () => {
  const ledger = useLedgerData();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <MonthSelector
        currentDate={ledger.currentDate}
        onPrev={ledger.goPrevMonth}
        onNext={ledger.goNextMonth}
        dark={theme.dark}
        onToggleTheme={theme.toggle}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {activeTab === 'dashboard' && <DashboardTab ledger={ledger} />}
        {activeTab === 'goals' && <GoalsTab ledger={ledger} />}
        {activeTab === 'investments' && <InvestmentsTab ledger={ledger} />}
      </main>
    </div>
  );
};

export default Index;
