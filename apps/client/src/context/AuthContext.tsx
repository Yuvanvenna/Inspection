import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, Role } from '@antigravity/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ error?: string; role?: Role }>;
  signUp: (data: {
    name: string;
    email: string;
    password?: string;
    role?: Role;
    department?: string;
  }) => Promise<{ error?: string; role?: Role }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('ag_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // Only clear if no offline/demo user saved
        const saved = localStorage.getItem('ag_active_user');
        if (!saved) {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Failed to fetch profile:', error);
      } else {
        const profile = data as UserProfile;
        setUser(profile);
        localStorage.setItem('ag_active_user', JSON.stringify(profile));
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string): Promise<{ error?: string; role?: Role }> => {
    setLoading(true);
    const cleanEmail = email.trim();

    if (!password) {
      setLoading(false);
      return { error: 'Password is required' };
    }

    try {
      // 1. Authenticate via Express API against database
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.data?.profile) {
        const profile = json.data.profile as UserProfile;
        setUser(profile);
        localStorage.setItem('ag_active_user', JSON.stringify(profile));

        // Sign in Supabase client instance so RLS auth.uid() is active
        try {
          if (json.data?.token) {
            await supabase.auth.setSession({
              access_token: json.data.token,
              refresh_token: json.data.refresh_token || json.data.token,
            });
          } else {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
          }
        } catch (authSyncErr) {
          console.warn('Supabase client auth sync note:', authSyncErr);
        }

        setLoading(false);
        return { role: profile.role };
      } else if (json.error) {
        setLoading(false);
        return { error: typeof json.error === 'string' ? json.error : json.error.message || 'Login failed' };
      }
    } catch (apiErr) {
      console.warn('API login call failed, trying client fallback:', apiErr);
    }

    // 2. Direct Supabase query fallback
    try {
      // First sign in with Supabase auth so auth.uid() is defined for RLS
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const profileId = authData?.user?.id;
      let query = supabase.from('profiles').select('*');
      if (profileId) {
        query = query.eq('id', profileId);
      } else {
        query = query.ilike('email', cleanEmail);
      }

      const { data: profile, error: profError } = await query.maybeSingle();

      if (!profError && profile) {
        setUser(profile);
        localStorage.setItem('ag_active_user', JSON.stringify(profile));
        setLoading(false);
        return { role: profile.role };
      }
    } catch (err: any) {
      console.warn('Client fallback login error:', err);
    }

    setLoading(false);
    return { error: 'Invalid email or password. Please contact your manager if you need an account.' };
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password?: string;
    role?: Role;
    department?: string;
  }): Promise<{ error?: string; role?: Role }> => {
    setLoading(true);
    if (!data.password) {
      setLoading(false);
      return { error: 'Password is required (minimum 6 characters)' };
    }

    try {
      // 1. Call server API to register user in Supabase Auth & public.profiles
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email.trim(),
          password: data.password,
          role: data.role || 'EMPLOYEE',
          department: data.department || 'Engineering',
        }),
      });

      const json = await response.json();

      if (response.ok && json.success && json.data) {
        const profile = json.data as UserProfile;
        setUser(profile);
        localStorage.setItem('ag_active_user', JSON.stringify(profile));
        setLoading(false);
        return { role: profile.role };
      } else if (json.error) {
        setLoading(false);
        return { error: typeof json.error === 'string' ? json.error : json.error.message || 'Registration failed' };
      }
    } catch (err: any) {
      console.warn('API signup failed:', err);
    }

    // 2. Direct Supabase insert fallback
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert([
          {
            name: data.name,
            email: data.email.trim(),
            role: data.role || 'EMPLOYEE',
            status: 'ACTIVE',
            department: data.department || 'Engineering',
          },
        ])
        .select()
        .single();

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      setUser(profile);
      localStorage.setItem('ag_active_user', JSON.stringify(profile));
      setLoading(false);
      return { role: profile.role };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setUser(null);
    localStorage.removeItem('ag_active_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout }}>
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
