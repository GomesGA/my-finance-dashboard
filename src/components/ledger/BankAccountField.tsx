import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { BankAccount } from '@/types/ledger';

interface Props {
  value: string;
  onChange: (bankAccountId: string) => void;
  bankAccounts: BankAccount[];
  onAddBankAccount: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  label?: string;
}

export function BankAccountField({ value, onChange, bankAccounts, onAddBankAccount, label = 'Banco' }: Props) {
  const [newBank, setNewBank] = useState<{ show: boolean; name: string; kind: 'PF' | 'PJ' }>({ show: false, name: '', kind: 'PF' });

  const confirmNewBank = () => {
    if (!newBank.name) return;
    const created = onAddBankAccount(newBank.name, newBank.kind);
    onChange(created.id);
    setNewBank({ show: false, name: '', kind: 'PF' });
  };

  return (
    <div className="min-w-0">
      {label && <label className="text-xs text-muted-foreground mb-1 block">{label}</label>}
      <div className="flex gap-1.5">
        <select className="ledger-input flex-1 min-w-0 bg-background" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{bankAccounts.length === 0 ? 'Nenhuma conta cadastrada' : 'Selecione...'}</option>
          {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} ({b.kind})</option>)}
        </select>
        <button type="button" onClick={() => setNewBank(f => ({ ...f, show: !f.show }))} className="ledger-btn-outline shrink-0 px-2.5" title="Nova conta">
          <Plus size={14} />
        </button>
      </div>
      {newBank.show && (
        <div className="mt-2 p-2 bg-muted rounded-lg border border-border space-y-2">
          <input type="text" placeholder="Nome da conta" className="ledger-input w-full text-xs" value={newBank.name} onChange={e => setNewBank(f => ({ ...f, name: e.target.value }))} autoFocus />
          <div className="flex gap-1.5">
            <select className="ledger-input flex-1 min-w-0 text-xs bg-background" value={newBank.kind} onChange={e => setNewBank(f => ({ ...f, kind: e.target.value as 'PF' | 'PJ' }))}>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
            <button type="button" onClick={confirmNewBank} className="ledger-btn-primary shrink-0 px-2.5" title="Adicionar"><Check size={14} /></button>
            <button type="button" onClick={() => setNewBank({ show: false, name: '', kind: 'PF' })} className="ledger-btn-outline shrink-0 px-2.5" title="Cancelar"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
