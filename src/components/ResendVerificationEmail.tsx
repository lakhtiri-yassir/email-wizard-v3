/**
 * Resend Verification Email Component
 * 
 * OPTIONAL: Add this to your LoginPage to help users who didn't receive
 * their verification email or need it resent.
 * 
 * Usage: Add below the login form on LoginPage.tsx
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ResendVerificationEmail() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Resend confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      toast.success('Verification email sent! Check your inbox.', {
        duration: 5000,
      });
      
      setEmail('');
      setShowForm(false);
      
    } catch (error: any) {
      console.error('Error resending verification:', error);
      
      // Handle specific errors
      if (error.message?.includes('already confirmed')) {
        toast.error('This email is already verified. Please try logging in.');
      } else if (error.message?.includes('not found')) {
        toast.error('No account found with this email address.');
      } else {
        toast.error('Failed to send verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
        >
          Didn't receive verification email?
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Resend Verification Email
        </h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p className="text-xs text-gray-600 mb-3">
        Enter your email address and we'll send you a new verification link.
      </p>
      
      <form onSubmit={handleResend} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-semibold py-2 px-4 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            'Send Verification Email'
          )}
        </button>
      </form>
      
      <p className="mt-3 text-xs text-gray-500">
        Check your spam folder if you don't see it within a few minutes.
      </p>
    </div>
  );
}