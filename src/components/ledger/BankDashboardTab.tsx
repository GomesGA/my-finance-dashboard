import { useState } from 'react';
import { Building2, ArrowDownLeft, ArrowUpRight, Tags, Plus, Landmark, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { useLedgerData } from '@/hooks/useLedgerData';

interface Props {
  ledger: ReturnType<typeof useLedgerData>;
}

export function BankDashboardTab({ ledger }: Props) {
  const { computedExits, computedEntries, bankAccounts, totalExpenses, totalIncome, categories } = ledger;

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newBankName, setNewBankName] = useState('');
  const [newBankKind, setNewBankKind] = useState<'PF' | 'PJ'>('PF');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    ledger.addCategory(newCatName, newCatColor);
    setNewCatName('');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    ledger.addBankAccount(newBankName, newBankKind);
    setNewBankName('');
  };

  // Bancos
  const expensesByBank = bankAccounts.map(bank => {
    const total = computedExits.filter(e => e.bankAccountId === bank.id && !e.paidByOthers).reduce((acc, curr) => acc + curr.value, 0);
    return { ...bank, totalExpense: total };
  }).filter(b => b.totalExpense > 0).sort((a, b) => b.totalExpense - a.totalExpense);

  const incomeByBank = bankAccounts.map(bank => {
    const total = computedEntries.filter(e => e.bankAccountId === bank.id && !e.paidByOthers).reduce((acc, curr) => acc + curr.value, 0);
    return { ...bank, totalIncome: total };
  }).filter(b => b.totalIncome > 0).sort((a, b) => b.totalIncome - a.totalIncome);

  const expensesWithoutBank = computedExits.filter(e => !e.bankAccountId && !e.paidByOthers).reduce((acc, curr) => acc + curr.value, 0);

  // Categorias
  const expensesByCategory = categories.map(cat => {
    const total = computedExits.filter(e => e.categoryId === cat.id && !e.paidByOthers).reduce((acc, curr) => acc + curr.value, 0);
    return { ...cat, totalExpense: total };
  }).filter(c => c.totalExpense > 0).sort((a, b) => b.totalExpense - a.totalExpense);

  const expensesWithoutCategory = computedExits.filter(e => !e.categoryId && !e.paidByOthers).reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 size={24} className="text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Visão Geral & Cadastros</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Distribuição por contas, categorias e gerenciamento do sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ledger-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-destructive" /> 
            Saídas por Banco
          </h3>
          <div className="space-y-5">
            {expensesByBank.map(bank => (
              <div key={bank.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{bank.name} <span className="text-[10px] text-muted-foreground ml-1">({bank.kind})</span></span>
                  <span className="font-mono font-semibold text-destructive">{formatCurrency(bank.totalExpense)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-destructive h-full rounded-full" style={{ width: `${Math.min((bank.totalExpense / (totalExpenses || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            {expensesWithoutBank > 0 && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground italic">Sem banco informado</span>
                  <span className="font-mono font-semibold text-destructive/70">{formatCurrency(expensesWithoutBank)}</span>
                </div>
              </div>
            )}
            {expensesByBank.length === 0 && expensesWithoutBank === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma saída registrada neste mês.</p>}
          </div>
        </div>

        <div className="ledger-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
            <ArrowDownLeft size={18} className="text-success" /> 
            Entradas por Banco
          </h3>
          <div className="space-y-5">
            {incomeByBank.map(bank => (
              <div key={bank.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{bank.name}</span>
                  <span className="font-mono font-semibold text-success">{formatCurrency(bank.totalIncome)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-success h-full rounded-full" style={{ width: `${Math.min((bank.totalIncome / (totalIncome || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            {incomeByBank.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma entrada vinculada a banco neste mês.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="ledger-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
            <PieChart size={18} className="text-primary" /> 
            Saídas por Categoria
          </h3>
          <div className="space-y-5">
            {expensesByCategory.map(cat => (
              <div key={cat.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                    {cat.name}
                  </span>
                  <span className="font-mono font-semibold text-destructive">{formatCurrency(cat.totalExpense)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((cat.totalExpense / (totalExpenses || 1)) * 100, 100)}%`, backgroundColor: cat.color || '#ccc' }} />
                </div>
              </div>
            ))}
            {expensesWithoutCategory > 0 && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground italic">Sem categoria informada</span>
                  <span className="font-mono font-semibold text-destructive/70">{formatCurrency(expensesWithoutCategory)}</span>
                </div>
              </div>
            )}
            {expensesByCategory.length === 0 && expensesWithoutCategory === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma saída registrada neste mês.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="ledger-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Tags size={18} className="text-primary" /> Criar Nova Categoria</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="flex gap-3">
                <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-10 h-10 p-0 border-0 rounded cursor-pointer shrink-0 bg-transparent" title="Escolha uma cor" />
                <input type="text" placeholder="Ex: Assinaturas, Lazer..." className="ledger-input w-full" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              <button type="submit" className="ledger-btn-primary w-full flex justify-center items-center gap-2"><Plus size={16} /> Adicionar Categoria</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c.id} className="text-[10px] px-2 py-1 rounded-full border border-border flex items-center gap-1.5 bg-muted/20">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#ccc' }} /> {c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="ledger-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Landmark size={18} className="text-primary" /> Cadastrar Conta Bancária</h3>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div className="flex gap-3">
                <select className="ledger-input w-24 shrink-0 bg-background" value={newBankKind} onChange={e => setNewBankKind(e.target.value as 'PF' | 'PJ')}>
                  <option value="PF">PF</option><option value="PJ">PJ</option>
                </select>
                <input type="text" placeholder="Ex: Nubank, Itaú..." className="ledger-input w-full" value={newBankName} onChange={e => setNewBankName(e.target.value)} required />
              </div>
              <button type="submit" className="ledger-btn-primary w-full flex justify-center items-center gap-2"><Plus size={16} /> Adicionar Banco</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2">
              {bankAccounts.map(b => (
                <span key={b.id} className="text-[10px] px-2 py-1 rounded border border-border bg-muted/20">
                  {b.name} <span className="text-muted-foreground ml-1">{b.kind}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}