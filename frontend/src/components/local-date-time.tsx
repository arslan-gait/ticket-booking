"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatDateTimeLocal } from "@/lib/datetime";

type LocalDateTimeProps = {
  value: string | number | Date;
};

export default function LocalDateTime({ value }: LocalDateTimeProps) {
  const [formattedValue, setFormattedValue] = useState(() => formatDateTime(value));

  useEffect(() => {
    setFormattedValue(formatDateTimeLocal(value));
  }, [value]);

  return <span suppressHydrationWarning>{formattedValue}</span>;
}
