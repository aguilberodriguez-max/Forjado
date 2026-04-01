import type { LineItem } from "@/types";
import type { MoneyFormat } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";

export type EstimateDocumentPreviewLabels = {
  documentTitle: string;
  footer: string;
  billTo: string;
  lineItemsTitle: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  validUntil: string;
  notes: string;
};

type EstimateDocumentPreviewProps = {
  logoUrl?: string | null;
  businessName: string;
  businessAddressLines: string[];
  estimateNumber: string;
  documentTitle: string;
  clientName: string;
  clientDetailLines: string[];
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  money: MoneyFormat;
  validUntilFormatted: string;
  notes?: string | null;
  labels: EstimateDocumentPreviewLabels;
};

/** Styled HTML preview resembling a professional estimate (customer-facing layout). */
export function EstimateDocumentPreview({
  logoUrl,
  businessName,
  businessAddressLines,
  estimateNumber,
  documentTitle,
  clientName,
  clientDetailLines,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  total,
  money,
  validUntilFormatted,
  notes,
  labels,
}: EstimateDocumentPreviewProps) {
  return (
    <article className="mx-auto max-w-2xl bg-white px-6 py-8 text-neutral-900 shadow-2xl sm:px-10 sm:py-10">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-h-[4rem] items-start gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase / external URLs
            <img
              src={logoUrl}
              alt=""
              className="max-h-20 w-auto max-w-[140px] object-contain object-left"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold leading-tight text-neutral-900">{businessName}</h2>
            {businessAddressLines.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-neutral-600">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#F26522]">
            {documentTitle}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{estimateNumber}</p>
          <p className="mt-3 text-sm text-neutral-600">
            <span className="font-medium text-neutral-800">{labels.validUntil}</span>{" "}
            {validUntilFormatted}
          </p>
        </div>
      </header>

      <section className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {labels.billTo}
          </h3>
          <p className="mt-2 text-base font-semibold text-neutral-900">{clientName}</p>
          {clientDetailLines.map((line, i) => (
            <p key={i} className="text-sm text-neutral-600">
              {line}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {labels.lineItemsTitle}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th className="px-3 py-2.5">{labels.description}</th>
                <th className="w-16 px-2 py-2.5 text-right">{labels.quantity}</th>
                <th className="w-28 px-2 py-2.5 text-right">{labels.unitPrice}</th>
                <th className="w-28 px-3 py-2.5 text-right">{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-3 align-top font-medium text-neutral-900">
                    {item.description}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-neutral-700">
                    {item.quantity}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-neutral-700">
                    {formatCurrency(Number(item.unit_price ?? 0), money)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-neutral-900">
                    {formatCurrency(Number(item.line_total ?? 0), money)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 flex flex-col items-end gap-2 border-t border-neutral-200 pt-6 text-sm">
        <div className="flex w-full max-w-xs justify-between gap-8 text-neutral-600">
          <span>{labels.subtotal}</span>
          <span className="tabular-nums text-neutral-900">{formatCurrency(subtotal, money)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between gap-8 text-neutral-600">
          <span>
            {labels.tax} ({taxRate}%)
          </span>
          <span className="tabular-nums text-neutral-900">{formatCurrency(taxAmount, money)}</span>
        </div>
        <div className="mt-2 flex w-full max-w-xs justify-between gap-8 border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900">
          <span>{labels.total}</span>
          <span className="tabular-nums">{formatCurrency(total, money)}</span>
        </div>
      </section>

      {notes?.trim() ? (
        <section className="mt-8 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {labels.notes}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-neutral-800">{notes.trim()}</p>
        </section>
      ) : null}

      <p className="mt-10 text-center text-[11px] text-neutral-400">{labels.footer}</p>
    </article>
  );
}
