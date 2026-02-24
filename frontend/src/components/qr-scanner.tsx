"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { verifyQr } from "@/lib/api";

type ResultState = {
  valid: boolean;
  message: string;
};

export default function QrScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          if (busy) return;
          setBusy(true);
          try {
            const res = await verifyQr(decodedText);
            if (res.valid) {
              setResult({ valid: true, message: "Ticket is valid and marked as used." });
            } else {
              setResult({ valid: false, message: res.error ?? "Invalid ticket." });
            }
          } catch (error) {
            setResult({ valid: false, message: `Scan failed: ${String(error)}` });
          } finally {
            setBusy(false);
          }
        },
        () => {},
      )
      .catch((error) => {
        setResult({ valid: false, message: `Could not start camera: ${String(error)}` });
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [busy]);

  return (
    <div className="space-y-4">
      <div id="qr-reader" className="max-w-md" />
      {result && (
        <div className={`card p-3 ${result.valid ? "border-green-500" : "border-red-500"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
