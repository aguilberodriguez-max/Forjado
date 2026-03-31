"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

import { getCountryOptionsForLocale } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (countryCode: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder: string;
  "aria-invalid"?: boolean;
};

export function CountrySelect({
  value,
  onChange,
  id,
  className,
  disabled,
  placeholder,
  "aria-invalid": ariaInvalid,
}: Props) {
  const locale = useLocale();
  const options = useMemo(() => getCountryOptionsForLocale(locale), [locale]);

  return (
    <select
      id={id}
      disabled={disabled}
      value={value}
      aria-invalid={ariaInvalid}
      className={cn(
        "h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50",
        className,
      )}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
