import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Member, MemberColor } from '../../lib/finance/types';
import { newId } from '../../lib/finance/sample';
import { MEMBER_COLOR } from '../../lib/format';
import { Button, Field, Input, MemberAvatar, Modal, Select, cx } from '../ui';

const RELATIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Other family', 'Business'];

export function MemberForm({ member, onClose }: { member?: Member; onClose: () => void }) {
  const { saveMember, data, setScope } = useFinance();
  const toast = useToast();
  const [name, setName] = useState(member?.name ?? '');
  const [relation, setRelation] = useState(member?.relation ?? 'Spouse');
  const [color, setColor] = useState<MemberColor>(
    member?.color ?? (['teal', 'violet', 'amber', 'rose', 'slate', 'blue'] as MemberColor[])[data.members.length % 6],
  );
  const [budget, setBudget] = useState(member ? String(member.monthlyBudget || '') : '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [contactError, setContactError] = useState<{ email?: string; phone?: string }>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a name.');
    if (data.members.some((m) => m.id !== member?.id && m.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError('Someone in your household already has this name.');
    }
    const ce: { email?: string; phone?: string } = {};
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) ce.email = 'Enter a valid email.';
    if (phone.trim() && !/^\+?[0-9 ]{10,16}$/.test(phone.trim())) ce.phone = 'Enter a 10-digit mobile number.';
    setContactError(ce);
    if (ce.email || ce.phone) return;
    setSaving(true);
    try {
      const saved: Member = {
        ...member, // keeps login/invite details, which are managed separately
        id: member?.id ?? newId(),
        name: trimmed,
        relation: member?.isPrimary ? 'Self' : relation,
        color,
        monthlyBudget: Number(budget) || 0,
        isPrimary: member?.isPrimary ?? false,
        email: member?.isPrimary ? undefined : email.trim().toLowerCase() || undefined,
        phone: member?.isPrimary ? undefined : phone.trim() || undefined,
      };
      await saveMember(saved);
      if (!member) setScope(saved.id);
      toast.success(member ? 'Member updated' : `${trimmed} added to your household`);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member ? `Edit ${member.name}` : 'Add a family member'}
      description={member ? undefined : 'Track their cards, loans, policies and spending alongside yours. They don’t need their own login.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="member-form" loading={saving}>
            {member ? 'Save changes' : 'Add member'}
          </Button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} className="grid gap-4" noValidate>
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3">
          <MemberAvatar member={{ name: name || '?', color }} size="lg" />
          <div>
            <p className="text-sm font-semibold text-ink">{name.trim() || 'New member'}</p>
            <p className="text-xs text-ink-muted">{member?.isPrimary ? 'Account holder' : relation}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={error} htmlFor="mf-name">
            <Input id="mf-name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Priya" maxLength={80} />
          </Field>
          {!member?.isPrimary && (
            <Field label="Relationship" htmlFor="mf-rel">
              <Select id="mf-rel" value={relation} onChange={(e) => setRelation(e.target.value)}>
                {RELATIONS.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
          )}
          {!member?.isPrimary && (
            <>
              <Field label="Email" optional error={contactError.email} hint="To invite them to log in and see their own profile." htmlFor="mf-email">
                <Input id="mf-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="didi@example.com" />
              </Field>
              <Field label="Mobile number" optional error={contactError.phone} hint="For sending the invite on WhatsApp." htmlFor="mf-phone">
                <Input id="mf-phone" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
              </Field>
            </>
          )}
          <Field label="Monthly spending budget" optional hint="Used for the budget bar on Expenses." htmlFor="mf-budget">
            <Input id="mf-budget" type="number" inputMode="decimal" min={0} prefix="₹" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="40,000" />
          </Field>
          <Field label="Colour">
            <div className="flex h-10 items-center gap-2">
              {(Object.keys(MEMBER_COLOR) as MemberColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={MEMBER_COLOR[c].label}
                  aria-pressed={color === c}
                  className={cx('flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface-raised transition', MEMBER_COLOR[c].dot, color === c && 'ring-2 ring-ink')}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
