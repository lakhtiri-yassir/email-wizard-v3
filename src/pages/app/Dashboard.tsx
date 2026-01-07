/**
 * ============================================================================
 * Dashboard Component - FINAL WITH TIME-BASED CHARTS
 * ============================================================================
 * 
 * FIX 7: Complete analytics dashboard with:
 * - Time-based charts (not campaign-based)
 * - Date range selector (Today, Yesterday, Last Week, Last Month, Custom)
 * - Open count and Click count over time
 * - Quick Start Guide for new users
 * - Setup progress tracking
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
  MousePointerClick,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { AppLayout } from '../components/app/AppLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  totalOpens: number;
  totalClicks: number;
  recentCampaigns: any[];
}

interface SetupProgress {
  hasVerifiedDomain: boolean;
  hasContacts: boolean;
  hasTemplate: boolean;
  hasSentCampaign: boolean;
}

interface TimeSeriesDataPoint {
  date: string;
  opens: number;
  clicks: number;
}

type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    totalContacts: 0,
    emailsSent: 0,
    totalOpens: 0,
    totalClicks: 0,
    recentCampaigns: [],
  });
  const [setupProgress, setSetupProgress] = useState<SetupProgress>({
    hasVerifiedDomain: false,
    hasContacts: false,
    hasTemplate: false,
    hasSentCampaign: false,
  });
  
  // ✅ NEW: Time series data and date range
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('last7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Quick Start Guide state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkSetupProgress();
    checkQuickStartStatus();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTimeSeriesData();
    }
  }, [user, selectedDateRange, customStartDate, customEndDate]);

  async function checkQuickStartStatus() {
    const dismissed = localStorage.getItem(`quickStartDismissed_${user?.id}`);
    setQuickStartDismissed(dismissed === 'true');
    
    if (!dismissed) {
      setTimeout(() => setShowQuickStart(true), 1000);
    }
  }

  async function checkSetupProgress() {
    if (!user) return;

    try {
      const { data: domains } = await supabase
        .from('sending_domains')
        .select('verification_status')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .limit(1);

      const { data: contacts, count: contactCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: templates } = await supabase
        .from('templates')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

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

      // Calculate total opens and clicks from campaign_analytics
      let totalOpens = 0;
      let totalClicks = 0;

      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        
        // Get analytics data
        const { data: analytics } = await supabase
          .from('campaign_analytics')
          .select('event_type')
          .in('campaign_id', campaignIds);

        if (analytics) {
          totalOpens = analytics.filter(a => a.event_type === 'open').length;
          totalClicks = analytics.filter(a => a.event_type === 'click').length;
        }
      }

      const totalCampaigns = campaigns?.length || 0;
      const emailsSent = campaigns?.reduce((sum, c) => sum + (c.recipients_count || 0), 0) || 0;

      setStats({
        totalCampaigns,
        totalContacts: contactCount || 0,
        emailsSent,
        totalOpens,
        totalClicks,
        recentCampaigns: campaigns?.slice(0, 5) || [],
      });
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Load time series data based on date range
  async function loadTimeSeriesData() {
    if (!user) return;

    try {
      const { startDate, endDate } = getDateRangeBounds();

      // Fetch campaign analytics within date range
      const { data: analytics } = await supabase
        .from('campaign_analytics')
        .select('event_type, created_at, campaign_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (!analytics || analytics.length === 0) {
        setTimeSeriesData([]);
        return;
      }

      // Group by date
      const dataByDate = new Map<string, { opens: number; clicks: number }>();

      // Initialize all dates in range with zero values
      const dates = generateDateRange(startDate, endDate);
      dates.forEach(date => {
        dataByDate.set(date, { opens: 0, clicks: 0 });
      });

      // Populate with actual data
      analytics.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        const current = dataByDate.get(date) || { opens: 0, clicks: 0 };
        
        if (event.event_type === 'open') {
          current.opens++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }
        
        dataByDate.set(date, current);
      });

      // Convert to array
      const timeSeriesArray: TimeSeriesDataPoint[] = Array.from(dataByDate.entries()).map(
        ([date, data]) => ({
          date,
          opens: data.opens,
          clicks: data.clicks,
        })
      );

      setTimeSeriesData(timeSeriesArray);
    } catch (error) {
      console.error('Failed to load time series data:', error);
      setTimeSeriesData([]);
    }
  }

  // ✅ NEW: Generate date range array
  function generateDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // ✅ NEW: Get date range bounds based on selection
  function getDateRangeBounds(): { startDate: string; endDate: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let endDate: Date = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    switch (selectedDateRange) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 6);
        }
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  // ✅ NEW: Format date for display
  function formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (selectedDateRange === 'last7days' || selectedDateRange === 'last30days') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  function handleDismissQuickStart(permanent: boolean) {
    setShowQuickStart(false);
    if (permanent) {
      localStorage.setItem(`quickStartDismissed_${user?.id}`, 'true');
      setQuickStartDismissed(true);
    }
  }

  // ✅ NEW: Handle date range change
  function handleDateRangeChange(range: DateRange) {
    setSelectedDateRange(range);
    if (range !== 'custom') {
      setShowDatePicker(false);
    }
  }

  // ✅ NEW: Apply custom date range
  function applyCustomDateRange() {
    if (customStartDate && customEndDate) {
      setSelectedDateRange('custom');
      setShowDatePicker(false);
      loadTimeSeriesData();
    } else {
      toast.error('Please select both start and end dates');
    }
  }

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
            Welcome back! Here's your email campaign analytics.
          </p>
        </div>

        {/* Setup Progress Card */}
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

            <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-4">
              <div
                className="bg-white h-full transition-all duration-500 rounded-full"
                style={{ width: `${setupPercentage}%` }}
              />
            </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
            title="Total Opens"
            value={stats.totalOpens}
            iconColor="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            icon={<MousePointerClick size={24} />}
            title="Total Clicks"
            value={stats.totalClicks}
            iconColor="text-purple"
            bgColor="bg-purple/10"
          />
        </div>

        {/* ✅ NEW: Date Range Selector */}
        <div className="bg-white rounded-lg border-2 border-black shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-600" />
              <span className="font-semibold text-gray-700">Time Period:</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeButton
                active={selectedDateRange === 'today'}
                onClick={() => handleDateRangeChange('today')}
                label="Today"
              />
              <DateRangeButton
                active={selectedDateRange === 'yesterday'}
                onClick={() => handleDateRangeChange('yesterday')}
                label="Yesterday"
              />
              <DateRangeButton
                active={selectedDateRange === 'last7days'}
                onClick={() => handleDateRangeChange('last7days')}
                label="Last 7 Days"
              />
              <DateRangeButton
                active={selectedDateRange === 'last30days'}
                onClick={() => handleDateRangeChange('last30days')}
                label="Last 30 Days"
              />
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedDateRange === 'custom'
                    ? 'bg-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Range
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Custom Date Picker */}
          {showDatePicker && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-transparent"
                  />
                </div>
                <button
                  onClick={applyCustomDateRange}
                  className="px-6 py-2 bg-purple text-white rounded-lg font-medium hover:bg-purple/90 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ✅ NEW: Time-Based Charts */}
        {timeSeriesData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Opens Over Time */}
            <div className="bg-white rounded-lg border-2 border-black shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Opens Over Time
              </h3>
              <div className="h-64">
                <TimeSeriesChart
                  data={timeSeriesData}
                  dataKey="opens"
                  color="#3b82f6"
                  formatDate={formatDateForDisplay}
                />
              </div>
            </div>

            {/* Clicks Over Time */}
            <div className="bg-white rounded-lg border-2 border-black shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MousePointerClick size={20} className="text-purple" />
                Clicks Over Time
              </h3>
              <div className="h-64">
                <TimeSeriesChart
                  data={timeSeriesData}
                  dataKey="clicks"
                  color="#9333ea"
                  formatDate={formatDateForDisplay}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-black shadow-lg p-12 mb-8 text-center">
            <BarChart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2 font-medium">No analytics data available</p>
            <p className="text-sm text-gray-500">
              Send some campaigns to see your analytics here
            </p>
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

      {/* Quick Start Modal */}
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
// ✅ NEW: TIME SERIES CHART COMPONENT
// ============================================================================

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  dataKey: 'opens' | 'clicks';
  color: string;
  formatDate: (date: string) => string;
}

function TimeSeriesChart({ data, dataKey, color, formatDate }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[dataKey]), 1);
  const scale = 100 / maxValue;

  return (
    <div className="h-full flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 flex items-end justify-between gap-2 px-4">
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
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {point[dataKey]} {dataKey}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 text-center truncate w-full">
                {formatDate(point.date)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Y-Axis Label */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Total {dataKey === 'opens' ? 'Opens' : 'Clicks'}: {data.reduce((sum, d) => sum + d[dataKey], 0)}
      </div>
    </div>
  );
}

// ============================================================================
// ✅ NEW: DATE RANGE BUTTON COMPONENT
// ============================================================================

interface DateRangeButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function DateRangeButton({ active, onClick, label }: DateRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-purple text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================================
// SETUP CHECKLIST ITEM COMPONENT
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
// QUICK START GUIDE MODAL
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