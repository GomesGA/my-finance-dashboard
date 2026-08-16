import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Category } from '@/types/ledger';

interface Props {
  value?: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  onAddCategory: (name: string, color?: string) => Category;
  label?: string;
}

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export function CategoryField({ value, onChange, categories, onAddCategory, label = 'Categoria' }: Props) {
  const [newCat, setNewCat] = useState<{ show: boolean; name: string; color: string }>({ show: false, name: '', color: PRESET_COLORS[0] });

  const confirmNewCat = () => {
    if (!newCat.name) return;
    const created = onAddCategory(newCat.name, newCat.color);
    onChange(created.id);
    setNewCat({ show: false, name: '', color: PRESET_COLORS[0] });
  };

  return (
    <div className="min-w-0">
      {label && <label className="text-xs text-muted-foreground mb-1 block">{label}</label>}
      <div className="flex gap-1.5">
        <select className="ledger-input flex-1 min-w-0 bg-background" value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={() => setNewCat(f => ({ ...f, show: !f.show }))} className="ledger-btn-outline shrink-0 px-2.5" title="Nova categoria">
          <Plus size={14} />
        </button>
      </div>
      {newCat.show && (
        <div className="mt-2 p-2 bg-muted rounded-lg border border-border space-y-2">
          <input type="text" placeholder="Nome da categoria" className="ledger-input w-full text-xs" value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))} autoFocus />
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {PRESET_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setNewCat(f => ({ ...f, color }))} className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: color, outline: newCat.color === color ? '2px solid currentColor' : 'none', outlineOffset: '1px' }} />
              ))}
            </div>
            <button type="button" onClick={confirmNewCat} className="ledger-btn-primary shrink-0 px-2.5" title="Adicionar"><Check size={14} /></button>
            <button type="button" onClick={() => setNewCat({ show: false, name: '', color: PRESET_COLORS[0] })} className="ledger-btn-outline shrink-0 px-2.5" title="Cancelar"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
