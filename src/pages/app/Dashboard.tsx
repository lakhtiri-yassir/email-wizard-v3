/**
 * ============================================================================
 * Dashboard Component - ELEGANT & MODERN VERSION
 * ============================================================================
 * 
 * Beautiful, professional dashboard with:
 * - Quick action buttons for common tasks
 * - Elegant card designs with gradients
 * - Modern stats display
 * - Time-based analytics charts
 * - Responsive design
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Users,
  TrendingUp,
  MousePointerClick,
  Calendar,
  ChevronDown,
  Plus,
  Send,
  FileText,
  Upload,
  BarChart3,
  Zap,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { AppLayout } from '../../components/app/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  totalOpens: number;
  totalClicks: number;
  recentCampaigns: any[];
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
  
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('last30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTimeSeriesData();
    }
  }, [user, selectedDateRange, customStartDate, customEndDate]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      setLoading(true);

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      let totalOpens = 0;
      let totalClicks = 0;

      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        
        const { data: analytics } = await supabase
          .from('email_events')
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

  async function loadTimeSeriesData() {
    if (!user) return;

    try {
      const { startDate, endDate } = getDateRangeBounds();

      const { data: userCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', user.id);

      if (!userCampaigns || userCampaigns.length === 0) {
        setTimeSeriesData([]);
        return;
      }

      const campaignIds = userCampaigns.map(c => c.id);

      const { data: analytics } = await supabase
        .from('email_events')
        .select('event_type, timestamp, campaign_id')
        .in('campaign_id', campaignIds)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (!analytics || analytics.length === 0) {
        setTimeSeriesData([]);
        return;
      }

      const dataByDate = new Map<string, { opens: number; clicks: number }>();
      const dates = generateDateRange(startDate, endDate);
      dates.forEach(date => {
        dataByDate.set(date, { opens: 0, clicks: 0 });
      });

      analytics.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        const current = dataByDate.get(date) || { opens: 0, clicks: 0 };
        
        if (event.event_type === 'open') {
          current.opens++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }
        
        dataByDate.set(date, current);
      });

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

  function formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    if (selectedDateRange === 'last7days' || selectedDateRange === 'last30days') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function handleDateRangeChange(range: DateRange) {
    setSelectedDateRange(range);
    if (range !== 'custom') {
      setShowDatePicker(false);
    }
  }

  function applyCustomDateRange() {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setSelectedDateRange('custom');
    setShowDatePicker(false);
  }

  // Calculate rates
  const openRate = stats.emailsSent > 0 ? ((stats.totalOpens / stats.emailsSent) * 100).toFixed(1) : '0';
  const clickRate = stats.emailsSent > 0 ? ((stats.totalClicks / stats.emailsSent) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-gold" size={32} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple to-gold bg-clip-text text-transparent">
              Welcome Back!
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Here's what's happening with your campaigns today</p>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/app/campaigns/new')}
            className="group relative bg-gradient-to-br from-purple to-purple/80 text-white rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-bold">New Campaign</span>
            </div>
            <div className="absolute top-2 right-2">
              <Zap size={16} className="text-gold animate-pulse" />
            </div>
          </button>

          <button
            onClick={() => navigate('/app/contacts')}
            className="group bg-gradient-to-br from-gold to-gold/80 text-white rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Users size={24} />
              </div>
              <span className="font-bold">Manage Contacts</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/app/templates')}
            className="group bg-white text-purple rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-purple hover:text-white"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-purple/10 rounded-lg group-hover:bg-white/20 transition-colors">
                <FileText size={24} />
              </div>
              <span className="font-bold">Templates</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/app/analytics')}
            className="group bg-white text-gold rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gold hover:text-white"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gold/10 rounded-lg group-hover:bg-white/20 transition-colors">
                <BarChart3 size={24} />
              </div>
              <span className="font-bold">Analytics</span>
            </div>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Campaigns */}
          <div className="relative bg-white rounded-xl border-2 border-black shadow-lg p-6 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple/10 rounded-lg">
                  <Mail className="text-purple" size={24} />
                </div>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalCampaigns}</div>
              <div className="text-sm text-gray-600 font-medium">Total Campaigns</div>
            </div>
          </div>

          {/* Total Contacts */}
          <div className="relative bg-white rounded-xl border-2 border-black shadow-lg p-6 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <Users className="text-gold" size={24} />
                </div>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalContacts}</div>
              <div className="text-sm text-gray-600 font-medium">Total Contacts</div>
            </div>
          </div>

          {/* Emails Sent */}
          <div className="relative bg-white rounded-xl border-2 border-black shadow-lg p-6 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Send className="text-green-600" size={24} />
                </div>
                <Clock className="text-blue-500" size={20} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.emailsSent}</div>
              <div className="text-sm text-gray-600 font-medium">Emails Sent</div>
            </div>
          </div>

          {/* Total Opens */}
          <div className="relative bg-gradient-to-br from-purple to-purple/80 rounded-xl border-2 border-black shadow-lg p-6 text-white overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Mail className="text-white" size={24} />
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                  {openRate}%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalOpens}</div>
              <div className="text-sm text-white/80 font-medium">Total Opens</div>
            </div>
          </div>

          {/* Total Clicks */}
          <div className="relative bg-gradient-to-br from-gold to-gold/80 rounded-xl border-2 border-black shadow-lg p-6 text-white overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <MousePointerClick className="text-white" size={24} />
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                  {clickRate}%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalClicks}</div>
              <div className="text-sm text-white/80 font-medium">Total Clicks</div>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-xl border-2 border-black shadow-lg p-6 mb-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple/10 rounded-lg">
                <Calendar className="text-purple" size={20} />
              </div>
              <span className="font-bold text-lg">Time Period</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last7days', label: 'Last 7 Days' },
                { value: 'last30days', label: 'Last 30 Days' },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value as DateRange)}
                  className={`px-5 py-2.5 rounded-lg border-2 border-black font-medium transition-all duration-300 ${
                    selectedDateRange === range.value
                      ? 'bg-purple text-white shadow-lg scale-105'
                      : 'bg-white hover:bg-gray-50 hover:scale-105'
                  }`}
                >
                  {range.label}
                </button>
              ))}
              
              <button
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  if (!showDatePicker) {
                    setSelectedDateRange('custom');
                  }
                }}
                className={`px-5 py-2.5 rounded-lg border-2 border-black font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedDateRange === 'custom'
                    ? 'bg-purple text-white shadow-lg scale-105'
                    : 'bg-white hover:bg-gray-50 hover:scale-105'
                }`}
              >
                Custom Range
                <ChevronDown
                  size={16}
                  className={`transform transition-transform ${showDatePicker ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showDatePicker && (
              <div className="flex flex-wrap items-end gap-4 p-5 bg-gradient-to-br from-purple/5 to-gold/5 rounded-xl border-2 border-gray-200">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:ring-2 focus:ring-purple focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:ring-2 focus:ring-purple focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={applyCustomDateRange}
                  className="px-6 py-2.5 bg-purple text-white font-bold rounded-lg border-2 border-black hover:bg-opacity-90 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Opens Over Time */}
          <div className="bg-white rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple/10 rounded-lg">
                <TrendingUp size={20} className="text-purple" />
              </div>
              <h3 className="text-xl font-bold">Opens Over Time</h3>
            </div>
            <div className="h-64">
              <TimeSeriesChart
                data={timeSeriesData}
                dataKey="opens"
                color="#57377d"
                formatDate={formatDateForDisplay}
              />
            </div>
          </div>

          {/* Clicks Over Time */}
          <div className="bg-white rounded-xl border-2 border-black shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gold/10 rounded-lg">
                <MousePointerClick size={20} className="text-gold" />
              </div>
              <h3 className="text-xl font-bold">Clicks Over Time</h3>
            </div>
            <div className="h-64">
              <TimeSeriesChart
                data={timeSeriesData}
                dataKey="clicks"
                color="#f3ba42"
                formatDate={formatDateForDisplay}
              />
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white rounded-xl border-2 border-black shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple/10 rounded-lg">
                <Mail size={20} className="text-purple" />
              </div>
              <h2 className="text-xl font-bold">Recent Campaigns</h2>
            </div>
            <button
              onClick={() => navigate('/app/campaigns')}
              className="flex items-center gap-2 px-4 py-2 text-purple hover:text-purple/80 font-medium transition-colors group"
            >
              View All
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {stats.recentCampaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-gradient-to-br from-purple/10 to-gold/10 rounded-full mb-4">
                <Mail size={48} className="text-purple" />
              </div>
              <h3 className="text-xl font-bold mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6">Create your first campaign to start sending emails</p>
              <button
                onClick={() => navigate('/app/campaigns/new')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple to-gold text-white font-bold rounded-lg border-2 border-black hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <Plus size={20} />
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-4 font-bold">Campaign Name</th>
                    <th className="text-left py-4 px-4 font-bold">Status</th>
                    <th className="text-left py-4 px-4 font-bold">Recipients</th>
                    <th className="text-left py-4 px-4 font-bold">Sent Date</th>
                    <th className="text-right py-4 px-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-purple/5 hover:to-transparent transition-all duration-200"
                    >
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500 mt-1">{campaign.subject || 'No subject'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 ${
                            campaign.status === 'sent'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : campaign.status === 'draft'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : campaign.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium">{campaign.recipients_count || 0}</td>
                      <td className="py-4 px-4 text-gray-600">
                        {campaign.sent_at
                          ? new Date(campaign.sent_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-purple text-white font-medium rounded-lg border-2 border-black hover:bg-opacity-90 transition-all duration-200 hover:scale-105"
                        >
                          View
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================================
// TIME SERIES CHART COMPONENT
// ============================================================================

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  dataKey: 'opens' | 'clicks';
  color: string;
  formatDate: (date: string) => string;
}

const CustomTooltip = ({ active, payload, dataKey }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white border-2 border-black rounded-lg p-4 shadow-xl">
      <p className="font-bold text-sm mb-2">{formattedDate}</p>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: dataKey === 'opens' ? '#57377d' : '#f3ba42' }}
        />
        <span className="text-sm font-medium">
          {dataKey === 'opens' ? 'Opens' : 'Clicks'}: {' '}
          <span className="font-bold">{data[dataKey].toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
};

function TimeSeriesChart({ data, dataKey, color, formatDate }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-3">
            <BarChart3 size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">No analytics data available</p>
          <p className="text-sm text-gray-400">Send campaigns to see your analytics here</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(point => ({
    date: point.date,
    displayDate: formatDate(point.date),
    [dataKey]: point[dataKey]
  }));

  const total = data.reduce((sum, d) => sum + d[dataKey], 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="displayDate"
              stroke="#000000"
              style={{
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500
              }}
              tick={{ fill: '#000000' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#000000"
              style={{
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500
              }}
              tick={{ fill: '#000000' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip dataKey={dataKey} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-center">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-medium text-gray-600">Total:</span>
          <span className="font-bold text-lg" style={{ color }}>{total.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}