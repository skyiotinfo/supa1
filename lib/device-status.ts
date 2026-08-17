// Shared types + helpers for turning raw Supabase status-log rows into
// paired ON -> OFF cycles with durations, used by the dashboard.

export type StatusLogRow = {
  id: number;
  device_id: string;
  column_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
};

export type Cycle = {
  onAt: string;
  offAt: string | null; // null = still running
  durationMs: number;
};

const isOnValue = (v: string | null) => v === "1" || v === "true";

/**
 * Walks the (ascending-time) log rows for a single column and pairs up
 * ON -> OFF transitions into cycles. If the column is currently ON and has
 * no matching OFF yet, the last cycle is returned "open" (offAt: null) with
 * duration measured up to `now`.
 */
export function computeCycles(
  logs: StatusLogRow[],
  columnName: string,
  currentValue: string | number | null,
  now: number = Date.now(),
): Cycle[] {
  const rows = logs
    .filter((l) => l.column_name === columnName)
    .slice()
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  const cycles: Cycle[] = [];
  let pendingOnAt: string | null = null;

  for (const row of rows) {
    if (isOnValue(row.new_value)) {
      // overwrite in case of duplicate ON events without an OFF between them
      pendingOnAt = row.changed_at;
    } else if (pendingOnAt) {
      const onMs = new Date(pendingOnAt).getTime();
      const offMs = new Date(row.changed_at).getTime();
      cycles.push({ onAt: pendingOnAt, offAt: row.changed_at, durationMs: Math.max(0, offMs - onMs) });
      pendingOnAt = null;
    }
  }

  const stillOn = isOnValue(String(currentValue ?? ""));
  if (pendingOnAt && stillOn) {
    const onMs = new Date(pendingOnAt).getTime();
    cycles.push({ onAt: pendingOnAt, offAt: null, durationMs: Math.max(0, now - onMs) });
  }

  return cycles.reverse(); // most recent first
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
