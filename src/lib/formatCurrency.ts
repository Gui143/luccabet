export const formatBRL = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatBRLShort = (amount: number): string => {
  return `R$ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
