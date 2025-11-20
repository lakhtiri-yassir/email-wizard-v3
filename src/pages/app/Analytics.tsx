import { useEffect, useState, useMemo } from "react";
import { BarChart3, TrendingUp, MailOpen, MousePointer } from "lucide-react";
import { AppLayout } from "../../components/app/AppLayout";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

type Event = {
  id: string;
  event_type: string;
  contact_id: string | null;
  campaign_id: string | null;
  occurred_at: string;
  event_data?: any;
};

type CampaignSummary = {
  campaign_id: string | null;
  name: string;
  sent: number;
  delivered: number;
  unique_opens: number;
  unique_clicks: number;
};

function formatPercent(n: number) {
  if (!isFinite(n) || isNaN(n)) return "0.0%";
  return `${(n * 100).toFixed(1)}%`;
}

function buildDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [campaignMap, setCampaignMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch recent events (last 90 days) - adjust range as needed
        const since = new Date();
        since.setDate(since.getDate() - 90);

        const { data, error: eventsError } = await supabase
          .from("email_events")
          .select("*")
          .gte("occurred_at", since.toISOString())
          .order("occurred_at", { ascending: false })
          .limit(5000);

        if (eventsError) throw eventsError;

        const items = (data || []) as Event[];
        setEvents(items.map((i) => ({ ...i, occurred_at: i.occurred_at })));

        // collect campaign ids
        const campaignIds = Array.from(
          new Set(items.map((e) => e.campaign_id).filter(Boolean))
        ) as string[];
        if (campaignIds.length > 0) {
          const { data: campaigns, error: campErr } = await supabase
            .from("campaigns")
            .select("id, name")
            .in("id", campaignIds)
            .limit(100);

          if (campErr) throw campErr;

          const map: Record<string, string> = {};
          (campaigns || []).forEach((c: any) => (map[c.id] = c.name));
          setCampaignMap(map);
        }
      } catch (err: any) {
        console.error("Analytics load error", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    if (!events || events.length === 0) return null;

    const sent = events.filter((e) => e.event_type === "processed").length;
    const delivered = events.filter((e) => e.event_type === "delivered").length;

    // unique opens/clicks by contact per campaign
    const opensSet = new Set<string>();
    const clicksSet = new Set<string>();

    events.forEach((e) => {
      if (!e.contact_id) return;
      const key = `${e.contact_id}::${e.campaign_id}`;
      if (e.event_type === "open") opensSet.add(key);
      if (e.event_type === "click") clicksSet.add(key);
    });

    const uniqueOpens = opensSet.size;
    const uniqueClicks = clicksSet.size;

    const deliveryRate = sent > 0 ? delivered / sent : 0;
    const openRate = delivered > 0 ? uniqueOpens / delivered : 0;
    const clickRate = delivered > 0 ? uniqueClicks / delivered : 0;

    return {
      sent,
      delivered,
      uniqueOpens,
      uniqueClicks,
      deliveryRate,
      openRate,
      clickRate,
    };
  }, [events]);

  const last30Series = useMemo(() => {
    // build last 30 days keys
    const days = 30;
    const mapOpens: Record<string, number> = {};
    const mapClicks: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = buildDateKey(d);
      mapOpens[key] = 0;
      mapClicks[key] = 0;
    }

    events.forEach((e) => {
      const key = e.occurred_at.slice(0, 10);
      if (mapOpens[key] === undefined) return;
      if (e.event_type === "open") mapOpens[key] += 1;
      if (e.event_type === "click") mapClicks[key] += 1;
    });

    return Object.keys(mapOpens).map((k) => ({
      date: k,
      opens: mapOpens[k],
      clicks: mapClicks[k],
    }));
  }, [events]);

  const campaignSummaries = useMemo(() => {
    const byCampaign: Record<string, CampaignSummary> = {};

    events.forEach((e) => {
      const id = e.campaign_id || "unknown";
      if (!byCampaign[id]) {
        byCampaign[id] = {
          campaign_id: e.campaign_id,
          name: campaignMap[e.campaign_id || ""] || "Unknown",
          sent: 0,
          delivered: 0,
          unique_opens: 0,
          unique_clicks: 0,
        };
      }
      const s = byCampaign[id];
      if (e.event_type === "processed") s.sent += 1;
      if (e.event_type === "delivered") s.delivered += 1;
      // unique counts tracked below
    });

    // unique opens/clicks per contact
    const opened: Record<string, Set<string>> = {};
    const clicked: Record<string, Set<string>> = {};

    events.forEach((e) => {
      const id = e.campaign_id || "unknown";
      if (!e.contact_id) return;
      opened[id] = opened[id] || new Set();
      clicked[id] = clicked[id] || new Set();
      if (e.event_type === "open") opened[id].add(e.contact_id);
      if (e.event_type === "click") clicked[id].add(e.contact_id);
    });

    Object.keys(byCampaign).forEach((id) => {
      byCampaign[id].unique_opens = opened[id] ? opened[id].size : 0;
      byCampaign[id].unique_clicks = clicked[id] ? clicked[id].size : 0;
      // ensure name exists
      byCampaign[id].name =
        byCampaign[id].name ||
        campaignMap[byCampaign[id].campaign_id || ""] ||
        "Unknown";
    });

    return Object.values(byCampaign).sort((a, b) => b.sent - a.sent);
  }, [events, campaignMap]);

  const topCampaigns = useMemo(
    () => campaignSummaries.slice(0, 5),
    [campaignSummaries]
  );

  return (
    <AppLayout currentPath="/app/analytics">
      <div className="p-8">
        <h1 className="text-3xl font-serif font-bold mb-2">Analytics</h1>
        <p className="text-gray-600 mb-8">
          Track your email campaign performance
        </p>

        {loading ? (
          <div className="card p-6 text-center">Loading analytics...</div>
        ) : error ? (
          <div className="card p-6 text-center text-red-600">{error}</div>
        ) : !metrics ? (
          <div className="card p-6 text-center">
            No analytics data available yet.
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-gold">
                    <MailOpen size={20} />
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    &nbsp;
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Emails Sent</p>
                <p className="text-3xl font-serif font-bold">
                  {metrics.sent.toLocaleString()}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-purple">
                    <BarChart3 size={20} />
                  </div>
                  <div className="text-sm font-semibold text-gray-600">
                    &nbsp;
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Delivery Rate</p>
                <p className="text-3xl font-serif font-bold">
                  {formatPercent(metrics.deliveryRate)}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-gold">
                    <TrendingUp size={20} />
                  </div>
                  <div className="text-sm font-semibold text-gray-600">
                    &nbsp;
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Open Rate</p>
                <p className="text-3xl font-serif font-bold">
                  {formatPercent(metrics.openRate)}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-purple">
                    <MousePointer size={20} />
                  </div>
                  <div className="text-sm font-semibold text-gray-600">
                    &nbsp;
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Click Rate</p>
                <p className="text-3xl font-serif font-bold">
                  {formatPercent(metrics.clickRate)}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="text-lg font-serif font-bold mb-4">
                  Opens & Clicks (Last 30 days)
                </h3>
                <div className="h-64 w-full">
                  {/* Simple SVG line chart */}
                  <svg viewBox="0 0 600 200" className="w-full h-full">
                    {/* background grid */}
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#f3ba42"
                          stopOpacity="0.08"
                        />
                        <stop
                          offset="100%"
                          stopColor="#ffffff"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width="600"
                      height="200"
                      fill="transparent"
                    />
                    {(() => {
                      const valuesOpens = last30Series.map((s) => s.opens);
                      const valuesClicks = last30Series.map((s) => s.clicks);
                      const max = Math.max(1, ...valuesOpens, ...valuesClicks);
                      const stepX =
                        600 / Math.max(1, last30Series.length - 1 || 1);

                      const polyline = (values: number[]) =>
                        values
                          .map((v, i) => {
                            const x = i * stepX;
                            const y = 180 - (v / max) * 160;
                            return `${x},${y}`;
                          })
                          .join(" ");

                      return (
                        <>
                          <polyline
                            points={polyline(valuesOpens)}
                            fill="none"
                            stroke="#f3ba42"
                            strokeWidth={2}
                          />
                          <polyline
                            points={polyline(valuesClicks)}
                            fill="none"
                            stroke="#57377d"
                            strokeWidth={2}
                          />
                          {/* filled area for opens */}
                          <polygon
                            points={`${polyline(valuesOpens)} 600,200 0,200`}
                            fill="url(#g1)"
                            opacity={0.6}
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-serif font-bold mb-4">
                  Top Campaigns (Delivered)
                </h3>
                <div className="space-y-3">
                  {topCampaigns.length === 0 && (
                    <p className="text-gray-600">No campaigns yet.</p>
                  )}
                  {topCampaigns.map((c) => {
                    const width = Math.min(
                      100,
                      Math.round(
                        (c.delivered / (topCampaigns[0]?.delivered || 1)) * 100
                      )
                    );
                    return (
                      <div
                        key={c.campaign_id}
                        className="flex items-center gap-4"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.delivered.toLocaleString()} delivered
                          </div>
                        </div>
                        <div className="w-48 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${width}%`,
                              background: "#f3ba42",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tables Section */}
            <div className="card mb-6 p-6">
              <h3 className="text-lg font-serif font-bold mb-4">
                Campaign Breakdown
              </h3>
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
                        Delivered
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">
                        Opens
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">
                        Clicks
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">
                        Open Rate
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">
                        Click Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignSummaries.map((c) => (
                      <tr
                        key={c.campaign_id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 font-medium">{c.name}</td>
                        <td className="py-4 px-4 text-right">
                          {c.sent.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {c.delivered.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {c.unique_opens.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {c.unique_clicks.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {formatPercent(
                            c.delivered ? c.unique_opens / c.delivered : 0
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {formatPercent(
                            c.delivered ? c.unique_clicks / c.delivered : 0
                          )}
                        </td>
                      </tr>
                    ))}
                    {campaignSummaries.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 px-4 text-center text-gray-600"
                        >
                          No campaign data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-serif font-bold mb-4">
                Recent Events
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold">
                        Time
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">
                        Event
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">
                        Campaign
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 20).map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {new Date(e.occurred_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-medium">
                          {e.event_type}
                        </td>
                        <td className="py-4 px-4">
                          {e.campaign_id
                            ? campaignMap[e.campaign_id] || e.campaign_id
                            : "—"}
                        </td>
                        <td className="py-4 px-4">{e.contact_id || "—"}</td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 px-4 text-center text-gray-600"
                        >
                          No recent events.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
import { BarChart3 } from "lucide-react";
import { AppLayout } from "../../components/app/AppLayout";

export const Analytics = () => {
  return (
    <AppLayout currentPath="/app/analytics">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Analytics</h1>
          <p className="text-gray-600">
            Track and analyze your campaign performance.
          </p>
        </div>
        <div className="text-center py-20">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Advanced analytics coming soon.</p>
        </div>
      </div>
    </AppLayout>
  );
};
