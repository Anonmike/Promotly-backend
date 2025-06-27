import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface AnalyticsChartProps {
  data: any[];
  type: "engagement" | "platform";
}

export default function AnalyticsChart({ data, type }: AnalyticsChartProps) {
  const chartData = useMemo(() => {
    if (type === "engagement") {
      // Group data by date and sum engagements
      const grouped = data.reduce((acc, item) => {
        const date = new Date(item.lastUpdated).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = {
            date,
            likes: 0,
            shares: 0,
            comments: 0,
            total: 0,
          };
        }
        acc[date].likes += item.likes || 0;
        acc[date].shares += item.shares || 0;
        acc[date].comments += item.comments || 0;
        acc[date].total += (item.likes || 0) + (item.shares || 0) + (item.comments || 0);
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped).slice(-7); // Last 7 days
    } else {
      // Group data by platform
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.platform]) {
          acc[item.platform] = {
            platform: item.platform,
            likes: 0,
            shares: 0,
            comments: 0,
            impressions: 0,
            posts: 0,
          };
        }
        acc[item.platform].likes += item.likes || 0;
        acc[item.platform].shares += item.shares || 0;
        acc[item.platform].comments += item.comments || 0;
        acc[item.platform].impressions += item.impressions || 0;
        acc[item.platform].posts += 1;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    }
  }, [data, type]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  if (type === "engagement") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="likes" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="shares" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="comments" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="platform" 
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Bar dataKey="likes" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="shares" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
