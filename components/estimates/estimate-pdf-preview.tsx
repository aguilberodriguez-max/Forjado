"use client";

import dynamic from "next/dynamic";
import type { EstimatePdfDocumentProps } from "@/components/estimates/estimate-pdf-document";
import { EstimatePdfDocument } from "@/components/estimates/estimate-pdf-document";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(480px,70vh)] items-center justify-center text-sm text-[#A3A3A3]">
      Loading…
    </div>
  ),
});

export function EstimatePdfPreview(docProps: EstimatePdfDocumentProps) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
      <div className="h-[min(480px,70vh)] w-full [&_iframe]:h-full [&_iframe]:min-h-[480px] [&_iframe]:w-full">
        <PDFViewer
          width="100%"
          height="100%"
          showToolbar={false}
          style={{ width: "100%", height: "100%", minHeight: 480, border: "none" }}
        >
          <EstimatePdfDocument {...docProps} />
        </PDFViewer>
      </div>
    </div>
  );
}
