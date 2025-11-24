import { useState, useEffect } from "react";
import { TrendingUp, Mail, Users, MousePointer, MailOpen } from "lucide-react";
import { AppLayout } from "../../components/app/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";

export function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({
    totalSent: "0",
    openRate: "0%",
    clickRate: "0%",
    activeContacts: "0",
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "sent")
        .order("sent_at", { ascending: false });

      const totalSent =
        campaigns?.reduce((sum, c) => sum + (c.recipients_count || 0), 0) || 0;
      const totalOpens =
        campaigns?.reduce((sum, c) => sum + (c.opens || 0), 0) || 0;
      const totalClicks =
        campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;

      const openRate =
        totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0.0";
      const clickRate =
        totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : "0.0";

      const { data: contacts } = await supabase
        .from("contacts")
        .select("id", { count: "exact" })
        .eq("user_id", user?.id)
        .eq("status", "active");

      setStats({
        totalSent: totalSent.toLocaleString(),
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        activeContacts: (contacts?.length || 0).toLocaleString(),
      });

      setRecentCampaigns(
        campaigns?.slice(0, 5).map((c) => ({
          name: c.name,
          sent: (c.recipients_count || 0).toLocaleString(),
          opens: (c.opens || 0).toLocaleString(),
          clicks: (c.clicks || 0).toLocaleString(),
          date: new Date(c.sent_at).toLocaleDateString(),
        })) || []
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    {
      name: "Total Sent",
      value: stats.totalSent,
      change: "+12.5%",
      trend: "up",
      icon: Mail,
      color: "text-gold",
    },
    {
      name: "Open Rate",
      value: stats.openRate,
      change: "+2.1%",
      trend: "up",
      icon: MailOpen,
      color: "text-purple",
    },
    {
      name: "Click Rate",
      value: stats.clickRate,
      change: "+4.2%",
      trend: "up",
      icon: MousePointer,
      color: "text-gold",
    },
    {
      name: "Active Contacts",
      value: stats.activeContacts,
      change: "+156",
      trend: "up",
      icon: Users,
      color: "text-purple",
    },
  ];

  return (
    <AppLayout currentPath="/app">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">
            Welcome back, {profile?.full_name || "there"}
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your email campaigns today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsDisplay.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 bg-gray-50 rounded-lg ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      stat.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-serif font-bold">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold">
                Performance Overview
              </h2>
              <select className="input-base w-auto">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center border border-black rounded-lg bg-gradient-to-br from-purple/5 to-gold/5">
              <div className="text-center">
                <TrendingUp size={48} className="text-gold mx-auto mb-4" />
                <p className="text-gray-600">Chart visualization placeholder</p>
                <p className="text-sm text-gray-500 mt-2">
                  Opens and clicks over time
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-serif font-bold mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <a href="/app/campaigns" className="block">
                <Button variant="primary" size="md" fullWidth>
                  Create Campaign
                </Button>
              </a>
              <a href="/app/contacts" className="block">
                <Button variant="secondary" size="md" fullWidth>
                  Import Contacts
                </Button>
              </a>
              <a href="/app/templates" className="block">
                <Button variant="secondary" size="md" fullWidth>
                  Browse Templates
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-serif font-bold mb-6">
            Recent Campaigns
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold">
                    Campaign
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">
                    Sent
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">
                    Opens
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">
                    Clicks
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">{campaign.name}</td>
                    <td className="py-4 px-4 text-right">{campaign.sent}</td>
                    <td className="py-4 px-4 text-right text-purple font-semibold">
                      {campaign.opens}
                    </td>
                    <td className="py-4 px-4 text-right text-gold font-semibold">
                      {campaign.clicks}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600 text-sm">
                      {campaign.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}