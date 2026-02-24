"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TicketQr({ value }: { value: string }) {
  return (
    <div className="inline-block rounded bg-white p-3">
      <QRCodeSVG value={value} size={240} />
    </div>
  );
}
