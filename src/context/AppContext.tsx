'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  dept: string;
  status: string;
  queries: number;
  enabled: boolean;
}

interface AppContextValue {
  dept: string;
  setDept: (dept: string) => void;
  currentUser: Profile | null;
  authUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  dept: 'all',
  setDept: () => {},
  currentUser: null,
  authUser: null,
  loading: true,
  signOut: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dept, setDept] = useState('all');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setCurrentUser(data as Profile);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setAuthUser(user);
      if (user) loadProfile(user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <AppContext.Provider value={{ dept, setDept, currentUser, authUser, loading, signOut }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
