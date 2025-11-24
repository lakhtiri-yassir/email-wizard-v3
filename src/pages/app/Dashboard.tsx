import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  totalEmailsSent: number;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  activeContacts: number;
  totalCampaigns: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  email: string;
  timestamp: string;
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
  recipients_count: number;
  opens: number;
  clicks: number;
  bounces: number;
  sent_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmailsSent: 0,
    totalOpens: 0,
    totalClicks: 0,
    totalBounces: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    activeContacts: 0,
    totalCampaigns: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Refresh data every 30 seconds to show new webhook events
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(5);

      if (campaignsError) throw campaignsError;

      // Fetch active contacts count
      const { count: contactCount, error: contactsError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (contactsError) throw contactsError;

      // Fetch recent email events (last 20)
      const { data: events, error: eventsError } = await supabase
        .from('email_events')
        .select('id, event_type, email, timestamp, campaign_id')
        .in('campaign_id', campaigns?.map(c => c.id) || [])
        .order('timestamp', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // Calculate aggregate stats
      const totalSent = campaigns?.reduce((sum, c) => sum + (c.recipients_count || 0), 0) || 0;
      const totalOpens = campaigns?.reduce((sum, c) => sum + (c.opens || 0), 0) || 0;
      const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
      const totalBounces = campaigns?.reduce((sum, c) => sum + (c.bounces || 0), 0) || 0;

      const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
      const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;

      setStats({
        totalEmailsSent: totalSent,
        totalOpens,
        totalClicks,
        totalBounces,
        openRate,
        clickRate,
        bounceRate,
        activeContacts: contactCount || 0,
        totalCampaigns: campaigns?.length || 0,
      });

      setRecentEvents(events || []);
      setRecentCampaigns(campaigns || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent':
      case 'delivered':
        return '📧';
      case 'open':
        return '👁️';
      case 'click':
        return '🖱️';
      case 'bounce':
        return '⚠️';
      case 'complaint':
        return '🚫';
      case 'unsubscribe':
        return '✖️';
      default:
        return '📬';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'sent':
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'click':
        return 'bg-purple-100 text-purple-800';
      case 'bounce':
        return 'bg-red-100 text-red-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      case 'unsubscribe':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Total Emails Sent</p>
          <p className="text-3xl font-bold">{stats.totalEmailsSent.toLocaleString()}</p>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Open Rate</p>
          <p className="text-3xl font-bold">{stats.openRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">{stats.totalOpens} opens</p>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Click Rate</p>
          <p className="text-3xl font-bold">{stats.clickRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">{stats.totalClicks} clicks</p>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Active Contacts</p>
          <p className="text-3xl font-bold">{stats.activeContacts.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Campaigns</h2>
          <div className="space-y-4">
            {recentCampaigns.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No campaigns sent yet</p>
            ) : (
              recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                  <h3 className="font-semibold mb-2">{campaign.name}</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Sent</p>
                      <p className="font-bold">{campaign.recipients_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Opens</p>
                      <p className="font-bold text-green-600">{campaign.opens}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Clicks</p>
                      <p className="font-bold text-purple-600">{campaign.clicks}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sent {formatTimestamp(campaign.sent_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Real-time Activity</h2>
            <button
              onClick={fetchDashboardData}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getEventColor(event.event_type)}`}>
                        {event.event_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm truncate">{event.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="mt-8 bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Open Rate</span>
              <span className="font-bold">{stats.openRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${Math.min(stats.openRate, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Click Rate</span>
              <span className="font-bold">{stats.clickRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full" 
                style={{ width: `${Math.min(stats.clickRate, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Bounce Rate</span>
              <span className="font-bold">{stats.bounceRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${Math.min(stats.bounceRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}