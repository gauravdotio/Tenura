import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from '.';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'danger';
  hidden?: boolean;
}

/** A "…" button with a small dropdown of row actions. */
export function RowMenu({ items, label = 'Actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          // open upwards when close to the bottom of the viewport
          setUp(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 240);
          setOpen((o) => !o);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className={cx('absolute right-0 z-30 w-52 animate-fade-in rounded-xl border border-line bg-surface-raised p-1.5 text-left shadow-lg', up ? 'bottom-full mb-1' : 'top-full mt-1')}>
          {visible.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] hover:bg-surface-sunken',
                item.tone === 'danger' ? 'text-negative' : 'text-ink',
              )}
            >
              {item.icon && <span className="text-ink-faint [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
