'use client';

import { Pie, PieChart, Cell } from 'recharts';
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { type Visit, type OrderType } from '@/lib/types';

const orderTypeColors: { [key in OrderType]: string } = {
  Corretiva: 'hsl(var(--destructive))',
  Preventiva: 'hsl(var(--primary))',
  Preditiva: 'hsl(var(--accent-foreground))',
  Inspeção: 'hsl(var(--secondary-foreground))',
  Calibragem: 'hsl(var(--muted-foreground))',
};

interface MaintenanceTypeChartProps {
  visits: Visit[];
  className?: string;
}

export function MaintenanceTypeChart({ visits, className }: MaintenanceTypeChartProps) {
  const chartData = useMemo(() => {
    const counts = visits.reduce(
      (acc, visit) => {
        // Handle both single and multiple order types
        const orderTypes = Array.isArray(visit.orderType) ? visit.orderType : [visit.orderType];
        orderTypes.forEach(orderType => {
          acc[orderType] = (acc[orderType] || 0) + 1;
        });
        return acc;
      },
      {} as { [key in OrderType]?: number }
    );

    if (Object.keys(counts).length === 0) {
      return [];
    }

    return Object.entries(counts).map(([orderType, count]) => ({
      orderType: orderType as OrderType,
      count: count,
      fill: orderTypeColors[orderType as OrderType],
    }));
  }, [visits]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item) => {
      config[item.orderType] = {
        label: `${item.orderType} (${item.count})`,
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);
  
  return (
    <Card className={className}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Ordens Finalizadas (Total)</CardTitle>
        <CardDescription>
          Distribuição por tipo de ordem
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="orderType"
                innerRadius={60}
                outerRadius={80}
                strokeWidth={5}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.orderType}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="orderType" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] w-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
