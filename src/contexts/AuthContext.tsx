/**
 * Authentication Context - OTP Email Verification
 * 
 * Updated to use OTP code verification instead of email links.
 * Prevents link prefetching issues with Gmail and other providers.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan_tier: string;
  subscription_status: string;
  created_at: string;
}

interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  validatePasswordStrength: (password: string) => PasswordRequirements;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  /**
   * Sign Up Function - OTP Email Verification
   * 
   * Creates account and redirects to OTP verification page.
   * User receives 6-digit code via email instead of link.
   */
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          // No emailRedirectTo needed - using OTP instead!
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required - redirect to OTP page
        toast.success('Account created! Check your email for verification code.', {
          duration: 5000,
        });
        
        // Redirect to OTP verification page with email
        navigate('/verify-email-otp', { 
          state: { email: email },
          replace: true 
        });
      } else {
        // Email confirmation disabled - auto-confirmed
        toast.success('Account created! Logging you in...');
        
        setUser(data.user);
        
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
        }
        
        navigate('/app/dashboard');
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * Sign In Function
   * 
   * Authenticates existing user and loads their profile.
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if error is due to unverified email
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('Please verify your email before signing in. Check your inbox for the verification code.');
        }
        throw error;
      }

      setUser(data.user);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      toast.success('Welcome back!');
      navigate('/app/dashboard');
      
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Sign Out Function
   * 
   * Logs out the current user and clears state.
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      toast.success('Logged out successfully');
      navigate('/login');
      
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  /**
   * Request Password Reset
   * 
   * Sends a password reset email to the user.
   */
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  /**
   * Reset Password
   * 
   * Updates the user's password with a new password.
   */
  const resetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  };

  /**
   * Validate Password Strength
   * 
   * Checks if password meets all requirements.
   */
  const validatePasswordStrength = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password),
    };
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    requestPasswordReset,
    resetPassword,
    validatePasswordStrength,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}