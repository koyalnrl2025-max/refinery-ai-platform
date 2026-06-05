'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Static export: server-side redirect() doesn't work — use client-side instead
export default function RootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}
