import AdminVenuesManager from "@/components/admin-venues-manager";

export default function AdminVenuesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Manage Venues</h1>
      <AdminVenuesManager />
    </div>
  );
}
