"use client";

import { statusLabel, TASK_STATUSES } from "@/lib/task-status";
import { Label, Pie, PieChart } from "recharts";

import type { ChartConfig } from "@amaxa/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amaxa/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@amaxa/ui/chart";

interface StatusCounts {
  todo: number;
  in_progress: number;
  completed: number;
  blocked: number;
  waiting: number;
}

interface TaskStatusChartProps {
  ccpmV2?: boolean;
  title: string;
  description?: string;
  data?: StatusCounts;
  total?: number;
}

const statusColours = {
  todo: "var(--chart-1)",
  in_progress: "var(--chart-2)",
  completed: "var(--chart-3)",
  blocked: "var(--chart-4)",
  waiting: "var(--chart-5)",
} as const;

function buildChartConfig(ccpmV2: boolean): ChartConfig {
  return {
    count: { label: "Tasks" },
    ...Object.fromEntries(
      TASK_STATUSES.map((status) => [
        status,
        { label: statusLabel(status, ccpmV2), color: statusColours[status] },
      ]),
    ),
  };
}

export function TaskStatusChart({
  ccpmV2 = false,
  title,
  description,
  data,
  total,
}: TaskStatusChartProps) {
  const chartConfig = buildChartConfig(ccpmV2);
  const chartData = TASK_STATUSES.map((status) => ({
    status,
    count: data?.[status],
    fill: `var(--color-${status})`,
  })).filter((d) => d.count != null && d.count > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {total === 0 ? (
          <div className="flex h-62.5 items-center justify-center">
            <p className="text-muted-foreground text-sm">No tasks</p>
          </div>
        ) : (
          <ChartContainer
            className="mx-auto aspect-square max-h-62.5"
            config={chartConfig}
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
                cursor={false}
              />
              <Pie
                data={chartData}
                dataKey="count"
                innerRadius={60}
                nameKey="status"
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          dominantBaseline="middle"
                          textAnchor="middle"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          <tspan
                            className="fill-foreground text-3xl font-bold"
                            x={viewBox.cx}
                            y={viewBox.cy}
                          >
                            {total}
                          </tspan>
                          <tspan
                            className="fill-muted-foreground"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 24}
                          >
                            Tasks
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
