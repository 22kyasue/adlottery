'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from './supabase-client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  vibe_chips: number;
  vibe_coins: number;
  is_booster_active: boolean;
  booster_expires_at: string | null;
  is_shadowbanned: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = supabaseClient;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, vibe_chips, vibe_coins, is_booster_active, booster_expires_at, is_shadowbanned')
      .eq('id', userId)
      .single();
    if (data) setUserProfile(data);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchProfile(user.id);
    }).catch((err) => {
      console.error("Auth initialization check failed:", err);
    }).finally(() => {
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, referralCode?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: referralCode ? { referral_code: referralCode } : undefined,
      },
    });
    if (error) return { error: error.message };
    // Supabase returns an empty identities array when the email is already registered
    if (data.user?.identities?.length === 0) {
      return { error: 'An account with this email already exists. Please sign in instead.' };
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // Fire-and-forget: referral reward
      fetch('/api/referral/apply', { method: 'POST' }).catch(() => {});
      // Early adopter launch campaign reward
      fetch('/api/rewards/early-adopter', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data?.success) {
            sessionStorage.setItem('launch_bonus_pending', '1');
          }
        })
        .catch(() => {});
    }
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    // Hard redirect clears all client state cleanly
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
