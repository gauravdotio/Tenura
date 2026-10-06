import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, planReminders, todayInIndia, type DueItem, type NotifySettings } from './plan';

const item = (over: Partial<DueItem>): DueItem => ({
  recipient_id: 'u1', recipient_email: 'gaurav@test.in', recipient_name: 'Gaurav Rawat',
  item_key: 'i-1', kind: 'installment', title: 'HDFC Personal Loan', subtitle: 'EMI 9 of 36',
  amount: '9893.00', due_date: '2026-10-09', member_name: 'Gaurav', ...over,
});
const SITE = 'https://tenura.gauravdot.in';

describe('planReminders', () => {
  it('sends one email per lead time, 3 and 1 days before', () => {
    const items = [
      item({ item_key: 'i-1', due_date: '2026-10-09' }),
      item({ item_key: 'p-1', kind: 'premium', title: 'Jeevan Labh', subtitle: 'LIC premium', amount: 48500, due_date: '2026-10-09' }),
      item({ item_key: 'c-1', kind: 'card', title: 'SBI Card', subtitle: 'Card bill', amount: 26000, due_date: '2026-10-07' }),
      item({ item_key: 'x', due_date: '2026-10-08' }), // 2 days away: no reminder
    ];
    const msgs = planReminders(items, new Map(), '2026-10-06', SITE);
    expect(msgs.map((m) => `${m.channel}:${m.subject}`)).toEqual([
      'email:2 payments due in 3 days · ₹58,393',
      'email:SBI Card — ₹26,000 due tomorrow',
    ]);
    expect(msgs[0].log).toEqual([{ item_key: 'i-1', due_date: '2026-10-09' }, { item_key: 'p-1', due_date: '2026-10-09' }]);
    expect(msgs[0].html).toContain('Jeevan Labh');
    expect(msgs[0].text).toContain('https://tenura.gauravdot.in/#/app');
  });

  it('respects each person’s channels and lead times', () => {
    const s: NotifySettings = { ...DEFAULT_SETTINGS, email_enabled: false, push_enabled: true, whatsapp_enabled: true, whatsapp_number: '+919999999999', days_before: [7] };
    const msgs = planReminders([item({ due_date: '2026-10-13' }), item({ item_key: 'i-2', due_date: '2026-10-09' })], new Map([['u1', s]]), '2026-10-06', SITE);
    expect(msgs.map((m) => m.channel)).toEqual(['push', 'whatsapp']);
    expect(msgs[0].push).toMatchObject({ title: 'HDFC Personal Loan', url: 'https://tenura.gauravdot.in/#/app' });
    expect(msgs[1].to).toBe('+919999999999');
  });

  it('sends a monthly digest on the 1st, logged once per month', () => {
    const items = [item({ due_date: '2026-11-05' }), item({ item_key: 'p-1', amount: 1000, due_date: '2026-11-20' }), item({ item_key: 'z', due_date: '2026-12-01' })];
    const msgs = planReminders(items, new Map(), '2026-11-01', SITE).filter((m) => m.kind === 'digest');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].subject).toBe('Nov 2026 at a glance · ₹10,893 due');
    expect(msgs[0].log).toEqual([{ item_key: 'digest-2026-11', due_date: '2026-11-01' }]);
  });

  it('keeps different people’s reminders apart and escapes HTML', () => {
    const msgs = planReminders(
      [item({ recipient_id: 'u1', due_date: '2026-10-07' }), item({ recipient_id: 'u2', recipient_email: 'didi@test.in', recipient_name: 'Didi', title: '<b>MacBook</b>', due_date: '2026-10-07' })],
      new Map(), '2026-10-06', SITE,
    );
    expect(msgs.map((m) => m.to)).toEqual(['gaurav@test.in', 'didi@test.in']);
    expect(msgs[1].html).toContain('&lt;b&gt;MacBook&lt;/b&gt;');
    expect(msgs[1].html).not.toContain('<b>MacBook');
  });

  it('uses the Indian calendar date', () => {
    // 20:00 UTC on 6 Oct is already 7 Oct in India
    expect(todayInIndia(new Date('2026-10-06T20:00:00Z'))).toBe('2026-10-07');
  });
});
