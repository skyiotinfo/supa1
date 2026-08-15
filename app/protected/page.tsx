import { redirect } from "next/navigation";

import AutoRefresh from "@/components/auto-refresh";
import { createClient } from "@/lib/supabase/server";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

type PumpStatus = {
  id?: number;
  pump_on?: boolean;
  updated_at?: string;
  total_run_today?: number;
  last_run_time?: string;
};

type TankPumpStatus = {
  id?: number;
  pump2?: boolean;
  updated_at?: string;
  total_run_today?: number;
  last_run_time?: string;
};



async function getData(): Promise<PumpStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/motor_status?select=*`, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch motor status");
  }

  const data = (await response.json()) as PumpStatus[];
  return data[0] ?? {};
}


async function getData_tank(): Promise<TankPumpStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/tank_pump_status?select=*`, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tank status");
  }

  const data = (await response.json()) as TankPumpStatus[];
  return data[0] ?? {};
}


export default async function ProtectedPage() {
  const sub_pump = await getData();
  const tank_pump = await getData_tank();
  const formatDateTime = (value?: string) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  const m_state = (() => {
    const updatedAt = sub_pump.updated_at;
    console.log("Updated At:", updatedAt);
    if (!updatedAt) {
      return "OFFLINE";
    }

    const lastUpdated = new Date(updatedAt).getTime();
    const diffInMinutes = (Date.now() - lastUpdated) / 60000;
    console.log("Difference in Minutes:", diffInMinutes);

    return diffInMinutes > 1 ? "OFFLINE" : "ONLINE";
  })();

  return (
    <AutoRefresh>
      <div className="flex-1 w-full flex flex-col gap-4">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex w-full items-center justify-between gap-2 border-b border-border pb-2">
              <span className="font-medium text-foreground">Motor Status</span>
              {sub_pump.pump_on ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  ON
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  OFF
                </span>
              )}

              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {m_state}
              </span>

              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                {formatDateTime(sub_pump.updated_at)}
              </span>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-medium text-foreground">Total Run Today</span>
              <span>{sub_pump.total_run_today?.toString() || "N/A"}</span>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-medium text-foreground">Last Run Time</span>
              <span>{formatDateTime(sub_pump.updated_at)}</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex w-full items-center justify-between gap-2 border-b border-border pb-2">
              <span className="font-medium text-foreground">Motor Status</span>
              {tank_pump.pump2 ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  ON
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  OFF
                </span>
              )}

              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {m_state}
              </span>

              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                {formatDateTime(tank_pump.updated_at)}
              </span>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-medium text-foreground">Total Run Today</span>
              <span>{tank_pump.total_run_today?.toString() || "N/A"}</span>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-medium text-foreground">Last Run Time</span>
              <span>{formatDateTime(tank_pump.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

    </AutoRefresh>
  );
}
