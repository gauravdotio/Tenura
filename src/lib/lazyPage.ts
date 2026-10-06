import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'tenura:chunk-reload';

/**
 * `React.lazy` for a page, safe across deploys. Each deploy renames the page
 * files, so a tab opened before a deploy asks for files that no longer exist.
 * When that happens, reload once to pick up the new version instead of
 * waiting forever; if it still fails, the error boundary shows a message.
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<T>) {
  const Page = lazy(async () => {
    try {
      const component = await load();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* private mode */
      }
      return { default: component };
    } catch (err) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
        if (!reloaded) sessionStorage.setItem(RELOAD_KEY, '1');
      } catch {
        reloaded = true; // can't remember — don't risk a reload loop
      }
      if (!reloaded) {
        window.location.reload();
        return new Promise<never>(() => {}); // keep the spinner while the page reloads
      }
      throw err;
    }
  });
  return Object.assign(Page, { preload: load });
}
