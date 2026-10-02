import { ArrowLeft } from 'lucide-react';
import { navigate } from '../../lib/router';
import { SiteFooter, SiteHeader } from '../../components/site/SiteChrome';
import { Button } from '../../components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative text-center">
          <p className="rise-in num text-7xl font-semibold tracking-tight text-ink-faint/60 sm:text-8xl">404</p>
          <h1 className="rise-in mt-4 text-2xl font-semibold tracking-tight text-ink [animation-delay:80ms]">This page has been paid off</h1>
          <p className="rise-in mt-2 text-ink-muted [animation-delay:160ms]">…or it never existed. Either way, there’s nothing due here.</p>
          <Button variant="primary" className="rise-in mt-8 [animation-delay:240ms]" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/')}>
            Back to home
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
