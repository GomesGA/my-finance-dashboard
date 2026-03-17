import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LedgerEntry } from '@/types/ledger';
import { formatCurrency } from '@/lib/format';

interface Props {
  title: string;
  entries: LedgerEntry[];
  type: 'income' | 'expense';
}

export function LedgerTable({ title, entries, type }: Props) {
  const total = entries.reduce((a, c) => a + c.value, 0);
  const isIncome = type === 'income';

  return (
    <section className="ledger-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2 text-foreground">
          {isIncome ? <ArrowDownLeft size={18} className="text-success" /> : <ArrowUpRight size={18} className="text-destructive" />}
          {title}
        </h2>
        <span className={`font-mono text-sm font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
          {formatCurrency(total)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map(entry => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{entry.date}</td>
                  <td className="px-5 py-3 text-foreground">{entry.description}</td>
                  <td className={`px-5 py-3 text-right font-mono font-semibold ${isIncome ? 'text-success' : 'text-destructive'}`}>
                    {isIncome ? '+' : '-'} {formatCurrency(entry.value)}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-xs text-muted-foreground italic">
                  Nenhum registro neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
