export const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'IDR':
      return 'Rp';
    default:
      return currency;
  }
};

export const formatCurrency = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  
  // For IDR, format without decimals since it doesn't use cents
  if (currency === 'IDR') {
    return `${symbol}${Math.round(amount).toLocaleString('id-ID')}`;
  }
  
  // For other currencies, use 2 decimal places
  return `${symbol}${amount.toFixed(2)}`;
};