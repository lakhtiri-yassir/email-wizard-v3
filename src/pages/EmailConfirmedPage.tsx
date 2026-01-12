/**
 * Email Confirmed Page
 * Handles the redirect after email verification
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function EmailConfirmedPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Get the hash from URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type === 'signup' && accessToken && refreshToken) {
        try {
          // Set the session with the token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            toast.error('Error confirming email. Please try again.');
            navigate('/login');
            return;
          }

          // Email confirmed successfully
          toast.success('Email verified successfully! You can now sign in.', {
            duration: 4000,
          });
          
          // Sign out so user can sign in properly
          await supabase.auth.signOut();
          
          // Redirect to login after short delay
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        } catch (error) {
          console.error('Unexpected error:', error);
          toast.error('Something went wrong. Please try signing in.');
          navigate('/login');
        }
      } else {
        // No valid confirmation or missing parameters
        console.log('Invalid confirmation parameters:', { type, hasToken: !!accessToken });
        navigate('/login');
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
          <p className="text-gray-600">
            Please wait while we confirm your email address.
          </p>
        </div>
      </div>
    </div>
  );
}