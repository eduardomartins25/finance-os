/**
 * Parses a string representing a currency value in various formats (e.g. "1.250,50", "1250,50", "1250.50")
 * into a valid float number.
 */
export const parseCurrency = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  // Clean all characters except digits, commas, dots, and minus sign
  const cleaned = val.replace(/[^\d,.-]/g, '');
  
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    const commaIndex = cleaned.indexOf(',');
    const dotIndex = cleaned.indexOf('.');
    if (commaIndex > dotIndex) {
      // DOT is thousands separator, COMMA is decimal
      return parseFloat(cleaned.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else {
      // COMMA is thousands separator, DOT is decimal
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } else if (hasComma) {
    // Only comma is present -> e.g. "1250,50"
    return parseFloat(cleaned.replace(/,/g, '.')) || 0;
  }
  
  return parseFloat(cleaned) || 0;
};
export default parseCurrency;
