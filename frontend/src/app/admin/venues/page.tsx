import VenueEditor from "@/components/venue-editor";

const demoSeats = Array.from({ length: 24 }).map((_, idx) => ({
  id: idx + 1,
  x: 80 + (idx % 8) * 90,
  y: 80 + Math.floor(idx / 8) * 100,
  label: `A-${idx + 1}`,
}));

export default function AdminVenuesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Manage Venues</h1>
      <p className="text-slate-300">Initial canvas preview for seat map editing.</p>
      <VenueEditor seats={demoSeats} />
    </div>
  );
}
