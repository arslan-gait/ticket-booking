import QrScanner from "@/components/qr-scanner";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function ScanPage() {
  const lang = await getServerLanguage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "scanTicketQr")}</h1>
      <p className="muted">{t(lang, "scanHint")}</p>
      <QrScanner />
    </div>
  );
}
