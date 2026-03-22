import { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export function CurrencyInput({ value, onChange, className, placeholder }: Props) {
  const [localValue, setLocalValue] = useState(value ? String(value).replace('.', ',') : '');

  useEffect(() => {
    const numericLocal = Number(localValue.replace(',', '.'));
    if (value !== numericLocal && !(value === 0 && localValue === '')) {
      setLocalValue(value ? String(value).replace('.', ',') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace('.', ',');
    val = val.replace(/[^0-9,]/g, '');
    
    if ((val.match(/,/g) || []).length > 1) {
      val = val.substring(0, val.lastIndexOf(','));
    }
    
    setLocalValue(val);
    const numeric = Number(val.replace(',', '.'));
    onChange(isNaN(numeric) ? 0 : numeric);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder || "0,00"}
      value={localValue}
      onChange={handleChange}
    />
  );
}