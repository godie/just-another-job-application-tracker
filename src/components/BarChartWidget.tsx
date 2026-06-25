import React, { memo } from 'react';
// react-doctor-disable-next-line prefer-dynamic-import -- recharts is code-split by parent InsightsPage via React.lazy()
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import ChartContainer, { ChartTooltip } from './ChartContainer';

interface BarChartWidgetProps {
  title: string;
  data: { name: string; value: number }[];
  accentColor: 'terracotta' | 'sage';
  barFill: string;
  tooltipUnit: string;
  formatName?: (name: string) => string;
}

type ChartTooltipPayload = { active?: boolean; payload?: ReadonlyArray<{ payload: { name: string; value: number } }> };

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ title, data, accentColor, barFill, tooltipUnit, formatName }) => {
  const chartData = data.map(item => ({
    ...item,
    name: formatName ? formatName(item.name) : item.name,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload } = props as ChartTooltipPayload;
    if (active && payload && payload.length) {
      return (
        <ChartTooltip
          name={payload[0].payload.name}
          value={payload[0].payload.value}
          unit={tooltipUnit}
          accentColor={accentColor}
        />
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title={title}
      accentColor={accentColor}
    >
      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray='3 3' stroke='currentColor' opacity={0.1} />
          <XAxis
            dataKey='name'
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            content={renderTooltip}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey='value'
            fill={barFill}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

BarChartWidget.displayName = 'BarChartWidget';

export default memo(BarChartWidget);
