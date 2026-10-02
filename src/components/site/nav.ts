import { navigate } from '../../lib/router';

/** Smooth-scroll to a landing-page section (or go there first from another page). */
export function goToSection(id: string, e?: React.MouseEvent) {
  e?.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  else {
    navigate('/');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
  }
}
