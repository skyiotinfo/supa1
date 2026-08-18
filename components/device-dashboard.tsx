"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeCycles,
  formatDuration,
  formatTime,
  type StatusLogRow,
} from "@/lib/device-status";

type MotorStatusRow = Record<string, string | number | null>;
type TankStatusRow = Record<string, string | number | null>;

type NodeDef = {
  table: "motor_status" | "tank_pump_status";
  logTable: "motor_status_logs" | "tank_pump_status_log";
  column: string;
  label: string;
  group: string;
  everSeenColumn?: string;
};

const MOTOR_NODES: NodeDef[] = [
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "pump_on",
    label: "Motor Pump",
    group: "Motor Status",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "door1_open",
    label: "Door 1",
    group: "Motor Status",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "door2_open",
    label: "Door 2",
    group: "Motor Status",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "door3_open",
    label: "Door 3",
    group: "Motor Status",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "node2_open",
    label: "Bathroom1",
    group: "Nodes",
    everSeenColumn: "node2_ever_seen",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "node3_open",
    label: "Washing area",
    group: "Nodes",
    everSeenColumn: "node3_ever_seen",
  },
  {
    table: "motor_status",
    logTable: "motor_status_logs",
    column: "node4_open",
    label: "Bathroom2",
    group: "Nodes",
    everSeenColumn: "node4_ever_seen",
  },
];

const TANK_NODES: NodeDef[] = [
  {
    table: "tank_pump_status",
    logTable: "tank_pump_status_log",
    column: "pump2",
    label: "Tank Pump (Buzzer)",
    group: "Tank Pump Status",
  },
  {
    table: "tank_pump_status",
    logTable: "tank_pump_status_log",
    column: "node1_valve",
    label: "Solenoid Valve",
    group: "Tank Pump Status",
  },
  {
    table: "tank_pump_status",
    logTable: "tank_pump_status_log",
    column: "node1",
    label: "Node 1 (Solenoid Tank)",
    group: "Tank Pump Status",
  },
  {
    table: "tank_pump_status",
    logTable: "tank_pump_status_log",
    column: "node5",
    label: "Node 5 (Main Tank)",
    group: "Tank Pump Status",
  },
];

const ALL_NODES = [...MOTOR_NODES, ...TANK_NODES];
const REFRESH_MS = 5000;
const STALE_MS = 2 * 60 * 1000;

