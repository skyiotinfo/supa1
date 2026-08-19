import Link from "next/link";
import DeviceHistory from "@/components/device-history";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const { node } = await searchParams;

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6 px-4">
      <div className="flex items-center gap-4">
        <Link href="/protected" className="text-sm text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
        <h2 className="font-medium text-xl">Device History</h2>
      </div>
      {node ? <DeviceHistory node={node} /> : <p className="text-muted-foreground">Select a device from the dashboard.</p>}
    </div>
  );
}