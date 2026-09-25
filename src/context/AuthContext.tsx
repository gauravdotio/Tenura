import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserAccount, AuthContextType } from '../types/auth';
import { supabase, getSupabaseCredentials } from '../lib/supabase';

const STORAGE_KEYS = {
  USERS_LIST: 'tenura_registered_users_v3',
  ACTIVE_SESSION: 'tenura_active_session_user_id_v3',
};

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user_gaurav',
    name: 'Gaurav Rawat',
    email: 'gauravrawat@tenura.app',
    avatarColor: 'from-blue-500 to-indigo-600',
    createdAt: '2026-09-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
  },
];

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
  'from-cyan-500 to-blue-500',
];

function deduplicateUsers(usersList: UserAccount[]): UserAccount[] {
  const result: UserAccount[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  // Prioritize real/synced accounts over placeholder demo ID
  const sorted = [...usersList].sort((a, b) => {
    if (a.id === 'user_gaurav') return 1;
    if (b.id === 'user_gaurav') return -1;
    return 0;
  });

  for (const u of sorted) {
    const normName = u.name.trim().toLowerCase();
    const normEmail = u.email ? u.email.trim().toLowerCase() : '';

    if (seenIds.has(u.id)) continue;
    if (normEmail && seenEmails.has(normEmail)) continue;
    if (seenNames.has(normName)) continue;

    seenIds.add(u.id);
    if (normEmail) seenEmails.add(normEmail);
    seenNames.add(normName);
    result.push(u);
  }

  return result.length > 0 ? result : DEFAULT_USERS;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const credentials = getSupabaseCredentials();
  const isCloudConnected = credentials.isConfigured;
  const cloudProvider = isCloudConnected ? 'supabase' : 'local';

  const [isLoading, setIsLoading] = useState(true);

  // Accounts list
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateUsers(parsed);
      }
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      const usersList: UserAccount[] = savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;
      if (activeId) {
        const found = usersList.find(u => u.id === activeId);
        if (found) return found;
      }
      const lastActive = localStorage.getItem('tenura_last_active_user');
      if (lastActive) {
        const parsed = JSON.parse(lastActive);
        if (parsed?.id) return parsed;
      }
    } catch {}
    return null;
  });

  // Initialize and Restore Session
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (isCloudConnected) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (session?.user) {
            const user = session.user;
            const accountName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            const authedUser: UserAccount = {
              id: user.id,
              name: accountName,
              email: user.email || '',
              avatarColor: 'from-blue-500 to-indigo-600',
              createdAt: user.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            setCurrentUser(authedUser);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Supabase session restore error:', err);
        }
      }

      // Local session restore
      try {
        const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (activeId && isMounted) {
          const found = users.find(u => u.id === activeId);
          if (found) setCurrentUser(found);
        }
      } catch (e) {
        console.error('Local session restore error:', e);
      }

      if (isMounted) setIsLoading(false);
    };

    initAuth();

    if (isCloudConnected) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const user = session.user;
          const accountName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          const authedUser: UserAccount = {
            id: user.id,
            name: accountName,
            email: user.email || '',
            avatarColor: 'from-blue-500 to-indigo-600',
            createdAt: user.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(authedUser);
          setUsers(prev => deduplicateUsers([authedUser, ...prev]));
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isCloudConnected, users]);

  // Persist users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
    } catch {}
  }, [users]);

  // Persist active session (only write on active session; removal is strictly handled in logout)
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, currentUser.id);
        localStorage.setItem('tenura_last_active_user', JSON.stringify(currentUser));
      }
    } catch {}
  }, [currentUser]);

  // Login handler
  const login = useCallback(async (userIdOrEmail: string, pinOrPassword?: string): Promise<{ success: boolean; error?: string }> => {
    const raw = (userIdOrEmail || '').trim();
    const password = (pinOrPassword || '').trim();

    if (!raw) {
      return { success: false, error: 'Please enter your email or username' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password' };
    }

    // Candidate email formats
    let emailToTry = raw.toLowerCase();
    if (!emailToTry.includes('@')) {
      const matched = users.find(u => u.name.toLowerCase() === raw.toLowerCase() || u.id.toLowerCase() === raw.toLowerCase());
      if (matched?.email) {
        emailToTry = matched.email.toLowerCase();
      } else {
        emailToTry = `${raw.toLowerCase().replace(/[^a-z0-9]/g, '')}@tenura.app`;
      }
    }

    // 1. Supabase Cloud Sign-In
    if (isCloudConnected) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password: password,
        });

        if (!error && data?.session?.user) {
          const u = data.session.user;
          const accountName = u.user_metadata?.full_name || raw.split('@')[0] || 'User';
          const authedUser: UserAccount = {
            id: u.id,
            name: accountName,
            email: u.email || emailToTry,
            avatarColor: 'from-blue-500 to-indigo-600',
            createdAt: u.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(authedUser);
          setUsers(prev => deduplicateUsers([authedUser, ...prev]));
          return { success: true };
        }

        // If Supabase returned error (e.g. wrong password or email not confirmed)
        if (error) {
          // Check if user exists locally
          const localUser = users.find(u => u.email.toLowerCase() === emailToTry || u.name.toLowerCase() === raw.toLowerCase());
          if (localUser && (!localUser.pin || localUser.pin === password)) {
            setCurrentUser(localUser);
            return { success: true };
          }
          return { success: false, error: error.message || 'Invalid login credentials' };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Login failed' };
      }
    }

    // 2. Local Mode Sign-In
    const localUser = users.find(u => 
      u.email.toLowerCase() === emailToTry || 
      u.name.toLowerCase() === raw.toLowerCase() ||
      u.id === raw
    );

    if (localUser) {
      if (localUser.pin && localUser.pin !== password) {
        return { success: false, error: 'Incorrect password' };
      }
      setCurrentUser(localUser);
      return { success: true };
    }

    return { success: false, error: 'Account not found. Please create an account.' };
  }, [isCloudConnected, users]);

  // Instant Login for fast profile switching
  const instantLogin = useCallback(async (user: UserAccount): Promise<{ success: boolean; error?: string }> => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, user.id);
    return { success: true };
  }, []);

  // Register / Sign Up handler
  const register = useCallback(async (data: { name: string; email: string; pin?: string; startEmpty?: boolean }): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim().toLowerCase();
    const password = data.pin?.trim() || '';

    if (!trimmedName) {
      return { success: false, error: 'Please enter your full name' };
    }
    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    let createdId = `user_${Date.now()}_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    if (isCloudConnected) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              full_name: trimmedName,
            }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (authData?.user) {
          createdId = authData.user.id;
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Registration failed in Supabase' };
      }
    }

    const colorIndex = users.length % AVATAR_GRADIENTS.length;
    const newUser: UserAccount = {
      id: createdId,
      name: trimmedName,
      email: trimmedEmail,
      pin: password,
      avatarColor: AVATAR_GRADIENTS[colorIndex],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setUsers(prev => deduplicateUsers([newUser, ...prev]));
    setCurrentUser(newUser);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, newUser.id);

    // Initialize empty vault
    const initials = trimmedName.split(' ').map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('') || 'U';
    const initialUserData = {
      profiles: [
        {
          id: `profile_${createdId}`,
          name: trimmedName,
          initials,
          role: 'Primary Account',
          accentColor: '#3B82F6',
          monthlyBudget: 75000,
        }
      ],
      liabilities: [],
      schedules: [],
      expenses: [],
      selectedProfileId: `profile_${createdId}`,
    };

    try {
      localStorage.setItem(`tenura_vault_${createdId}`, JSON.stringify(initialUserData));
    } catch {}

    // In Supabase, also create initial profile row
    if (isCloudConnected) {
      try {
        await supabase.from('profiles').insert([{
          id: `profile_${createdId.slice(0, 8)}`,
          user_id: createdId,
          name: trimmedName,
          initials,
          role: 'Primary Account',
          accent_color: '#3B82F6',
          monthly_budget: 75000,
        }]);
      } catch (e) {
        console.warn('Initial Supabase profile creation:', e);
      }
    }

    return { success: true, user: newUser };
  }, [isCloudConnected, users]);

  const logout = useCallback(async () => {
    if (isCloudConnected) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error signing out of Supabase:', e);
      }
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      localStorage.removeItem('tenura_last_active_user');
    } catch {}
  }, [isCloudConnected]);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      localStorage.removeItem(`tenura_vault_${userId}`);
    } catch {}
    if (currentUser?.id === userId) {
      logout();
    }
  }, [currentUser, logout]);

  const updateUserPin = useCallback((userId: string, newPin?: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, pin: newPin ? newPin.trim() : undefined };
      }
      return u;
    }));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, pin: newPin ? newPin.trim() : undefined } : null);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isCloudConnected,
      cloudProvider,
      isLoading,
      login,
      instantLogin,
      register,
      logout,
      deleteUser,
      updateUserPin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
