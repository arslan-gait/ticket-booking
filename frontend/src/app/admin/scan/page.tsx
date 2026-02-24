import QrScanner from "@/components/qr-scanner";

export default function ScanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scan Ticket QR</h1>
      <p className="text-slate-300">Use your device camera to validate and consume ticket QR codes.</p>
      <QrScanner />
    </div>
  );
}
