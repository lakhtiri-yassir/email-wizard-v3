/**
 * ============================================================================
 * Dashboard Component - FIXED WITH GRAPHS
 * ============================================================================
 * 
 * FIX 7: Improved UX with Quick Start Guide + Original Graphs
 * 
 * This version combines:
 * - Quick Start Guide for new users
 * - Setup progress tracking
 * - Original open rate and click rate graphs
 * - Recent campaigns table
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Mail,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  X,
  ChevronRight,
  Rocket,
  Globe,
  BookOpen,
  Zap,
  MousePointerClick
} from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  averageOpenRate: number;
  averageClickRate: number;
  recentCampaigns: any[];
}

interface SetupProgress {
  hasVerifiedDomain: boolean;
  hasContacts: boolean;
  hasTemplate: boolean;
  hasSentCampaign: boolean;
}

interface ChartDataPoint {
  name: string;
  openRate: number;
  clickRate: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    totalContacts: 0,
    emailsSent: 0,
    averageOpenRate: 0,
    averageClickRate: 0,
    recentCampaigns: [],
  });
  const [setupProgress, setSetupProgress] = useState<SetupProgress>({
    hasVerifiedDomain: false,
    hasContacts: false,
    hasTemplate: false,
    hasSentCampaign: false,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // ✅ FIX 7: Quick Start Guide state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkSetupProgress();
    checkQuickStartStatus();
  }, [user]);

  // ✅ FIX 7: Check if user has seen Quick Start
  async function checkQuickStartStatus() {
    const dismissed = localStorage.getItem(`quickStartDismissed_${user?.id}`);
    setQuickStartDismissed(dismissed === 'true');
    
    // Show Quick Start for new users automatically
    if (!dismissed) {
      setTimeout(() => setShowQuickStart(true), 1000);
    }
  }

  // ✅ FIX 7: Check user's setup progress
  async function checkSetupProgress() {
    if (!user) return;

    try {
      // Check for verified domain
      const { data: domains } = await supabase
        .from('sending_domains')
        .select('verification_status')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .limit(1);

      // Check for contacts
      const { data: contacts, count: contactCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check for templates
      const { data: templates } = await supabase
        .from('templates')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Check for sent campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['sent', 'scheduled'])
        .limit(1);

      setSetupProgress({
        hasVerifiedDomain: (domains?.length || 0) > 0,
        hasContacts: (contactCount || 0) > 0,
        hasTemplate: (templates?.length || 0) > 0,
        hasSentCampaign: (campaigns?.length || 0) > 0,
      });
    } catch (error) {
      console.error('Error checking setup progress:', error);
    }
  }

  async function loadDashboardData() {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch contacts
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate stats
      const totalCampaigns = campaigns?.length || 0;
      const emailsSent = campaigns?.reduce((sum, c) => sum + (c.recipients_count || 0), 0) || 0;
      const avgOpenRate = campaigns && campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length
        : 0;
      const avgClickRate = campaigns && campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + (c.click_rate || 0), 0) / campaigns.length
        : 0;

      // Prepare chart data (last 7 campaigns)
      const chartCampaigns = campaigns?.slice(0, 7).reverse() || [];
      const chartDataPoints: ChartDataPoint[] = chartCampaigns.map(campaign => ({
        name: campaign.name.length > 15 ? campaign.name.substring(0, 15) + '...' : campaign.name,
        openRate: campaign.open_rate || 0,
        clickRate: campaign.click_rate || 0,
      }));

      setStats({
        totalCampaigns,
        totalContacts: contactCount || 0,
        emailsSent,
        averageOpenRate: avgOpenRate,
        averageClickRate: avgClickRate,
        recentCampaigns: campaigns?.slice(0, 5) || [],
      });
      setChartData(chartDataPoints);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  // ✅ FIX 7: Handle Quick Start dismissal
  function handleDismissQuickStart(permanent: boolean) {
    setShowQuickStart(false);
    if (permanent) {
      localStorage.setItem(`quickStartDismissed_${user?.id}`, 'true');
      setQuickStartDismissed(true);
    }
  }

  // Calculate setup completion percentage
  const setupSteps = Object.values(setupProgress);
  const completedSteps = setupSteps.filter(Boolean).length;
  const setupPercentage = (completedSteps / setupSteps.length) * 100;
  const isSetupComplete = setupPercentage === 100;

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's your email campaign overview.
          </p>
        </div>

        {/* ✅ FIX 7: Setup Progress Card (for users who haven't completed setup) */}
        {!isSetupComplete && (
          <div className="bg-gradient-to-r from-purple to-gold/80 rounded-lg p-6 mb-8 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Rocket size={24} />
                  Get Started with Email Wizard
                </h2>
                <p className="text-white/90 text-sm">
                  Complete these steps to start sending professional email campaigns
                </p>
              </div>
              <button
                onClick={() => setShowQuickStart(true)}
                className="px-4 py-2 bg-white text-purple rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <PlayCircle size={16} />
                View Guide
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-4">
              <div
                className="bg-white h-full transition-all duration-500 rounded-full"
                style={{ width: `${setupPercentage}%` }}
              />
            </div>

            {/* Setup Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SetupChecklistItem
                completed={setupProgress.hasVerifiedDomain}
                title="Verify your domain"
                onClick={() => navigate('/app/settings?tab=domains')}
              />
              <SetupChecklistItem
                completed={setupProgress.hasContacts}
                title="Add contacts"
                onClick={() => navigate('/app/contacts')}
              />
              <SetupChecklistItem
                completed={setupProgress.hasTemplate}
                title="Create a template"
                onClick={() => navigate('/app/templates')}
              />
              <SetupChecklistItem
                completed={setupProgress.hasSentCampaign}
                title="Send your first campaign"
                onClick={() => navigate('/app/campaigns')}
              />
            </div>

            <div className="text-sm text-white/80 mt-4">
              {completedSteps} of {setupSteps.length} steps completed ({Math.round(setupPercentage)}%)
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Mail size={24} />}
            title="Total Campaigns"
            value={stats.totalCampaigns}
            iconColor="text-purple"
            bgColor="bg-purple/10"
          />
          <StatCard
            icon={<Users size={24} />}
            title="Total Contacts"
            value={stats.totalContacts}
            iconColor="text-gold"
            bgColor="bg-gold/10"
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            title="Emails Sent"
            value={stats.emailsSent}
            iconColor="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            icon={<BarChart size={24} />}
            title="Avg. Open Rate"
            value={`${Math.round(stats.averageOpenRate)}%`}
            iconColor="text-blue-600"
            bgColor="bg-blue-100"
          />
        </div>

        {/* ✅ ORIGINAL: Charts Section */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Open Rate Chart */}
            <div className="bg-white rounded-lg border-2 border-black shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Open Rate Trends
              </h3>
              <div className="h-64">
                <SimpleBarChart data={chartData} dataKey="openRate" color="#3b82f6" />
              </div>
            </div>

            {/* Click Rate Chart */}
            <div className="bg-white rounded-lg border-2 border-black shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MousePointerClick size={20} className="text-purple" />
                Click Rate Trends
              </h3>
              <div className="h-64">
                <SimpleBarChart data={chartData} dataKey="clickRate" color="#9333ea" />
              </div>
            </div>
          </div>
        )}

        {/* Recent Campaigns */}
        <div className="bg-white rounded-lg border-2 border-black shadow-lg overflow-hidden">
          <div className="p-6 bg-gold border-b-2 border-black">
            <h2 className="text-xl font-serif font-bold">Recent Campaigns</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading campaigns...
            </div>
          ) : stats.recentCampaigns.length === 0 ? (
            <div className="p-8 text-center">
              <Mail size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <Button
                onClick={() => navigate('/app/campaigns')}
                variant="primary"
                icon={PlayCircle}
              >
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Open Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Click Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {campaign.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.recipients_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.open_rate ? `${Math.round(campaign.open_rate)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.click_rate ? `${Math.round(campaign.click_rate)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.sent_at
                          ? new Date(campaign.sent_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ FIX 7: Quick Start Modal */}
      {showQuickStart && !quickStartDismissed && (
        <QuickStartGuide
          onClose={() => handleDismissQuickStart(false)}
          onDismissPermanently={() => handleDismissQuickStart(true)}
          setupProgress={setupProgress}
        />
      )}
    </AppLayout>
  );
}

// ============================================================================
// ✅ ORIGINAL: SIMPLE BAR CHART COMPONENT
// ============================================================================

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  dataKey: 'openRate' | 'clickRate';
  color: string;
}

