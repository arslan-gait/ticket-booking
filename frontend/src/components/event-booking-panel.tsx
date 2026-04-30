"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, toErrorMessage, type SeatItem } from "@/lib/api";
import SeatPicker from "@/components/seat-picker";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  eventId: number;
  seats: SeatItem[];
  priceTiers: Record<string, number>;
  layoutMeta: Record<string, unknown>;
};

export default function EventBookingPanel({ eventId, seats, priceTiers, layoutMeta }: Props) {
  const router = useRouter();
  const { tr } = useAppSettings();
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const PHONE_DIGITS_LENGTH = 10;
  const PHONE_MASK = "+7 ___ ___ __ __";
  const PHONE_DIGIT_POSITIONS = [3, 4, 5, 7, 8, 9, 11, 12, 14, 15] as const;

  function normalizePhoneInput(rawValue: string): string {
    const onlyDigits = rawValue.replace(/\D/g, "");
    const startsWithFixedCountryPrefix = rawValue.trim().startsWith("+7");
    const withoutCountryCode = startsWithFixedCountryPrefix
      ? onlyDigits.replace(/^7/, "")
      : onlyDigits.length > PHONE_DIGITS_LENGTH && onlyDigits.startsWith("7")
        ? onlyDigits.slice(1)
        : onlyDigits;
    return withoutCountryCode.slice(0, PHONE_DIGITS_LENGTH);
  }

  function formatPhoneMask(digits: string): string {
    const paddedDigits = digits.padEnd(PHONE_DIGITS_LENGTH, "_");
    const p1 = paddedDigits.slice(0, 3);
    const p2 = paddedDigits.slice(3, 6);
    const p3 = paddedDigits.slice(6, 8);
    const p4 = paddedDigits.slice(8, 10);
    return `+7 ${p1} ${p2} ${p3} ${p4}`;
  }

  function setPhoneCaret(index: number) {
    requestAnimationFrame(() => {
      const input = phoneInputRef.current;
      if (!input) return;
      input.setSelectionRange(index, index);
    });
  }

  function caretToDigitIndex(caret: number): number {
    for (let i = 0; i < PHONE_DIGIT_POSITIONS.length; i += 1) {
      if (PHONE_DIGIT_POSITIONS[i] >= caret) return i;
    }
    return PHONE_DIGITS_LENGTH;
  }

  function digitIndexToCaret(digitIndex: number): number {
    if (digitIndex <= 0) return PHONE_DIGIT_POSITIONS[0];
    if (digitIndex >= PHONE_DIGITS_LENGTH) return PHONE_DIGIT_POSITIONS[PHONE_DIGITS_LENGTH - 1] + 1;
    return PHONE_DIGIT_POSITIONS[digitIndex];
  }

  function countDigitsBeforeCaret(rawValue: string, caret: number): number {
    const valueBeforeCaret = rawValue.slice(0, caret);
    const hasFixedCountryPrefix = rawValue.trim().startsWith("+7");
    let digitsBeforeCaret = valueBeforeCaret.replace(/\D/g, "");

    if (hasFixedCountryPrefix && digitsBeforeCaret.startsWith("7")) {
      digitsBeforeCaret = digitsBeforeCaret.slice(1);
    }

    return Math.max(0, Math.min(PHONE_DIGITS_LENGTH, digitsBeforeCaret.length));
  }

  function handlePhoneKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const hasSelection = selectionStart !== selectionEnd;
    let nextDigits = phoneDigits;
    let nextCaret = selectionStart;

    if (hasSelection) {
      const startIndex = caretToDigitIndex(selectionStart);
      const endIndex = caretToDigitIndex(selectionEnd + 1);
      nextDigits = `${phoneDigits.slice(0, startIndex)}${phoneDigits.slice(endIndex)}`;
      nextCaret = PHONE_DIGIT_POSITIONS[Math.min(startIndex, PHONE_DIGITS_LENGTH - 1)] ?? PHONE_DIGIT_POSITIONS[0];
    } else if (event.key === "Backspace") {
      const indexToRemove = caretToDigitIndex(selectionStart) - 1;
      if (indexToRemove < 0 || indexToRemove >= phoneDigits.length) {
        event.preventDefault();
        return;
      }
      nextDigits = `${phoneDigits.slice(0, indexToRemove)}${phoneDigits.slice(indexToRemove + 1)}`;
      nextCaret = PHONE_DIGIT_POSITIONS[indexToRemove] ?? PHONE_DIGIT_POSITIONS[0];
    } else {
      const indexToRemove = caretToDigitIndex(selectionStart);
      if (indexToRemove < 0 || indexToRemove >= phoneDigits.length) {
        event.preventDefault();
        return;
      }
      nextDigits = `${phoneDigits.slice(0, indexToRemove)}${phoneDigits.slice(indexToRemove + 1)}`;
      nextCaret = PHONE_DIGIT_POSITIONS[indexToRemove] ?? PHONE_DIGIT_POSITIONS[0];
    }

    event.preventDefault();
    setError("");
    setPhoneDigits(nextDigits.slice(0, PHONE_DIGITS_LENGTH));
    setPhoneCaret(nextCaret);
  }

  const hasSelectedSeats = selectedSeatIds.length > 0;
  const hasCustomerName = customerName.trim().length > 1;
  const hasPhone = phoneDigits.length > 5;
  const phoneDisplayValue = formatPhoneMask(phoneDigits);
  const phoneForSubmit = `+7 ${phoneDigits}`;
  const canSubmit = useMemo(
    () => hasSelectedSeats && hasCustomerName && hasPhone,
    [hasCustomerName, hasPhone, hasSelectedSeats],
  );

  function toggleSeat(seatId: number) {
    setError("");
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId],
    );
  }

  function clearSelections() {
    setError("");
    setSelectedSeatIds([]);
  }

  async function submit() {
    if (loading) return;
    if (!canSubmit) {
      if (!hasSelectedSeats) {
        setError(tr("selectSeatsRequired"));
      } else if (!hasCustomerName) {
        setError(tr("nameRequired"));
      } else {
        setError(tr("phoneRequired"));
      }
      return;
    }
    setLoading(true);
    setError("");
    try {
      const booking = await createBooking({
        event_id: eventId,
        customer_name: customerName.trim(),
        phone_number: phoneForSubmit,
        seat_ids: selectedSeatIds,
      });
      router.push(`/booking/${booking.public_token}?new=1`);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SeatPicker
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={toggleSeat}
        onClearSelection={clearSelections}
        priceTiers={priceTiers}
        layoutMeta={layoutMeta}
        adminView={false}
      />
      <div className="card space-y-3 p-4">
        <h3 className="font-semibold">{tr("yourDetails")}</h3>
        <input
          className="input-field"
          placeholder={tr("fullName")}
          value={customerName}
          onChange={(e) => {
            setError("");
            setCustomerName(e.target.value);
          }}
        />
        <input
          ref={phoneInputRef}
          className="input-field"
          placeholder={PHONE_MASK}
          value={phoneDisplayValue}
          inputMode="tel"
          onKeyDown={handlePhoneKeyDown}
          onChange={(e) => {
            setError("");
            const nextDigits = normalizePhoneInput(e.target.value);
            const caret = e.target.selectionStart ?? 0;
            const nextDigitIndex = Math.min(countDigitsBeforeCaret(e.target.value, caret), nextDigits.length);
            setPhoneDigits(nextDigits);
            setPhoneCaret(digitIndexToCaret(nextDigitIndex));
          }}
        />
        <button className="button button-primary" disabled={loading} onClick={submit}>
          {loading ? tr("createBooking") : tr("confirmBooking")}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
