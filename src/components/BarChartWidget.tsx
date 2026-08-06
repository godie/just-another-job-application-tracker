import React, { lazy, memo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import ChartContainer, { ChartTooltip } from './ChartContainer';

interface BarChartWidgetProps {
  title: string;
  data: { name: string; value: number }[];
  accentColor: 'terracotta' | 'sage';
  barFill: string;
  tooltipUnit: string;
  formatName?: (name: string) => string;
}

interface LazyBarChartProps {
  data: { name: string; value: number }[];
  accentColor: 'terracotta' | 'sage';
  barFill: string;
  tooltipUnit: string;
}

type ChartTooltipPayload = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: { name: string; value: number } }>;
};

/**
 * recharts clones the element passed to `<Tooltip content={...} />` and
 * injects the tooltip state (`active`, `payload`, ...) as props. This
 * top-level component combines those injected props with the widget's
 * accent/unit props, so the renderer stays a pure presentational component
 * instead of a closure recreated inside the lazy factory.
 */
interface BarChartTooltipProps extends ChartTooltipPayload {
  accentColor: 'terracotta' | 'sage';
  tooltipUnit: string;
}

const BarChartTooltip: React.FC<BarChartTooltipProps> = ({ active, payload, accentColor, tooltipUnit }) => {
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

/**
 * recharts is a heavy library (~100 kB gzipped). Loading it with a static
 * import would ship it to every user up front, so it is fetched on demand
 * with a dynamic import — the module only downloads when a chart actually
 * renders. `React.lazy` expects a promise resolving to `{ default: Component }`,
 * so the named recharts exports are adapted to a default export in `.then()`.
 */
const LazyBarChart = lazy(() =>
  import('recharts').then((recharts) => ({
    default: ({ data, accentColor, barFill, tooltipUnit }: LazyBarChartProps) => (
      <recharts.ResponsiveContainer width='100%' height={300}>
        <recharts.BarChart data={data}>
          <recharts.CartesianGrid strokeDasharray='3 3' stroke='currentColor' opacity={0.1} />
          <recharts.XAxis
            dataKey='name'
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <recharts.YAxis
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <recharts.Tooltip
            contentStyle={{
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            content={<BarChartTooltip accentColor={accentColor} tooltipUnit={tooltipUnit} />}
          />
          <recharts.Legend wrapperStyle={{ fontSize: '12px' }} />
          <recharts.Bar
            dataKey='value'
            fill={barFill}
            radius={[2, 2, 0, 0]}
          />
        </recharts.BarChart>
      </recharts.ResponsiveContainer>
    ),
  }))
);

const BarChartWidget: React.FC<BarChartWidgetProps> = ({ title, data, accentColor, barFill, tooltipUnit, formatName }) => {
  const { t } = useTranslation();
  const chartData = data.map(item => ({
    ...item,
    name: formatName ? formatName(item.name) : item.name,
  }));

  return (
    <ChartContainer
      title={title}
      accentColor={accentColor}
    >
      <Suspense fallback={
        <div className='h-[300px] flex items-center justify-center text-muted-foreground' role='status' aria-label={t('common.loading')}>
          <span className='text-sm'>{t('common.loading')}</span>
        </div>
      }>
        <LazyBarChart
          data={chartData}
          accentColor={accentColor}
          barFill={barFill}
          tooltipUnit={tooltipUnit}
        />
      </Suspense>
    </ChartContainer>
  );
};

BarChartWidget.displayName = 'BarChartWidget';

export default memo(BarChartWidget);
