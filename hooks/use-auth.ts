'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && typeof document !== 'undefined' && document.cookie.includes('debug_auth=true')) {
            setUser({ id: 'debug-user-id', email: 'debug@oknexus.com', role: 'authenticated' } as User);
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && typeof document !== 'undefined' && document.cookie.includes('debug_auth=true')) return;
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, loading };
}
