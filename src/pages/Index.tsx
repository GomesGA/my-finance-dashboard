import { useState, useEffect } from 'react';
import { useLedgerData } from '@/hooks/useLedgerData';
import { useTheme } from '@/hooks/useTheme';
import { MonthSelector } from '@/components/ledger/MonthSelector';
import { BankDashboardTab } from '@/components/ledger/BankDashboardTab';
import { GoalsTab } from '@/components/ledger/GoalsTab';
import { InvestmentsTab } from '@/components/ledger/InvestmentsTab';
import { InstallmentsPurchasesTab } from '@/components/ledger/InstallmentsTab';
import { CardsTab } from '@/components/ledger/CardsTab';
import { Auth } from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { DashboardTab } from '@/components/ledger/DashboardTab';

export type TabId = 'dashboard' | 'cards' | 'installments' | 'dash' | 'goals' | 'investments';

const Index = () => {
  const ledger = useLedgerData();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

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
        onSignOut={() => supabase.auth.signOut()}
      />

      <main className="w-full max-w-[1900px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {activeTab === 'dashboard' && <DashboardTab ledger={ledger} onOpenCardsTab={() => setActiveTab('cards')} />}
        {activeTab === 'cards' && <CardsTab ledger={ledger} onGoToInstallments={() => setActiveTab('installments')} />}
        {activeTab === 'installments' && <InstallmentsPurchasesTab ledger={ledger} onGoToDashboard={() => setActiveTab('dashboard')} />}
        {activeTab === 'dash' && <BankDashboardTab ledger={ledger} />}
        {activeTab === 'goals' && <GoalsTab ledger={ledger} />}
        {activeTab === 'investments' && <InvestmentsTab ledger={ledger} />}
      </main>
    </div>
  );
};

export default Index;