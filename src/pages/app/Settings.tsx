import { User, Globe, CreditCard, Key, Bell, Shield } from 'lucide-react';
import { useState } from 'react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'domains', label: 'Sending Domains', icon: Globe },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export const Settings = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const { createCheckoutSession, loading: checkoutLoading } = useStripeCheckout();

  const handleUpgrade = (plan: 'pro' | 'pro_plus') => {
    createCheckoutSession(plan);
  };

  return (
    <AppLayout currentPath="/app/settings">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences.</p>
        </div>

        <div className="flex gap-8">
          <div className="w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-250 ${
                      activeTab === tab.id
                        ? 'bg-gold text-black font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="card max-w-2xl">
                <h2 className="text-xl font-serif font-bold mb-6">Profile Information</h2>
                <form className="space-y-4">
                  <Input
                    type="text"
                    label="Full Name"
                    defaultValue={profile?.full_name || ''}
                    placeholder="Your full name"
                  />
                  <Input
                    type="email"
                    label="Email"
                    defaultValue={profile?.email || ''}
                    disabled
                  />
                  <Input
                    type="text"
                    label="Company Name"
                    defaultValue={profile?.company_name || ''}
                    placeholder="Your company"
                  />
                  <div className="pt-4">
                    <Button variant="primary" size="md">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="card max-w-2xl">
                <h2 className="text-xl font-serif font-bold mb-6">Billing & Subscription</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                      <p className="text-2xl font-serif font-bold">
                        {profile?.plan_type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    {profile?.plan_type === 'free' && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpgrade('pro')}
                          loading={checkoutLoading}
                        >
                          Upgrade to Pro
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpgrade('pro_plus')}
                          loading={checkoutLoading}
                        >
                          Upgrade to Pro Plus
                        </Button>
                      </div>
                    )}
                    {profile?.plan_type === 'pro' && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleUpgrade('pro_plus')}
                        loading={checkoutLoading}
                      >
                        Upgrade to Pro Plus
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {profile?.plan_type === 'free' && 'Free forever • 500 emails/month'}
                    {profile?.plan_type === 'pro' && '$29/month • 25,000 emails/month'}
                    {profile?.plan_type === 'pro_plus' && '$99/month • Unlimited emails'}
                  </p>
                </div>

                <h3 className="font-semibold mb-4">Billing History</h3>
                <p className="text-gray-600 text-sm">No invoices yet.</p>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="card max-w-2xl">
                <h2 className="text-xl font-serif font-bold mb-6">API Keys</h2>
                <p className="text-gray-600 mb-6">
                  Use API keys to integrate Email Wizard with your applications.
                </p>
                {profile?.plan_type === 'pro_plus' ? (
                  <>
                    <Button variant="primary" size="md" icon={Key}>
                      Generate API Key
                    </Button>
                    <div className="mt-6">
                      <p className="text-sm text-gray-600">No API keys yet.</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-purple/10 border border-purple rounded-lg p-6 text-center">
                    <p className="font-semibold mb-2">API Access on Pro Plus</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Upgrade to Pro Plus to access our powerful API
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpgrade('pro_plus')}
                      loading={checkoutLoading}
                    >
                      Upgrade Now
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'domains' && (
              <div className="card max-w-2xl">
                <h2 className="text-xl font-serif font-bold mb-6">Sending Domains</h2>
                <p className="text-gray-600 mb-6">
                  Configure custom domains to send emails from your own domain.
                </p>
                {profile?.plan_type !== 'free' ? (
                  <>
                    <Button variant="primary" size="md" icon={Globe}>
                      Add Domain
                    </Button>
                    <div className="mt-6">
                      <p className="text-sm text-gray-600">No custom domains configured yet.</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-gold/10 border border-gold rounded-lg p-6 text-center">
                    <p className="font-semibold mb-2">Custom Domains on Pro and Pro Plus</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Upgrade to use your own sending domain
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpgrade('pro')}
                      loading={checkoutLoading}
                    >
                      Upgrade Now
                    </Button>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'notifications' || activeTab === 'security') && (
              <div className="card max-w-2xl">
                <h2 className="text-xl font-serif font-bold mb-6">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p className="text-gray-600">Settings for this section coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
