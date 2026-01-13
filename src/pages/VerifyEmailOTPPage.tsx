/**
 * Email Verification with OTP Code
 * 
 * Modern email verification flow using 6-digit OTP codes.
 * No link prefetching issues!
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Logo } from '../components/ui/Logo';
import OTPInput from '../components/OTPInput';

export default function VerifyEmailOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from navigation state or query params
    const stateEmail = location.state?.email;
    const queryEmail = new URLSearchParams(location.search).get('email');
    
    const userEmail = stateEmail || queryEmail;
    
    if (!userEmail) {
      toast.error('Email address not found. Please sign up again.');
      navigate('/signup');
      return;
    }
    
    setEmail(userEmail);
  }, [location, navigate]);

  const handleVerify = async (code: string) => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'signup'
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Email verified successfully! 🎉', {
          duration: 4000,
        });
        
        // Redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      if (error.message?.includes('expired')) {
        toast.error('Code has expired. Please request a new one.');
      } else if (error.message?.includes('invalid')) {
        toast.error('Invalid code. Please check and try again.');
      } else {
        toast.error(error.message || 'Verification failed. Please try again.');
      }
      
      setOtp(''); // Clear the OTP input on error
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }

    setResending(true);

    try {
      // Resend OTP
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast.success('New verification code sent! Check your email.', {
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo 
              variant="full" 
              size="lg"
              onClick={() => navigate('/')}
            />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            We've sent a 6-digit code to<br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
              Enter Verification Code
            </label>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
              disabled={loading}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify(otp)}
            disabled={loading || otp.length !== 6}
            className="w-full bg-yellow-400 text-black font-semibold py-3 px-4 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleResendCode}
              disabled={resending}
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : "Didn't receive the code? Resend"}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Check your spam folder if you don't see the email within a few minutes.
            </p>
          </div>
        </div>

        {/* Back to Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/signup')}
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            ← Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}