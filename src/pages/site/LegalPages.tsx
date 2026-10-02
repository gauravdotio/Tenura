import { Cloud, KeyRound, Lock, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { SITE } from '../../lib/site';
import { ContentPage, Prose } from '../../components/site/SiteChrome';
import { Reveal } from '../../components/site/Reveal';
import { href } from '../../lib/router';

function Toc({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="On this page" className="mb-10 rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">On this page</p>
      <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {items.map(([id, label], i) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-ink-muted transition-colors hover:text-ink"
            >
              {i + 1}. {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PrivacyPage() {
  const toc: [string, string][] = [
    ['collect', 'What we collect'],
    ['use', 'How we use it'],
    ['store', 'Where it’s stored'],
    ['share', 'Who we share it with'],
    ['local', 'Cookies & local storage'],
    ['rights', 'Your rights'],
    ['retention', 'Retention & deletion'],
    ['changes', 'Changes & contact'],
  ];
  return (
    <ContentPage eyebrow="Legal" title="Privacy policy" intro="Short version: you own your data, we never sell it, and you can export or delete it whenever you like." updated={SITE.policiesUpdated}>
      <Toc items={toc} />
      <Prose>
        <h2 id="collect">1. What we collect</h2>
        <ul>
          <li><strong>Account details</strong> — your name, email address and a password (stored only as a secure hash by our authentication provider; we never see it).</li>
          <li><strong>What you enter</strong> — the loans, cards, EMI schedules, expenses, insurance policies and family members you add. You decide what goes in.</li>
          <li><strong>Messages you send us</strong> — through the contact form: your name, email and message.</li>
          <li><strong>Basic technical logs</strong> — our hosting providers keep standard request logs (such as IP address and browser type) for security and reliability.</li>
        </ul>
        <p>We do <strong>not</strong> ask for netbanking credentials, card numbers, CVVs, OTPs, PAN or Aadhaar — and you should never enter them.</p>

        <h2 id="use">2. How we use it</h2>
        <p>Only to run Tenura for you: to show your dashboard, calculate schedules and reminders, keep you signed in, and reply when you contact us. We don’t use your financial data for advertising, profiling or credit decisions, and we don’t run third-party analytics or ad trackers.</p>

        <h2 id="store">3. Where it’s stored</h2>
        <p>Your data is stored in a Postgres database run by Supabase, and the site is served by Vercel. Every table is protected with row-level security, so each record can only be read or changed by the account that owns it. See the <a href={href('/security')}>security page</a> for details.</p>

        <h2 id="share">4. Who we share it with</h2>
        <p>Nobody, except the infrastructure providers above, which process data only to host the service. We never sell or rent personal data. We would only disclose information if required by law.</p>

        <h2 id="local">5. Cookies & local storage</h2>
        <p>Tenura doesn’t use advertising or tracking cookies. Your browser’s local storage keeps your sign-in session and preferences such as theme.</p>

        <h2 id="rights">6. Your rights</h2>
        <ul>
          <li><strong>Access & portability</strong> — export everything as JSON or CSV from Settings at any time.</li>
          <li><strong>Correction</strong> — edit or remove any record yourself.</li>
          <li><strong>Deletion</strong> — delete your account from Settings; all of your data is erased with it.</li>
          <li><strong>Questions or complaints</strong> — <a href={href('/contact')}>contact us</a> and choose “Privacy or my data”.</li>
        </ul>

        <h2 id="retention">7. Retention & deletion</h2>
        <p>We keep your data while your account exists. When you delete your account, your records are removed from the live database immediately; residual copies in provider backups expire on their normal schedule.</p>

        <h2 id="changes">8. Changes & contact</h2>
        <p>If this policy changes in a meaningful way we’ll update the date above and, for significant changes, tell signed-in users. Questions? <a href={href('/contact')}>Get in touch</a>.</p>
      </Prose>
    </ContentPage>
  );
}

export function TermsPage() {
  const toc: [string, string][] = [
    ['service', 'The service'],
    ['advice', 'Not financial advice'],
    ['account', 'Your account'],
    ['use', 'Acceptable use'],
    ['data', 'Your data'],
    ['availability', 'Availability'],
    ['liability', 'Liability'],
    ['changes', 'Changes'],
  ];
  return (
    <ContentPage eyebrow="Legal" title="Terms of use" intro="The rules for using Tenura, in plain language." updated={SITE.policiesUpdated}>
      <Toc items={toc} />
      <Prose>
        <h2 id="service">1. The service</h2>
        <p>Tenura is a free tool, currently in beta, for keeping track of household loans, credit cards, EMIs, insurance premiums and expenses. By creating an account you agree to these terms.</p>

        <h2 id="advice">2. Not financial advice</h2>
        <p>Tenura is a tracker. It isn’t a bank, lender, insurer or registered financial adviser. Calculations such as EMIs, interest and projections are estimates based on what you enter — <strong>always confirm amounts and due dates with your lender or insurer</strong>. Tenura doesn’t make payments for you.</p>

        <h2 id="account">3. Your account</h2>
        <p>Keep your password safe and tell us if you think someone else has accessed your account. You’re responsible for the information you add, including details about family members, and for having their permission to record it.</p>

        <h2 id="use">4. Acceptable use</h2>
        <ul>
          <li>Don’t try to access other people’s data, probe or overload the service, or get around its security.</li>
          <li>Don’t use Tenura for anything unlawful.</li>
          <li>Don’t store sensitive credentials such as card numbers, CVVs, OTPs or passwords in notes.</li>
        </ul>

        <h2 id="data">5. Your data</h2>
        <p>You own what you put in. You give us permission only to store and process it to provide the service. You can export or delete it at any time — see the <a href={href('/privacy')}>privacy policy</a>.</p>

        <h2 id="availability">6. Availability</h2>
        <p>We work to keep Tenura running and your data safe, but as a beta service it’s provided “as is”, and features may change. Export a backup from time to time.</p>

        <h2 id="liability">7. Liability</h2>
        <p>To the extent permitted by law, Tenura isn’t liable for missed payments, late fees, penalties or other losses arising from reliance on the app. Our total liability for any claim is limited to the amount you’ve paid us — currently nothing.</p>

        <h2 id="changes">8. Changes</h2>
        <p>We may update these terms; the date above shows the latest version. Continuing to use Tenura after a change means you accept it. Questions? <a href={href('/contact')}>Contact us</a>.</p>
      </Prose>
    </ContentPage>
  );
}

export function SecurityPage() {
  const items = [
    { icon: Lock, title: 'Row-level security', body: 'Every table carries an owner id, and Postgres policies only allow the signed-in owner to read or write a row — even if the app had a bug.' },
    { icon: UserCheck, title: 'Cross-account checks', body: 'Database triggers reject any record that points at a family member from a different account.' },
    { icon: KeyRound, title: 'Managed authentication', body: 'Sign-in is handled by Supabase Auth. Passwords are hashed; Tenura’s code never stores or logs them.' },
    { icon: Cloud, title: 'Encrypted in transit', body: 'All traffic is served over HTTPS, and the database is reachable only through authenticated API requests.' },
    { icon: ShieldCheck, title: 'Nothing left on screen', body: 'Signing out discards your household’s data from memory, so the next person on the device sees nothing.' },
    { icon: Trash2, title: 'Real deletion', body: 'Deleting your account removes your login and, through cascading deletes, every record you created.' },
  ];
  return (
    <ContentPage eyebrow="Trust" title="Security at Tenura" intro="Your household’s finances are sensitive. Here’s how Tenura keeps them that way." updated={SITE.policiesUpdated}>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={(i % 2) * 80}>
            <div className="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-positive-soft text-positive"><it.icon className="h-4 w-4" /></span>
              <h2 className="mt-4 font-semibold text-ink">{it.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{it.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-12">
        <Prose>
          <h2>What we never ask for</h2>
          <p>Tenura doesn’t connect to your bank and never needs netbanking passwords, card numbers, CVVs or OTPs. If anyone claiming to be Tenura asks for them, it isn’t us.</p>
          <h2>Reporting a vulnerability</h2>
          <p>If you believe you’ve found a security issue, please report it privately through the <a href={href('/contact')}>contact form</a> (topic “Privacy or my data”) rather than opening a public issue. We’ll acknowledge it promptly and keep you updated while we fix it.</p>
        </Prose>
      </Reveal>
    </ContentPage>
  );
}
