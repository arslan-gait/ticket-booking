"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { toErrorMessage, verifyQr } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type ResultState = {
  valid: boolean;
  message: string;
};

type PendingScan = {
  qrData: string;
  booking: {
    customer_name: string;
    phone_number: string;
    seats: Array<{
      section: string;
      row: string;
      number: number;
      type: string;
    }>;
  };
};

let scannerTeardown: Promise<void> = Promise.resolve();

async function stopAndClearScanner(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    // Ignore teardown races when scanner never fully started.
  } finally {
    scanner.clear();
  }
}

function queueStopAndClearScanner(scanner: Html5Qrcode) {
  scannerTeardown = scannerTeardown.then(
    () => stopAndClearScanner(scanner),
    () => stopAndClearScanner(scanner),
  );
  return scannerTeardown;
}

export default function QrScanner() {
  const { tr } = useAppSettings();
  const readerElementId = useId().replace(/:/g, "-");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [confirming, setConfirming] = useState(false);

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
    const config = { fps: 10, qrbox: 250 };
    const onScanFailure = () => {};

    const onScanSuccess = async (decodedText: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      let keepBusy = false;
      try {
        const res = await verifyQr(decodedText, { consume: false });
        if (!active) return;
        if (res.valid && res.booking) {
          setPendingScan({
            qrData: decodedText,
            booking: {
              customer_name: res.booking.customer_name,
              phone_number: res.booking.phone_number,
              seats: res.booking.seats,
            },
          });
          setResult(null);
          keepBusy = true;
        } else {
          setResult({ valid: false, message: res.error ?? tr("invalidTicket") });
        }
      } catch (error) {
        if (active) {
          setResult({ valid: false, message: `${tr("scanFailed")}: ${toErrorMessage(error)}` });
        }
      } finally {
        if (!keepBusy) {
          busyRef.current = false;
        }
      }
    };

    const startScanner = async () => {
      await scannerTeardown;
      if (!active) return;

      const scanner = new Html5Qrcode(readerElementId);
      scannerRef.current = scanner;

      const stopIfInactive = async () => {
        if (active) return false;
        await queueStopAndClearScanner(scanner);
        return true;
      };

      try {
        await scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
        await stopIfInactive();
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
        await stopIfInactive();
      } catch (error) {
        if (active) {
          setResult({ valid: false, message: getCameraStartMessage(error) });
        }
      }
    };

    void startScanner();

    return () => {
      active = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      void queueStopAndClearScanner(scanner);
    };
  }, [readerElementId, tr]);

  async function confirmScan() {
    if (!pendingScan || confirming) return;
    setConfirming(true);
    try {
      const res = await verifyQr(pendingScan.qrData, { consume: true });
      if (res.valid) {
        setResult({ valid: true, message: tr("qrValidUsed") });
      } else {
        setResult({ valid: false, message: res.error ?? tr("invalidTicket") });
      }
    } catch (error) {
      setResult({ valid: false, message: `${tr("scanFailed")}: ${toErrorMessage(error)}` });
    } finally {
      setPendingScan(null);
      setConfirming(false);
      busyRef.current = false;
    }
  }

  function cancelScan() {
    setPendingScan(null);
    busyRef.current = false;
  }

  return (
    <div className="space-y-4">
      <div id={readerElementId} className="max-w-md" />
      {pendingScan ? (
        <div className="card space-y-3 border-yellow-500 p-4">
          <p className="font-semibold">{tr("scanConfirmQuestion")}</p>
          <div className="text-sm">
            <p className="font-semibold">{tr("scanTicketInfo")}</p>
            <p>
              {tr("name")}: <b>{pendingScan.booking.customer_name}</b>
            </p>
            <p>
              {tr("whatsapp")}: <b>{pendingScan.booking.phone_number}</b>
            </p>
            <p>
              {tr("seatsCount")}: <b>{pendingScan.booking.seats.length}</b>
            </p>
            <p className="mt-1 font-medium">{tr("seats")}:</p>
            <div className="space-y-1">
              {pendingScan.booking.seats.map((seat, index) => (
                <p key={`${seat.section}-${seat.row}-${seat.number}-${index}`} className="muted">
                  {tr("section")}: {seat.section} · {tr("row")}: {seat.row} · {tr("seatPlace")}:{" "}
                  {seat.number} · {tr("seatType")}: {seat.type}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="button button-primary"
              disabled={confirming}
              onClick={() => {
                void confirmScan();
              }}
            >
              {tr("scanConfirmYes")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={confirming}
              onClick={cancelScan}
            >
              {tr("scanConfirmNo")}
            </button>
          </div>
        </div>
      ) : null}
      {result && (
        <div className={`card p-3 ${result.valid ? "border-green-500" : "border-red-500"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