function SimpleBarChart({ data, dataKey, color }: SimpleBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[dataKey]), 10);
  const scale = 100 / maxValue;

  return (
    <div className="h-full flex items-end justify-between gap-2 px-4">
      {data.map((point, index) => {
        const height = point[dataKey] * scale;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
              <div
                className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80 relative group"
                style={{
                  height: `${height}%`,
                  backgroundColor: color,
                  minHeight: point[dataKey] > 0 ? '4px' : '0px',
                }}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {point[dataKey].toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 text-center truncate w-full">
              {point.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// ✅ FIX 7: SETUP CHECKLIST ITEM COMPONENT
// ============================================================================

interface SetupChecklistItemProps {
  completed: boolean;
  title: string;
  onClick: () => void;
}

function SetupChecklistItem({ completed, title, onClick }: SetupChecklistItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left"
    >
      <div className={`flex-shrink-0 ${completed ? 'text-green-400' : 'text-white/40'}`}>
        <CheckCircle size={20} fill={completed ? 'currentColor' : 'none'} />
      </div>
      <div className="flex-1">
        <span className="text-white font-medium">{title}</span>
      </div>
      <ChevronRight size={16} className="text-white/60" />
    </button>
  );
}

// ============================================================================
// ✅ FIX 7: QUICK START GUIDE MODAL
// ============================================================================

interface QuickStartGuideProps {
  onClose: () => void;
  onDismissPermanently: () => void;
  setupProgress: SetupProgress;
}

function QuickStartGuide({ onClose, onDismissPermanently, setupProgress }: QuickStartGuideProps) {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Globe size={32} />,
      title: '1. Verify Your Domain',
      description: 'Set up DNS records to authenticate your sending domain',
      completed: setupProgress.hasVerifiedDomain,
      action: () => {
        onClose();
        navigate('/app/settings?tab=domains');
      },
      actionText: 'Go to Domains',
    },
    {
      icon: <Users size={32} />,
      title: '2. Add Your Contacts',
      description: 'Import contacts from CSV or add them manually',
      completed: setupProgress.hasContacts,
      action: () => {
        onClose();
        navigate('/app/contacts');
      },
      actionText: 'Manage Contacts',
    },
    {
      icon: <BookOpen size={32} />,
      title: '3. Create a Template',
      description: 'Design beautiful email templates or use our pre-built ones',
      completed: setupProgress.hasTemplate,
      action: () => {
        onClose();
        navigate('/app/templates');
      },
      actionText: 'Browse Templates',
    },
    {
      icon: <Zap size={32} />,
      title: '4. Send Your First Campaign',
      description: 'Create and send your first email campaign',
      completed: setupProgress.hasSentCampaign,
      action: () => {
        onClose();
        navigate('/app/campaigns');
      },
      actionText: 'Create Campaign',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-black">
        {/* Header */}
        <div className="border-b-2 border-black p-6 bg-gradient-to-r from-purple to-gold/80">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-serif font-bold mb-1">
                🚀 Quick Start Guide
              </h2>
              <p className="text-white/90 text-sm">
                Follow these steps to get started with Email Wizard
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-6 transition-all ${
                  step.completed
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white hover:border-purple hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 p-3 rounded-lg ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-purple/10 text-purple'
                    }`}
                  >
                    {step.completed ? <CheckCircle size={32} /> : step.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                    <p className="text-gray-600 mb-4">{step.description}</p>

                    {!step.completed && (
                      <button
                        onClick={step.action}
                        className="px-4 py-2 bg-purple text-white rounded-lg font-medium hover:bg-purple/90 transition-colors inline-flex items-center gap-2"
                      >
                        {step.actionText}
                        <ChevronRight size={16} />
                      </button>
                    )}

                    {step.completed && (
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <CheckCircle size={16} />
                        Completed!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Help Resources */}
          <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle size={20} />
              Need Help?
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Check out our comprehensive guides and video tutorials:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>DNS Setup Guide:</strong> Step-by-step DNS configuration</li>
              <li>• <strong>Campaign Creation:</strong> Best practices for effective emails</li>
              <li>• <strong>Contact Management:</strong> Import and organize your audience</li>
              <li>• <strong>Video Tutorials:</strong> Watch detailed walkthroughs</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-6 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onDismissPermanently}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Don't show this again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple text-white rounded-lg font-medium hover:bg-purple/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  iconColor: string;
  bgColor: string;
}

function StatCard({ icon, title, value, iconColor, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border-2 border-black shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    sending: { label: 'Sending', className: 'bg-yellow-100 text-yellow-700' },
    sent: { label: 'Sent', className: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}