function isOn(v: string | number | null | undefined) {
  return v === 1 || v === "1";
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {on && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          on ? "bg-green-500" : "bg-zinc-400"
        }`}
      />
    </span>
  );
}

function PowerDot({
  everSeen,
}: {
  everSeen: string | number | null | undefined;
}) {
  const seen = everSeen === 1 || everSeen === "1";
  return (
    <span
      title={seen ? "Powered / seen" : "No power / never seen"}
      className={`h-2 w-2 rounded-full ${seen ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}

function NodeCard({
  def,
  currentValue,
  everSeenValue,
  logs,
  now,
  selected,
  onSelect,
}: {
  def: NodeDef;
  currentValue: string | number | null;
  everSeenValue: string | number | null;
  logs: StatusLogRow[];
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const on = isOn(currentValue);
  const cycles = useMemo(
    () => computeCycles(logs, def.column, currentValue, now),
    [logs, def.column, currentValue, now],
  );
  const latest = cycles[0];

  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-xl border p-4 transition-all bg-card hover:shadow-md hover:-translate-y-0.5 ${
        selected
          ? "border-primary ring-2 ring-primary/40 shadow-md"
          : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[15px] font-medium text-foreground/90">
          {def.label}
        </span>
        <span className="flex items-center gap-1.5">
          {def.everSeenColumn ? (
            <PowerDot everSeen={everSeenValue} />
          ) : (
            <StatusDot on={on} />
          )}
        </span>
      </div>
      <Badge
        variant={on ? "default" : "secondary"}
        className={on ? "bg-green-600 hover:bg-green-600/90" : ""}
      >
        {on ? "ON" : "OFF"}
      </Badge>
      <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
        <div className="text-[15px] text-foreground/70">
          {on ? "Running for" : "Motor Duration (last run)"}
        </div>
        <div className="text-[15px] text-foreground/70">
          {latest ? formatDuration(latest.durationMs) : "—"}
        </div>
        {!on && latest && (
          <div className="text-[15px] text-foreground/70">
            Last OFF: {formatTime(latest.offAt)}
          </div>
        )}
      </div>
    </button>
  );
}

function HistoryTable({
  def,
  currentValue,
  logs,
  now,
}: {
  def: NodeDef;
  currentValue: string | number | null;
  logs: StatusLogRow[];
  now: number;
}) {
  const cycles = useMemo(
    () => computeCycles(logs, def.column, currentValue, now).slice(0, 10),
    [logs, def.column, currentValue, now],
  );

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {def.label}
          <span className="text-xs font-normal text-muted-foreground">
            — last {cycles.length} on/off{" "}
            {cycles.length === 1 ? "cycle" : "cycles"} (most recent first)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No on/off history recorded yet for this node.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Turned ON</th>
                  <th className="py-2 pr-4 font-medium">Turned OFF</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c, i) => (
                  <tr key={c.onAt + i} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4">{formatTime(c.onAt)}</td>
                    <td className="py-2 pr-4">
                      {c.offAt ? (
                        formatTime(c.offAt)
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-600/90">
                          still running
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {formatDuration(c.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  title,
  row,
  live,
}: {
  title: string;
  row: MotorStatusRow | TankStatusRow | null;
  live: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <span
            title={live ? "Packets updating" : "No new packets for 2+ min"}
            className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "bg-red-500"}`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="text-[15px] text-foreground/70 flex flex-wrap gap-x-4 gap-y-1">
        <span>Device: {row?.device_id ?? "—"}</span>
        <span>Packets: {row?.packet_count ?? "—"}</span>
        <span>
          Updated: {row?.updated_at ? formatTime(String(row.updated_at)) : "—"}
        </span>
      </CardContent>
    </Card>
  );
}

export default function DeviceDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [motorRow, setMotorRow] = useState<MotorStatusRow | null>(null);
  const [tankRow, setTankRow] = useState<TankStatusRow | null>(null);
  const [motorLogs, setMotorLogs] = useState<StatusLogRow[]>([]);
  const [tankLogs, setTankLogs] = useState<StatusLogRow[]>([]);
  const [selected, setSelected] = useState<NodeDef | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchAll = useCallback(async () => {
    try {
      const [motorRes, tankRes, motorLogRes, tankLogRes] = await Promise.all([
        supabase.from("motor_status").select("*").limit(1).maybeSingle(),
        supabase.from("tank_pump_status").select("*").limit(1).maybeSingle(),
        supabase
          .from("motor_status_logs")
          .select("*")
          .order("changed_at", { ascending: false })
          .limit(500),
        supabase
          .from("tank_pump_status_log")
          .select("*")
          .order("changed_at", { ascending: false })
          .limit(500),
      ]);

      if (motorRes.error) throw motorRes.error;
      if (tankRes.error) throw tankRes.error;
      if (motorLogRes.error) throw motorLogRes.error;
      if (tankLogRes.error) throw tankLogRes.error;

      const motorData = motorRes.data as MotorStatusRow | null;
      const tankData = tankRes.data as TankStatusRow | null;

      setMotorRow(motorData);
      setTankRow(tankData);
      setMotorLogs((motorLogRes.data as StatusLogRow[]) ?? []);
      setTankLogs((tankLogRes.data as StatusLogRow[]) ?? []);
      setError(null);

 
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAll();
    const dataInterval = setInterval(fetchAll, REFRESH_MS);
    const tickInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, [fetchAll]);

  const valueFor = (def: NodeDef) =>
    def.table === "motor_status"
      ? (motorRow?.[def.column] ?? null)
      : (tankRow?.[def.column] ?? null);

  const logsFor = (def: NodeDef) =>
    def.logTable === "motor_status_logs" ? motorLogs : tankLogs;

  const motorUpdatedAt = motorRow?.updated_at
    ? new Date(String(motorRow.updated_at)).getTime()
    : null;
  const tankUpdatedAt = tankRow?.updated_at
    ? new Date(String(tankRow.updated_at)).getTime()
    : null;

  const motorLive = motorUpdatedAt !== null && now - motorUpdatedAt < STALE_MS;
  const tankLive = tankUpdatedAt !== null && now - tankUpdatedAt < STALE_MS;

  if (loading) {
    return (
      <div className="w-full max-w-5xl px-4 py-10 text-center text-muted-foreground">
        Loading live device status…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl px-4 py-10 text-center text-sm text-destructive">
        Couldn&apos;t load status data: {error}
      </div>
    );
  }

  const groups = Array.from(new Set(ALL_NODES.map((n) => n.group)));

 return (
    <div className="w-full max-w-7xl flex flex-col gap-8 px-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-xl">Live Device Status</h2>
        <span className="text-xs text-muted-foreground">
          auto-refreshing every {REFRESH_MS / 1000}s
        </span>
      </div>

      <div className="flex gap-6 items-start">
        {/* LEFT: cards */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard title="Motor Status" row={motorRow} live={motorLive} />
            <SummaryCard title="Tank Pump Status" row={tankRow} live={tankLive} />
          </div>

          {groups.map((group) => (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {ALL_NODES.filter((n) => n.group === group).map((def) => (
                  <NodeCard
                    key={def.column}
                    def={def}
                    currentValue={valueFor(def)}
                    everSeenValue={
                      def.everSeenColumn
                        ? (motorRow?.[def.everSeenColumn] ?? null)
                        : null
                    }
                    logs={logsFor(def)}
                    now={now}
                    selected={selected?.column === def.column}
                    onSelect={() =>
                      setSelected(selected?.column === def.column ? null : def)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: sticky logs panel, shows only on large screens */}
        {selected && (
          <div className="hidden lg:block w-[380px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              History
            </h3>
            <HistoryTable
              def={selected}
              currentValue={valueFor(selected)}
              logs={logsFor(selected)}
              now={now}
            />
          </div>
        )}
      </div>

      {/* Fallback for small screens: still shows below since there's no room beside cards */}
      {selected && (
        <div className="lg:hidden flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            History
          </h3>
          <HistoryTable
            def={selected}
            currentValue={valueFor(selected)}
            logs={logsFor(selected)}
            now={now}
          />
        </div>
      )}
    </div>
  );
}
