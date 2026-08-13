import { redirect } from "next/navigation";

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

export default async function ProtectedPage() {
  const sub_pump = await getData();

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
    <div className="flex-1 w-full flex flex-col gap-6">

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Pump Motor Data
        </h2>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <span className="font-medium text-foreground">Motor Status</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {sub_pump.pump_on ? "ON" : "OFF"} {m_state}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">Total Run Today</span>
            <span>5</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">Last Run Time</span>
            <span>14:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}
