import { useState, type FormEvent } from 'react';
import { Bug, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SITE } from '../../lib/site';
import { ContentPage, GitHubMark } from '../../components/site/SiteChrome';
import { Reveal } from '../../components/site/Reveal';
import { Button, Card, Field, Input, Select, Textarea } from '../../components/ui';

const TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'feedback', label: 'Feedback or feature idea' },
  { value: 'bug', label: 'Something isn’t working' },
  { value: 'privacy', label: 'Privacy or my data' },
  { value: 'other', label: 'Something else' },
];

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real people never see or fill this
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Please tell us your name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email so we can reply.';
    if (message.trim().length < 10) errs.message = 'A little more detail, please (10+ characters).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (website) return setState('sent'); // quietly drop bot submissions

    setState('sending');
    if (!supabase) {
      // No backend configured (local development): fall back to a GitHub issue
      window.open(`${SITE.issues}/new?title=${encodeURIComponent(`[${topic}] Message from ${name.trim()}`)}`, '_blank', 'noopener');
      return setState('idle');
    }
    const { error } = await supabase.from('contact_messages').insert({
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
    });
    setState(error ? 'error' : 'sent');
  }

  return (
    <ContentPage eyebrow="Contact" title="We’d love to hear from you" intro="Questions, feedback, a bug, or an idea that would make Tenura more useful for your family — send it over.">
      <div className="grid gap-8 md:grid-cols-[1fr_260px]">
        <Reveal>
          <Card className="p-6 sm:p-8">
            {state === 'sent' ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-positive" />
                <h2 className="mt-4 text-xl font-semibold text-ink">Message sent</h2>
                <p className="mt-2 text-sm text-ink-muted">Thanks, {name.trim().split(' ')[0] || 'friend'}. We’ll reply to {email.trim()} soon.</p>
                <Button className="mt-6" onClick={() => { setMessage(''); setState('idle'); }}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" error={errors.name} htmlFor="c-name">
                    <Input id="c-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                  </Field>
                  <Field label="Email" error={errors.email} htmlFor="c-email">
                    <Input id="c-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
                  </Field>
                </div>
                <Field label="Topic" htmlFor="c-topic">
                  <Select id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
                <Field label="Message" error={errors.message} htmlFor="c-message" hint={`${message.length}/4000`}>
                  <Textarea id="c-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} placeholder="How can we help?" />
                </Field>
                <div className="absolute -left-[9999px]" aria-hidden>
                  <label htmlFor="c-website">Website</label>
                  <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                {state === 'error' && (
                  <p role="alert" className="rounded-xl bg-negative-soft px-3 py-2.5 text-sm text-negative">
                    Couldn’t send your message. Please try again, or <a href={SITE.issues} target="_blank" rel="noreferrer" className="underline">open a GitHub issue</a>.
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" loading={state === 'sending'} className="mt-2 justify-self-start">
                  Send message
                </Button>
                <p className="text-xs text-ink-faint">We only use your email to reply. See our <a href="#/privacy" className="underline underline-offset-2">privacy policy</a>.</p>
              </form>
            )}
          </Card>
        </Reveal>

        <div className="space-y-3">
          {[
            { icon: MessageSquare, title: 'Feedback & ideas', body: 'Tell us what would make your month easier to manage.' },
            { icon: Bug, title: 'Found a bug?', body: 'Include what you clicked and what you expected — screenshots help.' },
            { icon: ShieldCheck, title: 'Privacy requests', body: 'Choose “Privacy or my data” and we’ll prioritise it.' },
          ].map((c, i) => (
            <Reveal key={c.title} delay={100 + i * 80}>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <c.icon className="h-4 w-4 text-ink-muted" />
                <p className="mt-2 text-sm font-medium text-ink">{c.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-muted">{c.body}</p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={360}>
            <a href={SITE.issues} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
              <GitHubMark className="h-4 w-4" /> Open an issue on GitHub
            </a>
          </Reveal>
        </div>
      </div>
    </ContentPage>
  );
}
