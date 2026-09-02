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

export interface BankBadgeStyle {
  bg: string;
  text: string;
  border: string;
  accent: string;
  code: string;
}

export const getBankBadgeStyle = (providerName: string): BankBadgeStyle => {
  const name = providerName.toLowerCase();
  
  if (name.includes('sbi')) {
    return { 
      bg: 'bg-blue-500/[0.08]', 
      text: 'text-blue-400', 
      border: 'border-blue-500/20', 
      accent: '#3B82F6',
      code: 'SBI'
    };
  }
  if (name.includes('indus')) {
    return { 
      bg: 'bg-rose-500/[0.08]', 
      text: 'text-rose-400', 
      border: 'border-rose-500/20', 
      accent: '#F43F5E',
      code: 'INDUS'
    };
  }
  if (name.includes('idfc')) {
    return { 
      bg: 'bg-amber-500/[0.08]', 
      text: 'text-amber-400', 
      border: 'border-amber-500/20', 
      accent: '#F59E0B',
      code: 'IDFC'
    };
  }
  if (name.includes('rbl')) {
    return { 
      bg: 'bg-indigo-500/[0.08]', 
      text: 'text-indigo-400', 
      border: 'border-indigo-500/20', 
      accent: '#6366F1',
      code: 'RBL'
    };
  }
  if (name.includes('hdfc')) {
    return { 
      bg: 'bg-cyan-500/[0.08]', 
      text: 'text-cyan-400', 
      border: 'border-cyan-500/20', 
      accent: '#06B6D4',
      code: 'HDFC'
    };
  }
  if (name.includes('ac') || name.includes('appliance') || name.includes('macbook') || name.includes('laptop')) {
    return { 
      bg: 'bg-emerald-500/[0.08]', 
      text: 'text-emerald-400', 
      border: 'border-emerald-500/20', 
      accent: '#10B981',
      code: 'EMI'
    };
  }
  return { 
    bg: 'bg-slate-500/[0.08]', 
    text: 'text-slate-300', 
    border: 'border-slate-500/20', 
    accent: '#94A3B8',
    code: 'LOAN'
  };
};
