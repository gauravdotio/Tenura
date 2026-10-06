import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { SharedWorkspace } from './FinanceContext';
import { listSharedProfiles, type SharedProfileRow } from '../lib/family';

/**
 * Which household the signed-in user is looking at: their own, or a profile a
 * family member shared with them (by accepting an invite).
 */
interface WorkspaceValue {
  /** Profiles shared with this user (empty in local mode). */
  sharedProfiles: SharedWorkspace[];
  /** The active shared profile, or undefined for the user's own household. */
  active?: SharedWorkspace;
  switchTo(memberId: string | 'own'): void;
  refresh(): Promise<SharedWorkspace[]>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const toWorkspace = (r: SharedProfileRow): SharedWorkspace => ({ ownerId: r.owner_id, ownerName: r.owner_name, memberId: r.member_id, memberName: r.member_name });

function readStored(key: string) {
  try {
    return (key && localStorage.getItem(key)) || 'own';
  } catch {
    return 'own';
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Tagged with the account it was loaded for, so a previous account's list never shows
  const [loaded, setLoaded] = useState<{ userId: string; list: SharedWorkspace[] }>({ userId: '', list: [] });
  const sharedProfiles = useMemo(() => (user && loaded.userId === user.id ? loaded.list : []), [user, loaded]);
  const key = user ? `tenura:v4:workspace:${user.id}` : '';
  // The user's last choice, remembered per account
  const [choice, setChoice] = useState<{ key: string; id: string }>({ key: '', id: 'own' });
  const activeId = choice.key === key ? choice.id : readStored(key);

  const refresh = useCallback(async () => {
    if (!user || user.mode !== 'supabase') return [];
    try {
      const rows = await listSharedProfiles();
      const list = rows.map(toWorkspace);
      setLoaded({ userId: user.id, list });
      return list;
    } catch (err) {
      console.error('Could not load shared profiles', err);
      return [];
    }
  }, [user]);

  // Reload the list and the remembered choice whenever the account changes
  // Load the list once per signed-in account
  useEffect(() => {
    if (!user || user.mode !== 'supabase') return;
    let cancelled = false;
    listSharedProfiles()
      .then((rows) => {
        if (!cancelled) setLoaded({ userId: user.id, list: rows.map(toWorkspace) });
      })
      .catch((err) => console.error('Could not load shared profiles', err));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const switchTo = useCallback(
    (id: string | 'own') => {
      setChoice({ key, id });
      try {
        if (key) localStorage.setItem(key, id);
      } catch {
        /* private mode */
      }
    },
    [key],
  );

  // An unlinked or removed profile falls back to the user's own household
  const active = sharedProfiles.find((p) => p.memberId === activeId);
  const value = useMemo(() => ({ sharedProfiles, active, switchTo, refresh }), [sharedProfiles, active, switchTo, refresh]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
