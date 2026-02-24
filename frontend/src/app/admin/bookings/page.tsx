import AdminBookingsManager from "@/components/admin-bookings-manager";

export default function AdminBookingsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Manage Bookings</h1>
      <AdminBookingsManager />
    </div>
  );
}
