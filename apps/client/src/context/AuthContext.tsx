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
  loginAsDemo?: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo Seed Users for immediate inspection/testing
const DEMO_USERS: Record<Role, UserProfile> = {
  MANAGER: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Alex Morgan',
    email: 'manager@antigravity.io',
    role: 'MANAGER',
    status: 'ACTIVE',
    department: 'Product & Engineering',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  EMPLOYEE: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Rahul Sharma',
    email: 'rahul@antigravity.io',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    department: 'Backend Engineering',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

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

    try {
      // 1. Authenticate via Express API against database
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: password || 'Password123!',
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.data?.profile) {
        const profile = json.data.profile as UserProfile;
        setUser(profile);
        localStorage.setItem('ag_active_user', JSON.stringify(profile));
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
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

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
    return { error: 'Invalid email or password. Please check your credentials or register a new account.' };
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password?: string;
    role?: Role;
    department?: string;
  }): Promise<{ error?: string; role?: Role }> => {
    setLoading(true);
    try {
      // 1. Call server API to register user in Supabase Auth & public.profiles
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email.trim(),
          password: data.password || 'Password123!',
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

  const loginAsDemo = (role: Role) => {
    const demoUser = DEMO_USERS[role];
    setUser(demoUser);
    localStorage.setItem('ag_active_user', JSON.stringify(demoUser));
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, loginAsDemo }}>
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
