/**
 * EVENT TIMELINE CHART COMPONENT
 * 
 * Displays a line chart showing the count of email events over time.
 * Aggregates events by day and shows trends with custom styling.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BarChart3 } from 'lucide-react';

/**
 * EMAIL EVENT INTERFACE
 */
interface EmailEvent {
  id: string;
  occurred_at: string;
  event_type: string;
}

/**
 * DAY DATA INTERFACE
 */
interface DayData {
  date: string;
  fullDate: string;
  count: number;
}

/**
 * COMPONENT PROPS
 */
interface EventTimelineChartProps {
  events: EmailEvent[];
  loading: boolean;
  timeRange: number;
}

/**
 * CUSTOM TOOLTIP
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-black rounded-lg p-3 shadow-lg">
      <p className="font-sans text-sm font-semibold mb-2">{data.fullDate}</p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple"></div>
        <span className="font-sans text-sm">
          Events: <span className="font-semibold">{data.count.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
};

/**
 * LOADING STATE
 */
const LoadingState = () => (
  <div className="h-64 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin w-12 h-12 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600 font-sans">Loading timeline...</p>
    </div>
  </div>
);

/**
 * EMPTY STATE
 */
const EmptyState = () => (
  <div className="h-64 flex items-center justify-center">
    <div className="text-center">
      <BarChart3 size={48} className="text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 font-sans font-semibold mb-2">No Events Yet</p>
      <p className="text-sm text-gray-500 font-sans">
        Send campaigns to see event timeline
      </p>
    </div>
  </div>
);

/**
 * EVENT TIMELINE CHART COMPONENT
 */
export const EventTimelineChart = ({ events, loading, timeRange }: EventTimelineChartProps) => {
  // LOADING STATE
  if (loading) {
    return <LoadingState />;
  }

  // EMPTY STATE
  if (!events || events.length === 0) {
    return <EmptyState />;
  }

  // Aggregate events by day
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  // Create daily buckets
  const dailyData = new Map<string, DayData>();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    dailyData.set(dateKey, {
      date: shortDate,
      fullDate: fullDate,
      count: 0
    });
  }

  // Aggregate event counts
  events.forEach(event => {
    const dateKey = new Date(event.occurred_at).toISOString().split('T')[0];
    const dayData = dailyData.get(dateKey);

    if (dayData) {
      dayData.count++;
    }
  });

  // Convert to array for chart
  const chartData: DayData[] = Array.from(dailyData.values());

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        {/* GRID */}
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

        {/* X-AXIS */}
        <XAxis
          dataKey="date"
          stroke="#000000"
          style={{
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif'
          }}
          tick={{ fill: '#000000' }}
        />

        {/* Y-AXIS */}
        <YAxis
          stroke="#000000"
          style={{
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif'
          }}
          tick={{ fill: '#000000' }}
          allowDecimals={false}
        />

        {/* TOOLTIP */}
        <Tooltip content={<CustomTooltip />} />

        {/* LINE */}
        <Line
          type="monotone"
          dataKey="count"
          stroke="#57377d"
          strokeWidth={2}
          name="Events"
          dot={{ fill: '#57377d', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
