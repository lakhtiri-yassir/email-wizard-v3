/**
 * EVENT DISTRIBUTION CHART COMPONENT
 * 
 * Displays a pie chart showing the distribution of different email event types.
 * Uses Recharts with custom styling matching the Email Wizard design system.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';

/**
 * EVENT STATS INTERFACE
 */
interface EventStats {
  sent: number;
  delivered: number;
  open: number;
  click: number;
  bounce: number;
  spam: number;
  unsubscribe: number;
}

/**
 * COMPONENT PROPS
 */
interface EventDistributionChartProps {
  data: EventStats;
  loading: boolean;
}

/**
 * EVENT COLORS
 * Matching Email Wizard design system
 */
const EVENT_COLORS = {
  sent: '#f3ba42',        // gold
  delivered: '#10b981',   // green
  open: '#57377d',        // purple
  click: '#f59e0b',       // amber
  bounce: '#ef4444',      // red
  spam: '#f97316',        // orange
  unsubscribe: '#6b7280'  // gray
};

/**
 * CUSTOM TOOLTIP
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];

  return (
    <div className="bg-white border border-black rounded-lg p-3 shadow-lg">
      <p className="font-sans text-sm font-semibold mb-1">{data.name}</p>
      <p className="font-sans text-sm">
        Count: <span className="font-semibold">{data.value.toLocaleString()}</span>
      </p>
      <p className="font-sans text-sm text-gray-600">
        {data.payload.percentage}%
      </p>
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
      <p className="text-gray-600 font-sans">Loading distribution...</p>
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
        Send campaigns to see event distribution
      </p>
    </div>
  </div>
);

/**
 * EVENT DISTRIBUTION CHART COMPONENT
 */
export const EventDistributionChart = ({ data, loading }: EventDistributionChartProps) => {
  // LOADING STATE
  if (loading) {
    return <LoadingState />;
  }

  // Transform data for chart
  const chartData = [
    { name: 'Sent', value: data.sent, color: EVENT_COLORS.sent },
    { name: 'Delivered', value: data.delivered, color: EVENT_COLORS.delivered },
    { name: 'Opens', value: data.open, color: EVENT_COLORS.open },
    { name: 'Clicks', value: data.click, color: EVENT_COLORS.click },
    { name: 'Bounces', value: data.bounce, color: EVENT_COLORS.bounce },
    { name: 'Spam Reports', value: data.spam, color: EVENT_COLORS.spam },
    { name: 'Unsubscribes', value: data.unsubscribe, color: EVENT_COLORS.unsubscribe }
  ].filter(item => item.value > 0); // Only show non-zero values

  // Calculate total and percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercentage = chartData.map(item => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1)
  }));

  // EMPTY STATE
  if (total === 0) {
    return <EmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={dataWithPercentage}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {dataWithPercentage.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            paddingTop: '20px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};