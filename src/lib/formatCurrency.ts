export const formatEUR = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatEURShort = (amount: number): string => {
  return `€ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Aliases for backward compatibility
export const formatBRL = formatEUR;
export const formatBRLShort = formatEURShort;
