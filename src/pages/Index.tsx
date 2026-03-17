import { useState, useEffect } from 'react';
import { useLedgerData } from '@/hooks/useLedgerData';
import { useTheme } from '@/hooks/useTheme';
import { MonthSelector } from '@/components/ledger/MonthSelector';
import { DashboardTab } from '@/components/ledger/DashboardTab';
import { GoalsTab } from '@/components/ledger/GoalsTab';
import { InvestmentsTab } from '@/components/ledger/InvestmentsTab';
import { Auth } from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export type TabId = 'dashboard' | 'goals' | 'investments';

const Index = () => {
  const ledger = useLedgerData();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [session, setSession] = useState<Session | null>(null);

  // Verifica o login do usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />; // Se não tiver logado, mostra a tela de login
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="flex justify-end p-4 absolute top-0 right-0 z-50">
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>

      <MonthSelector
        currentDate={ledger.currentDate}
        onPrev={ledger.goPrevMonth}
        onNext={ledger.goNextMonth}
        dark={theme.dark}
        onToggleTheme={theme.toggle}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 pt-8">
        {activeTab === 'dashboard' && <DashboardTab ledger={ledger} />}
        {activeTab === 'goals' && <GoalsTab ledger={ledger} />}
        {activeTab === 'investments' && <InvestmentsTab ledger={ledger} />}
      </main>
    </div>
  );
};

export default Index;