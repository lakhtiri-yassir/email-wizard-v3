/**
 * ANALYTICS PAGE COMPONENT
 * 
 * Comprehensive analytics dashboard displaying all email event data received from
 * SendGrid webhooks. Shows detailed metrics, event timeline, and performance insights.
 * 
 * FEATURES:
 * - Real-time email event tracking (sent, delivered, open, click, bounce, etc.)
 * - Event type distribution chart
 * - Event timeline with filtering
 * - Campaign-specific analytics
 * - Export functionality
 * - Time range filtering
 * 
 * DATA SOURCES:
 * - email_events table: Individual event records from SendGrid webhooks
 * - campaigns table: Campaign context and aggregated metrics
 */

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Mail,
  MailOpen,
  MousePointer,
  AlertCircle,
  Ban,
  UserX,
  TrendingUp,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { EventDistributionChart } from '../../components/analytics/EventDistributionChart';
import { EventTimelineChart } from '../../components/analytics/EventTimelineChart';
import toast from 'react-hot-toast';

/**
 * EMAIL EVENT INTERFACE
 * Represents a single email event from SendGrid webhook
 */
interface EmailEvent {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  email: string;
  event_type: string;
  event_data: any;
  url: string | null;
  occurred_at: string;
  campaign_name?: string;
}

/**
 * EVENT STATS INTERFACE
 * Aggregated statistics for different event types
 */
interface EventStats {
  sent: number;
  delivered: number;
  open: number;
  click: number;
  bounce: number;
  complaint: number;
  unsubscribe: number;
}

/**
 * ANALYTICS COMPONENT
 */
export const Analytics = () => {
  const { user } = useAuth();
  
  // STATE: Analytics data
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [eventStats, setEventStats] = useState<EventStats>({
    sent: 0,
    delivered: 0,
    open: 0,
    click: 0,
    bounce: 0,
    complaint: 0,
    unsubscribe: 0
  });
  
  // STATE: Filters
  const [timeRange, setTimeRange] = useState<number>(7);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  
  // STATE: Loading and campaigns
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  /**
   * EFFECT: Fetch analytics data on mount and filter change
   */
  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchAnalyticsData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, timeRange, selectedEventType, selectedCampaign]);

  /**
   * FETCH ANALYTICS DATA
   * 
   * Retrieves email events and calculates statistics
   */
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Fetch user's campaigns first to get IDs
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user?.id);

      if (campaignsError) throw campaignsError;

      setCampaigns(userCampaigns || []);
      
      const campaignIds = userCampaigns?.map(c => c.id) || [];

      if (campaignIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Build query
      let query = supabase
        .from('email_events')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(1000);

      // Apply event type filter
      if (selectedEventType !== 'all') {
        query = query.eq('event_type', selectedEventType);
      }

      // Apply campaign filter
      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) throw eventsError;

      // Enrich events with campaign names
      const enrichedEvents = eventsData?.map(event => ({
        ...event,
        campaign_name: userCampaigns?.find(c => c.id === event.campaign_id)?.name || 'Unknown Campaign'
      })) || [];

      setEvents(enrichedEvents);

      // Calculate event statistics
      const stats: EventStats = {
        sent: 0,
        delivered: 0,
        open: 0,
        click: 0,
        bounce: 0,
        complaint: 0,
        unsubscribe: 0
      };

      eventsData?.forEach(event => {
        const type = event.event_type.toLowerCase();
        if (type in stats) {
          stats[type as keyof EventStats]++;
        }
      });

      setEventStats(stats);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * EXPORT TO CSV
   * 
   * Exports current events data to CSV file
   */
  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvHeaders = ['Date', 'Campaign', 'Email', 'Event Type', 'URL'];
    const csvRows = events.map(event => [
      new Date(event.occurred_at).toLocaleString(),
      event.campaign_name || 'N/A',
      event.email,
      event.event_type,
      event.url || 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully');
  };

  /**
   * STATS CARDS CONFIGURATION
   */
  const statsCards = [
    {
      name: 'Total Sent',
      value: eventStats.sent.toLocaleString(),
      icon: Mail,
      color: 'text-gold',
      bgColor: 'bg-gold/10'
    },
    {
      name: 'Delivered',
      value: eventStats.delivered.toLocaleString(),
      icon: MailOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Opens',
      value: eventStats.open.toLocaleString(),
      icon: MailOpen,
      color: 'text-purple',
      bgColor: 'bg-purple/10'
    },
    {
      name: 'Clicks',
      value: eventStats.click.toLocaleString(),
      icon: MousePointer,
      color: 'text-gold',
      bgColor: 'bg-gold/10'
    },
    {
      name: 'Bounces',
      value: eventStats.bounce.toLocaleString(),
      icon: Ban,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      name: 'Complaints',
      value: eventStats.complaint.toLocaleString(),
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      name: 'Unsubscribes',
      value: eventStats.unsubscribe.toLocaleString(),
      icon: UserX,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ];

  /**
   * EVENT TYPE OPTIONS
   */
  const eventTypeOptions = [
    { value: 'all', label: 'All Events' },
    { value: 'sent', label: 'Sent' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'open', label: 'Opens' },
    { value: 'click', label: 'Clicks' },
    { value: 'bounce', label: 'Bounces' },
    { value: 'complaint', label: 'Complaints' },
    { value: 'unsubscribe', label: 'Unsubscribes' }
  ];

  return (
    <AppLayout currentPath="/app/analytics">
      <div className="p-8">
        {/* HEADER SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Email Analytics</h1>
              <p className="text-gray-600">
                Track and analyze all email events from your campaigns
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCSV}
              disabled={events.length === 0}
            >
              <Download size={20} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TIME RANGE FILTER */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <Calendar size={16} className="inline mr-2" />
                Time Range
              </label>
              <select
                className="input-base w-full"
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            {/* EVENT TYPE FILTER */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <Filter size={16} className="inline mr-2" />
                Event Type
              </label>
              <select
                className="input-base w-full"
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
              >
                {eventTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CAMPAIGN FILTER */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <Mail size={16} className="inline mr-2" />
                Campaign
              </label>
              <select
                className="input-base w-full"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                <option value="all">All Campaigns</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STATISTICS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="card">
                <div className={`p-2 ${stat.bgColor} rounded-lg mb-3 inline-block`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-2xl font-serif font-bold">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* EVENT DISTRIBUTION CHART */}
          <div className="card">
            <h2 className="text-xl font-serif font-bold mb-6">
              Event Distribution
            </h2>
            <EventDistributionChart data={eventStats} loading={loading} />
          </div>

          {/* EVENT TIMELINE CHART */}
          <div className="card">
            <h2 className="text-xl font-serif font-bold mb-6">
              Event Timeline
            </h2>
            <EventTimelineChart 
              events={events} 
              loading={loading} 
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* EVENTS TABLE */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif font-bold">
              Recent Events ({events.length.toLocaleString()})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No events found</p>
              <p className="text-sm text-gray-500">
                Send a campaign to start tracking email events
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                      Event Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                      URL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(event.occurred_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm">{event.campaign_name}</td>
                      <td className="py-3 px-4 text-sm">{event.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.event_type === 'open' ? 'bg-purple/10 text-purple' :
                          event.event_type === 'click' ? 'bg-gold/10 text-gold' :
                          event.event_type === 'bounce' ? 'bg-red-100 text-red-600' :
                          event.event_type === 'complaint' ? 'bg-orange-100 text-orange-600' :
                          event.event_type === 'unsubscribe' ? 'bg-gray-100 text-gray-600' :
                          event.event_type === 'delivered' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">
                        {event.url || '-'}
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
};