import { ChevronLeft, ChevronRight, Sun, Moon, LayoutDashboard, Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TabId } from '@/pages/Index';

interface Props {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  dark: boolean;
  onToggleTheme: () => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp },
];

export function MonthSelector({ currentDate, onPrev, onNext, dark, onToggleTheme, activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top row: logo + month selector + theme */}
        <div className="h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Ledger.</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button onClick={onPrev} className="p-1.5 hover:bg-card rounded-md transition-all" aria-label="Mês anterior">
                <ChevronLeft size={18} className="text-muted-foreground" />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize text-foreground">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={onNext} className="p-1.5 hover:bg-card rounded-md transition-all" aria-label="Próximo mês">
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </div>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Alternar tema"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
