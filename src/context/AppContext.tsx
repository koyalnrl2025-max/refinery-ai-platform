'use client';

import React, { createContext, useContext, useState } from 'react';

interface CurrentUser {
  name: string;
  role: string;
  dept: string;
}

interface AppContextValue {
  dept: string;
  setDept: (dept: string) => void;
  currentUser: CurrentUser;
}

const AppContext = createContext<AppContextValue>({
  dept: 'all',
  setDept: () => {},
  currentUser: { name: 'Sarah Mitchell', role: 'admin', dept: 'All' },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dept, setDept] = useState('all');
  const currentUser: CurrentUser = { name: 'Sarah Mitchell', role: 'admin', dept: 'All' };

  return (
    <AppContext.Provider value={{ dept, setDept, currentUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
