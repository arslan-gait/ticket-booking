"use client";

import { useState } from "react";
import CheckmarkIcon from "@/components/icons/checkmark-icon";

export default function BookingSuccessOverlay({
  message,
  instruction,
}: {
  message: string;
  instruction: string;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setVisible(false)}
    >
      <div
        className="flex flex-col items-center gap-7 rounded-lg bg-[#f0f0f0] px-10 py-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckmarkIcon className="w-4 h-4" />
        </div>

        <p className="text-center text-base font-semibold text-gray-800">
          {message}
        </p>
        <p className="text-center text-sm font-light text-gray-800">
          {instruction}
        </p>

        <button
          className="mt-1 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          onClick={() => setVisible(false)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
