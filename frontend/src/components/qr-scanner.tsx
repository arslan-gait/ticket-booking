"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { verifyQr } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type ResultState = {
  valid: boolean;
  message: string;
};

export default function QrScanner() {
  const { tr } = useAppSettings();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [result, setResult] = useState<ResultState | null>(null);

  const getCameraStartMessage = (error: unknown) => {
    const raw = String(error);
    const normalized = raw.toLowerCase();
    if (normalized.includes("notallowederror") || normalized.includes("permission denied")) {
      return tr("cameraPermissionDenied");
    }
    return `${tr("cameraStartFailed")}: ${raw}`;
  };

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    const config = { fps: 10, qrbox: 250 };
    const onScanFailure = () => {};

    const onScanSuccess = async (decodedText: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await verifyQr(decodedText);
        if (!active) return;
        if (res.valid) {
          setResult({ valid: true, message: tr("qrValidUsed") });
        } else {
          setResult({ valid: false, message: res.error ?? tr("invalidTicket") });
        }
      } catch (error) {
        if (active) {
          setResult({ valid: false, message: `${tr("scanFailed")}: ${String(error)}` });
        }
      } finally {
        busyRef.current = false;
      }
    };

    const startScanner = async () => {
      try {
        await scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
        return;
      } catch {
        // Some browsers don't support facingMode constraints reliably.
      }

      try {
        const cameras = await Html5Qrcode.getCameras();
        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0];

        if (!preferredCamera) {
          throw new Error("No camera devices found");
        }

        await scanner.start(preferredCamera.id, config, onScanSuccess, onScanFailure);
      } catch (error) {
        if (active) {
          setResult({ valid: false, message: getCameraStartMessage(error) });
        }
      }
    };

    void startScanner();

    return () => {
      active = false;
      void (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // Ignore teardown races when scanner never fully started.
        } finally {
          scanner.clear();
        }
      })();
    };
  }, [tr]);

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
