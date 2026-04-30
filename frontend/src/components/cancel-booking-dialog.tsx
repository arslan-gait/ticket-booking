"use client";

import { useState } from "react";
import { getCancelCauses } from "@/lib/i18n";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  onConfirm: (commentary: string) => void;
  onClose: () => void;
};

export default function CancelBookingDialog({ onConfirm, onClose }: Props) {
  const { tr, lang } = useAppSettings();
  const causes = getCancelCauses(lang);
  const otherLabel = causes[causes.length - 1];

  const [selected, setSelected] = useState("");
  const [customText, setCustomText] = useState("");

  const isOther = selected === otherLabel;
  const commentary = isOther ? customText : selected;

  function handleConfirm() {
    onConfirm(commentary);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--card)] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold">{tr("cancelBooking")}</h2>
        <div className="space-y-2">
          <label className="text-sm text-gray-500">{tr("cancelCause")}</label>
          <select
            className="input-field w-full"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled />
            {causes.map((cause) => (
              <option key={cause} value={cause}>
                {cause}
              </option>
            ))}
          </select>
        </div>
        {isOther && (
          <textarea
            className="input-field w-full resize-none"
            rows={3}
            placeholder={tr("cancelCausePlaceholder")}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className="button button-secondary" onClick={onClose}>
            {tr("cancelEditing")}
          </button>
          <button
            className="button button-danger"
            disabled={!commentary.trim()}
            onClick={handleConfirm}
          >
            {tr("cancelBooking")}
          </button>
        </div>
      </div>
    </div>
  );
}
