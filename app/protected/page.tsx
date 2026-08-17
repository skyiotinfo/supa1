import DeviceDashboard from "@/components/device-dashboard";

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-4">
      <DeviceDashboard />
    </div>
  );
}
