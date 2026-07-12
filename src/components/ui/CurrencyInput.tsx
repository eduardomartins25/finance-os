import React, { useState, useCallback } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (raw: string, numeric: number) => void;
}

/**
 * Masked currency input that automatically formats to Brazilian Real format.
 * As the user types digits, it formats them in real-time: "1250" → "12,50", "125050" → "1.250,50"
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0,00',
  className,
  ...rest
}) => {
  const format = (digits: string): string => {
    if (!digits) return '';
    const num = parseInt(digits, 10);
    const real = num / 100;
    return real.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      onChange('', 0);
      return;
    }
    const formatted = format(digits);
    const numeric = parseInt(digits, 10) / 100;
    onChange(formatted, numeric);
  }, [onChange]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default CurrencyInput;
