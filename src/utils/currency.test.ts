import { describe, it, expect } from 'vitest';
import { parseCurrency } from './currency';

describe('parseCurrency helper tests', () => {
  it('should parse numbers directly without changes', () => {
    expect(parseCurrency(1250.5)).toBe(1250.5);
    expect(parseCurrency(0)).toBe(0);
  });

  it('should parse simple decimal text strings', () => {
    expect(parseCurrency('1250.50')).toBe(1250.5);
    expect(parseCurrency('1250')).toBe(1250);
  });

  it('should parse Brazilian format with comma decimals', () => {
    expect(parseCurrency('1250,50')).toBe(1250.5);
    expect(parseCurrency('0,99')).toBe(0.99);
  });

  it('should parse Brazilian format with thousands separator dots and comma decimals', () => {
    expect(parseCurrency('1.250,50')).toBe(1250.5);
    expect(parseCurrency('10.250.500,99')).toBe(10250500.99);
  });

  it('should clean non-numeric text wrapper characters like currency symbol', () => {
    expect(parseCurrency('R$ 1.250,50')).toBe(1250.5);
    expect(parseCurrency('R$1250,50')).toBe(1250.5);
    expect(parseCurrency('R$ 0,15')).toBe(0.15);
  });

  it('should return 0 for empty or invalid inputs', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('abc')).toBe(0);
  });
});
