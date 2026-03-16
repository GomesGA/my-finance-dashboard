import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthSelector({ currentDate, onPrev, onNext }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-foreground">Ledger.</h1>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={onPrev}
            className="p-1.5 hover:bg-card rounded-md transition-all"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize text-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={onNext}
            className="p-1.5 hover:bg-card rounded-md transition-all"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="w-8" />
      </div>
    </header>
  );
}
