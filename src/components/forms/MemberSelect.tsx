import { useFinance } from '../../context/FinanceContext';
import { Select } from '../ui';

export function MemberSelect({ id, value, onChange }: { id?: string; value: string; onChange: (id: string) => void }) {
  const { data } = useFinance();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {data.members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.isPrimary ? ' (you)' : ` · ${m.relation}`}
        </option>
      ))}
    </Select>
  );
}
