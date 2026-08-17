"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

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

export default function ProtectedPage() {
  const router = useRouter();
  const [subPump, setSubPump] = useState<PumpStatus>({});
  const [tankPump, setTankPump] = useState<TankPumpStatus>({});
  const [loading, setLoading] = useState(true);

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

  const getMotorState = (updatedAt?: string) => {
    if (!updatedAt) return "OFFLINE";

    const lastUpdated = new Date(updatedAt).getTime();
    const diffInMinutes = (Date.now() - lastUpdated) / 60000;

    return diffInMinutes > 1 ? "OFFLINE" : "ONLINE";
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [{ data: motorData }, { data: tankData }] = await Promise.all([
        supabase
          .from("motor_status")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tank_pump_status")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setSubPump((motorData as PumpStatus) ?? {});
      setTankPump((tankData as TankPumpStatus) ?? {});
      setLoading(false);
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, [router]);

  const mState = getMotorState(subPump.updated_at);

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border pb-2">
            <span className="font-medium text-foreground">Motor Status</span>
            {subPump.pump_on ? (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                ON
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                OFF
              </span>
            )}

            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {mState}
            </span>

            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
              {formatDateTime(subPump.updated_at)}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span className="font-medium text-foreground">Total Run Today</span>
            <span>{subPump.total_run_today?.toString() || "N/A"}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span className="font-medium text-foreground">Last Run Time</span>
            <span>{formatDateTime(subPump.updated_at)}</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border pb-2">
            <span className="font-medium text-foreground">Tank Pump Status</span>
            {tankPump.pump2 ? (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                ON
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                OFF
              </span>
            )}

            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {getMotorState(tankPump.updated_at)}
            </span>

            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
              {formatDateTime(tankPump.updated_at)}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span className="font-medium text-foreground">Total Run Today</span>
            <span>{tankPump.total_run_today?.toString() || "N/A"}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span className="font-medium text-foreground">Last Run Time</span>
            <span>{formatDateTime(tankPump.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
