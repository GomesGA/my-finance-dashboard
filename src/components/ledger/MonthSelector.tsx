import { ChevronLeft, ChevronRight, Sun, Moon, LayoutDashboard, Target, TrendingUp, Landmark, ShoppingBag, Tag, LogOut, CreditCard } from 'lucide-react';
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
  onSignOut?: () => void;
}

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cards', label: 'Faturas', icon: CreditCard },
  { id: 'installments', label: 'Parcelas', icon: ShoppingBag },
  { id: 'dash', label: 'Dash Bancos', icon: Landmark },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp },
];

export function MonthSelector({ currentDate, onPrev, onNext, dark, onToggleTheme, activeTab, onTabChange, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
      <div className="max-w-[1900px] mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top row: logo + month selector + theme + signout */}
        <div className="h-14 flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2 shrink-0">
            <Landmark size={20} className="text-primary" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground hidden sm:inline">
              Controle Financeiro
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-muted p-1 rounded-lg border border-border/40">
              <button
                onClick={onPrev}
                className="p-1 sm:p-1.5 hover:bg-card rounded-md transition-all text-muted-foreground hover:text-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs sm:text-sm font-medium min-w-[95px] sm:min-w-[130px] text-center capitalize text-foreground select-none truncate">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button
                onClick={onNext}
                className="p-1 sm:p-1.5 hover:bg-card rounded-md transition-all text-muted-foreground hover:text-foreground"
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Alternar Tema */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 border border-transparent hover:border-border/50"
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Botão Sair integrado sem sobreposição */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0 flex items-center gap-1 border border-transparent hover:border-destructive/20"
                aria-label="Sair da conta"
                title="Sair"
              >
                <LogOut size={17} />
                <span className="hidden md:inline text-xs font-medium">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation com scroll horizontal suave no mobile */}
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-none py-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}