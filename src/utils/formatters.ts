export const formatINR = (amount: number): string => {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const getBankBadgeColor = (providerName: string): { bg: string; text: string; border: string; glow: string } => {
  const name = providerName.toLowerCase();
  if (name.includes('sbi')) {
    return { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/10' };
  }
  if (name.includes('indus')) {
    return { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/10' };
  }
  if (name.includes('idfc')) {
    return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-rose-500/10' };
  }
  if (name.includes('rbl')) {
    return { bg: 'bg-indigo-950/60', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'shadow-indigo-500/10' };
  }
  if (name.includes('hdfc')) {
    return { bg: 'bg-sky-950/60', text: 'text-sky-400', border: 'border-sky-500/30', glow: 'shadow-sky-500/10' };
  }
  if (name.includes('ac') || name.includes('appliance') || name.includes('laptop')) {
    return { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' };
  }
  return { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/10' };
};
