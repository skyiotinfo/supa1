"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ALL_NODES,
  CARD_BG_CLASS,
  HistoryTable,
  type NodeDef,
} from "@/components/device-dashboard";
import {
  computeCycles,
  formatDuration,
  formatTime,
  type StatusLogRow,
} from "@/lib/device-status";

export default function DeviceHistory({ node }: { node: string }) {
  const supabase = useMemo(() => createClient(), []);
  const def = ALL_NODES.find((item) => item.column === node) as NodeDef | undefined;
  const [currentValue, setCurrentValue] = useState<string | number | null>(null);
  const [logs, setLogs] = useState<StatusLogRow[]>([]);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<"table" | "chart">("table");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cycles = useMemo(
    () => (def ? computeCycles(logs, def.column, currentValue, now) : []),
    [def, logs, currentValue, now],
  );
  const chartData = cycles
    .slice(0, 10)
    .reverse()
    .map((cycle) => {
      const startedAt = new Date(cycle.onAt);
      return {
        turnedOn: startedAt.toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        duration: Number((cycle.durationMs / 60000).toFixed(2)),
        durationLabel: formatDuration(cycle.durationMs),
        started: formatTime(cycle.onAt),
      };
    });

  useEffect(() => {
    if (!def) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          supabase.from(def.table).select("*").limit(1).maybeSingle(),
          supabase
            .from(def.logTable)
            .select("*")
            .order("changed_at", { ascending: false })
            .limit(500),
        ]);

        if (statusRes.error) throw statusRes.error;
        if (logsRes.error) throw logsRes.error;

        setCurrentValue((statusRes.data?.[def.column] as string | number | null) ?? null);
        setLogs((logsRes.data as StatusLogRow[]) ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
    const tickInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickInterval);
  }, [def, supabase]);

  if (!def) {
    return <p className="text-sm text-destructive">Unknown device node.</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading history...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">Couldn't load history: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b">
        <Button
          type="button"
          variant={view === "table" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("table")}
          aria-pressed={view === "table"}
        >
          Table
        </Button>
        <Button
          type="button"
          variant={view === "chart" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("chart")}
          aria-pressed={view === "chart"}
        >
          Chart
        </Button>
      </div>

      {view === "table" ? (
        <HistoryTable def={def} currentValue={currentValue} logs={logs} now={now} />
      ) : (
        <div className={`rounded-xl border border-border p-4 ${CARD_BG_CLASS}`}>
          <h3 className="mb-4 text-base font-medium">Cycle duration</h3>
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No on/off history recorded yet for this node.
            </p>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 30, right: 2, left: 2, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="turnedOn"
                    type="category"
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 14 }}
                    height={120}
                  />
                  <YAxis hide domain={[0, "dataMax + 5"]} />
                  <Bar
                    dataKey="duration"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    label={{
                      position: "top",
                      formatter: (value) => `${Math.round(Number(value ?? 0))}`,
                      fill: "hsl(var(--foreground))",
                      fontSize: 14,
                      style: { animation: "none" },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}