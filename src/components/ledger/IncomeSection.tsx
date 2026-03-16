interface Props {
  income: number;
  onChange: (val: number) => void;
}

export function IncomeSection({ income, onChange }: Props) {
  return (
    <section className="ledger-card p-6">
      <label className="ledger-label">Salário do Mês</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
        <input
          type="number"
          className="ledger-input w-full pl-10 text-lg font-mono"
          value={income || ''}
          onChange={e => onChange(Number(e.target.value))}
          placeholder="0,00"
        />
      </div>
    </section>
  );
}
