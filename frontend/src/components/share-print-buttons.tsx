"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSettings } from "@/components/app-settings-provider";
import ShareIcon from "@/components/icons/share-icon";
import PrinterIcon from "@/components/icons/printer-icon";

export default function SharePrintButtons() {
  const { tr } = useAppSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePrint() {
    setOpen(false);
    window.print();
  }

  async function handleShare() {
    setOpen(false);
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      alert(tr("linkCopied"));
    }
  }

  return (
    <div ref={ref} className="absolute right-3 top-1/2 -translate-y-1/2">
      <button
        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
      >
        <span className="block size-1 rounded-full bg-current" />
        <span className="block size-1 rounded-full bg-current" />
        <span className="block size-1 rounded-full bg-current" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-36 rounded-xl border border-gray-200 bg-[var(--card)] shadow-lg overflow-hidden">
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 transition-colors"
            onClick={handleShare}
          >
            <ShareIcon className="size-5 shrink-0" />
            {tr("share")}
          </button>
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 transition-colors"
            onClick={handlePrint}
          >
            <PrinterIcon className="size-5 shrink-0" />
            {tr("print")}
          </button>
        </div>
      )}
    </div>
  );
}
