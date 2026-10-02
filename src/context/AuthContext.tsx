import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  createLocalAccount,
  deleteLocalAccount,
  getLocalSession,
  purgeLegacyStorage,
  setLocalSession,
  updateLocalAccount,
  verifyLocalAccount,
  type LocalAccount,
} from '../lib/auth/localAuth';
import { LocalRepository } from '../lib/data/localRepository';

export type AuthMode = 'supabase' | 'local';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mode: AuthMode;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored session has been checked. */
  loading: boolean;
  /** Where real accounts live in this build. */
  backend: 'supabase' | 'local';
  signIn(email: string, password: string): Promise<void>;
  /** Resolves to `confirmEmail: true` when Supabase requires email confirmation first. */
  signUp(input: { name: string; email: string; password: string }): Promise<{ confirmEmail: boolean }>;
  signOut(): Promise<void>;
  updateName(name: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const fromSupabase = (u: User): AuthUser => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.full_name as string | undefined)?.trim() || u.email?.split('@')[0] || 'You',
  mode: 'supabase',
});

const fromLocal = (a: LocalAccount): AuthUser => ({ id: a.id, name: a.name, email: a.email, mode: 'local' });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Local sessions can be read synchronously; Supabase sessions are restored in the effect below
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (supabase) return null;
    const account = getLocalSession();
    return account ? fromLocal(account) : null;
  });
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    purgeLegacyStorage();

    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? fromSupabase(data.session.user) : null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? fromSupabase(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      setUser(fromSupabase(data.user));
      return;
    }
    const account = await verifyLocalAccount(email, password);
    setLocalSession(account.id);
    setUser(fromLocal(account));
  }, []);

  const signUp = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw new Error(error.message);
      // With "Confirm email" on, Supabase returns a user but no session.
      if (!data.session) return { confirmEmail: true };
      setUser(fromSupabase(data.session.user));
      return { confirmEmail: false };
    }
    const account = await createLocalAccount(name, email, password);
    setLocalSession(account.id);
    setUser(fromLocal(account));
    return { confirmEmail: false };
  }, []);

  const signOut = useCallback(async () => {
    if (user?.mode === 'supabase' && supabase) await supabase.auth.signOut();
    if (user?.mode === 'local') setLocalSession(null);
    setUser(null);
  }, [user]);

  const updateName = useCallback(async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (user.mode === 'supabase' && supabase) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (error) throw new Error(error.message);
    } else if (user.mode === 'local') {
      updateLocalAccount(user.id, { name: trimmed });
    }
    setUser({ ...user, name: trimmed });
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    if (user.mode === 'supabase' && supabase) {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
    } else if (user.mode === 'local') {
      LocalRepository.remove(user.id);
      deleteLocalAccount(user.id);
      setLocalSession(null);
    }
    setUser(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user, loading, backend: isSupabaseConfigured ? 'supabase' : 'local',
      signIn, signUp, signOut, updateName, deleteAccount,
    }),
    [user, loading, signIn, signUp, signOut, updateName, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
