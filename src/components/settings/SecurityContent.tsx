/**
 * Security Content Component
 *
 * Features:
 * 1. Change Password Form
 * 2. Two-Factor Authentication (2FA) Setup/Disable
 * 3. Active Sessions Management
 * 4. Account Activity Log
 */

import { useState, useEffect } from 'react';
import {
  Lock,
  Shield,
  Smartphone,
  Monitor,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  created_at: string;
}

export default function SecurityContent() {
  const [activeSection, setActiveSection] = useState<'password' | '2fa' | 'sessions' | 'activity'>('password');

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="card">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSection('password')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeSection === 'password'
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Lock className="inline w-4 h-4 mr-2" />
            Password
          </button>
          <button
            onClick={() => setActiveSection('2fa')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeSection === '2fa'
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Smartphone className="inline w-4 h-4 mr-2" />
            Two-Factor Auth
          </button>
          <button
            onClick={() => setActiveSection('sessions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeSection === 'sessions'
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Monitor className="inline w-4 h-4 mr-2" />
            Active Sessions
          </button>
          <button
            onClick={() => setActiveSection('activity')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeSection === 'activity'
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="inline w-4 h-4 mr-2" />
            Activity Log
          </button>
        </div>
      </div>

      {/* Section Content */}
      {activeSection === 'password' && <ChangePasswordSection />}
      {activeSection === '2fa' && <TwoFactorAuthSection />}
      {activeSection === 'sessions' && <ActiveSessionsSection />}
      {activeSection === 'activity' && <ActivityLogSection />}
    </div>
  );
}

/**
 * Change Password Section
 */
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Log security event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_security_events').insert({
          user_id: user.id,
          event_type: 'password_change',
          ip_address: null,
          user_agent: navigator.userAgent
        });
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-purple" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold">Change Password</h2>
          <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <Input
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          placeholder="Enter your current password"
        />

        <Input
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="Minimum 8 characters, 1 uppercase, 1 number"
        />

        <Input
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Re-enter your new password"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Password Requirements:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li className="flex items-center gap-2">
              {newPassword.length >= 8 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              At least 8 characters
            </li>
            <li className="flex items-center gap-2">
              {/[A-Z]/.test(newPassword) ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              At least one uppercase letter
            </li>
            <li className="flex items-center gap-2">
              {/[0-9]/.test(newPassword) ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              At least one number
            </li>
          </ul>
        </div>

        <Button type="submit" variant="primary" size="md" loading={loading}>
          Change Password
        </Button>
      </form>
    </div>
  );
}

/**
 * Two-Factor Authentication Section
 */
function TwoFactorAuthSection() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setEnabled(!!data);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-purple animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {enabled ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {enabled
                    ? 'Your account is protected with two-factor authentication. You will need to enter a code from your authenticator app when signing in.'
                    : 'Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.'}
                </p>
                {enabled ? (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg inline-flex">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg inline-flex">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Not Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Coming Soon</p>
            <p className="text-sm text-blue-700">
              Two-factor authentication setup is currently under development. This feature will allow you to:
            </p>
            <ul className="text-sm text-blue-700 space-y-1 mt-2 ml-4">
              <li>Scan a QR code with your authenticator app</li>
              <li>Generate backup codes for emergency access</li>
              <li>Verify your setup before enabling</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Active Sessions Section
 */
function ActiveSessionsSection() {
  return (
    <div className="card max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-purple" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold">Active Sessions</h2>
          <p className="text-sm text-gray-600">Manage devices and browsers where you are signed in</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Current Session */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">Current Session</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Active Now
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last active: Just now</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Session Management Coming Soon</p>
          <p className="text-sm text-blue-700">
            Advanced session management features are under development, including:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 mt-2 ml-4">
            <li>View all active sessions across devices</li>
            <li>See IP addresses and locations</li>
            <li>Revoke individual sessions remotely</li>
            <li>Sign out from all other sessions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Activity Log Section
 */
function ActivityLogSection() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadSecurityEvents();
  }, [page]);

  const loadSecurityEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await supabase
        .from('user_security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading security events:', error);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'password_change':
        return <Lock className="w-5 h-5 text-blue-600" />;
      case '2fa_enabled':
      case '2fa_disabled':
        return <Shield className="w-5 h-5 text-purple" />;
      case 'login':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed_login':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      password_change: 'Password Changed',
      '2fa_enabled': 'Two-Factor Auth Enabled',
      '2fa_disabled': 'Two-Factor Auth Disabled',
      login: 'Successful Login',
      failed_login: 'Failed Login Attempt',
      session_revoked: 'Session Revoked'
    };
    return labels[eventType] || eventType;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold">Account Activity</h2>
            <p className="text-sm text-gray-600">Recent security events on your account</p>
          </div>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          icon={RefreshCw}
          onClick={loadSecurityEvents}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-purple animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No security events yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{getEventLabel(event.event_type)}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  </div>
                  {event.ip_address && (
                    <p className="text-xs text-gray-500 mt-2">
                      IP: {event.ip_address}
                      {event.location && ` • ${event.location}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
