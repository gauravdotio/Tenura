/** Public site details shown in the footer, legal pages and contact page. */
export const SITE = {
  name: 'Tenura',
  url: 'https://tenura.gauravdot.in',
  tagline: 'Every EMI, card bill and premium your family pays — in one place.',
  author: 'Gaurav Rawat',
  github: 'https://github.com/gauravdotio/Tenura',
  issues: 'https://github.com/gauravdotio/Tenura/issues',
  /** Public key for web-push reminders (the private half lives only in Supabase secrets). */
  vapidPublicKey: 'BJu02zar3bllcb2TYgacQX4jG0EsW2HrsbohC9qYS1DYM7srBbZK6g2G7G_ZI_9NmoOLEye6S7etuN56hFPyQtA',
  /** Legal pages show this as their "last updated" date. */
  policiesUpdated: '2 October 2026',
} as const;
