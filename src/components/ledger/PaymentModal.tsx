import { useState, useEffect, useRef } from 'react';
import { Landmark } from 'lucide-react';
import type { BankAccount } from '@/types/ledger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BankAccountField } from './BankAccountField';
import { CurrencyInput } from '@/components/CurrencyInput';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (bankAccountId: string, paidAtIso: string, value?: number) => void;
  bankAccounts: BankAccount[];
  onAddBankAccount: (name: string, kind: 'PF' | 'PJ') => BankAccount;
  title?: string;
  initialValue?: number;
}

const nowDate = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

export function PaymentModal({ open, onClose, onConfirm, bankAccounts, onAddBankAccount, title = 'Confirmar Pagamento', initialValue }: Props) {
  const [bankAccountId, setBankAccountId] = useState('');
  const [date, setDate] = useState(nowDate());
  const [time, setTime] = useState(nowTime());
  const [paidValue, setPaidValue] = useState<number>(initialValue ?? 0);
  const wasOpen = useRef(false);

  // Só reinicializa a seleção quando o modal ABRE — nunca enquanto já está aberto, senão
  // criar uma conta nova (que muda a referência de `bankAccounts`) desfazia a escolha do usuário.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setBankAccountId(bankAccounts[0]?.id || '');
      setDate(nowDate());
      setTime(nowTime());
      setPaidValue(initialValue ?? 0);
    }
    wasOpen.current = open;
  }, [open, bankAccounts, initialValue]);

  const confirm = () => {
    if (!bankAccountId || !date || !time) return;
    onConfirm(bankAccountId, `${date}T${time}:00`, initialValue !== undefined ? paidValue : undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark size={16} className="text-primary" /> {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {initialValue !== undefined && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor Efetivamente Pago</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">R$</span>
                <CurrencyInput
                  className="ledger-input w-full font-mono text-xs pl-8 font-semibold text-foreground"
                  value={paidValue}
                  onChange={setPaidValue}
                  placeholder="0,00"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                O valor da fatura será atualizado para o valor exato informado aqui.
              </p>
            </div>
          )}
          <BankAccountField value={bankAccountId} onChange={setBankAccountId} bankAccounts={bankAccounts} onAddBankAccount={onAddBankAccount} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Data</label>
              <input type="date" className="ledger-input w-full text-xs" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
              <input type="time" className="ledger-input w-full text-xs" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="ledger-btn-outline flex-1">Cancelar</button>
          <button type="button" onClick={confirm} disabled={!bankAccountId || (initialValue !== undefined && paidValue <= 0)} className="ledger-btn-primary flex-1 disabled:opacity-50">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
